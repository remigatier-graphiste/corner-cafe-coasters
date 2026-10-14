import { verifyKey } from 'discord-interactions';
import { RARITIES, SHINY_CHANCE, PACK_TYPES, RarityId, RARITY_ORDER } from './config';

export interface Env {
  DB: D1Database;
  DISCORD_PUBLIC_KEY: string;
  ADMIN_ROLE_ID?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Corner Cafe Bot is running ☕', { status: 200 });
    }

    const bodyText = await request.text();
    let interaction;
    try {
      interaction = JSON.parse(bodyText);
    } catch (e) {
      return new Response('Invalid JSON', { status: 400 });
    }

    // 1. Réponse ultra-standard au test Ping de Discord
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Vérification de la signature
    const signature = request.headers.get('X-Signature-Ed25519') || request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp') || request.headers.get('x-signature-timestamp');
    const PUBLIC_KEY = '079042b35d5bd74036de2b8ef5b0e30015c34e6c313f212de226de7541fd7e76';

    let isValid = false;
    try {
      isValid = verifyKey(bodyText, signature || '', timestamp || '', PUBLIC_KEY);
    } catch (e) {
      isValid = false;
    }

    if (!signature || !timestamp || !isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    if (interaction.type === 2) {
      const { name, options } = interaction.data;
      const userId = interaction.member?.user.id || interaction.user?.id;

      switch (name) {
        case 'quotidien':
          return handleDaily(env, userId);
        case 'ouvrir':
          return handleOpenPack(env, userId, options.find((o: any) => o.name === 'type').value);
        case 'inventaire':
          return handleInventory(env, userId);
        case 'donner':
          return handleAdminGive(env, interaction, options);
        case 'drop':
          return handleAdminDrop(env, interaction, options);
        default:
          return new Response(JSON.stringify({ type: 4, data: { content: 'Commande inconnue 🤖', flags: 64 } }), {
            headers: { 'Content-Type': 'application/json' }
          });
      }
    }

    return new Response(JSON.stringify({ type: 1 }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
