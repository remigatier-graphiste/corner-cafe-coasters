import { verifyKey } from 'discord-interactions';

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

    // 1. PING de Discord (Type 1) : On répond immédiatement SANS vérification 
    // pour valider l'URL sur le portail développeur sans blocage.
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Pour les commandes suivantes, on applique la sécurité
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

    // Gestion des interactions (commandes slash)
    if (interaction.type === 2) {
      return new Response(JSON.stringify({ type: 4, data: { content: 'Commande reçue avec succès ! ☕' } }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ type: 1 }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
