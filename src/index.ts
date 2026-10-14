import { verifyKey } from 'discord-interactions';

export interface Env {
  DB: D1Database;
  ADMIN_ROLE_ID?: string;
  DISCORD_TOKEN?: string;
}

const commands = [
  {
    name: 'donner',
    description: 'Donner un coaster ou un pack a un utilisateur (Admin)',
    options: [
      {
        name: 'utilisateur',
        description: 'Membre cible',
        type: 6,
        required: true,
      },
      {
        name: 'coaster_id',
        description: 'ID d un coaster precis (optionnel)',
        type: 3,
        required: false,
      },
      {
        name: 'pack',
        description: 'Type de pack a donner',
        type: 3,
        required: false,
        choices: [
          { name: 'Sachet (1 coaster)', value: 'sachet' },
          { name: 'Grand Sachet (3 coasters)', value: 'grand_sachet' },
          { name: 'Boite (5 coasters)', value: 'boite' },
          { name: 'Coffret (10 coasters)', value: 'coffret' }
        ]
      }
    ],
  },
  {
    name: 'drop',
    description: 'Lancer un drop de coasters (Admin)',
    options: [],
  },
  {
    name: 'quotidien',
    description: 'Recuperer ton pack Sachet quotidien',
    options: [],
  },
  {
    name: 'ouvrir',
    description: 'Ouvrir un pack de coasters de ton inventaire',
    options: [
      {
        name: 'pack',
        description: 'Type de pack a ouvrir',
        type: 3,
        required: true,
        choices: [
          { name: 'Sachet (1 coaster)', value: 'sachet' },
          { name: 'Grand Sachet (3 coasters)', value: 'grand_sachet' },
          { name: 'Boite (5 coasters)', value: 'boite' },
          { name: 'Coffret (10 coasters)', value: 'coffret' }
        ]
      }
    ],
  },
  {
    name: 'inventaire',
    description: 'Afficher ta collection de coasters et tes packs',
    options: [],
  }
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route d'enregistrement des commandes (avec nettoyage des doublons)
    if (url.pathname === '/register-commandes') {
      const CLIENT_ID = "1559598773389500526";
      const GUILD_ID = "408413734894174228";
      const token = env.DISCORD_TOKEN;
      
      if (!token) {
        return new Response("❌ Erreur : DISCORD_TOKEN manquant dans les secrets Cloudflare.", { status: 500 });
      }

      // 1. On efface les commandes globales pour supprimer les doublons
      await fetch(`https://discord.com/api/v10/applications/${CLIENT_ID}/commands`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]),
      });

      // 2. On enregistre proprement sur ton serveur
      const discordRes = await fetch(`https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
      });

      if (discordRes.ok) {
        return new Response("✅ Doublons nettoyés et commandes enregistrées sur le serveur avec succès !");
      } else {
        const err = await discordRes.text();
        return new Response(`❌ Erreur Discord : ${err}`, { status: 400 });
      }
    }

    if (request.method !== 'POST') {
      return new Response('Corner Cafe Bot is running ☕', { status: 200 });
    }

    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');
    const bodyText = await request.text();

    const PUBLIC_KEY = '079042b35d5bd74036de2b8ef5b0e30015c34e6c313f212de226de7541fd7e76';
    const isValid = signature && timestamp ? await verifyKey(bodyText, signature, timestamp, PUBLIC_KEY) : false;

    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    const interaction = JSON.parse(bodyText);

    if (interaction.type === 1) {
      return Response.json({ type: 1 });
    }

    // S'assurer que la table user_packs existe dans D1
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS user_packs (
          user_id TEXT,
          pack_type TEXT,
          quantity INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, pack_type)
        )
      `).run();
    } catch (e) {}

    if (interaction.type === 2) {
      const { name, options } = interaction.data;
      const memberRoles = interaction.member?.roles || [];
      const ADMIN_ROLE_ID = env.ADMIN_ROLE_ID || '1559658871252058193';
      const isAdmin = memberRoles.includes(ADMIN_ROLE_ID);
      const userId = interaction.member?.user?.id || interaction.user?.id;

      switch (name) {
        case 'donner': {
          if (!isAdmin) {
            return Response.json({
              type: 4,
              data: { content: "⛔ Tu n'as pas les permissions pour utiliser cette commande.", flags: 64 }
            });
          }

          const targetUserOpt = options?.find((opt: any) => opt.name === 'utilisateur');
          const coasterOpt = options?.find((opt: any) => opt.name === 'coaster_id');
          const packOpt = options?.find((opt: any) => opt.name === 'pack');

          const targetUserId = targetUserOpt?.value;
          const coasterId = coasterOpt?.value;
          const packType = packOpt?.value;

          if (!targetUserId) {
            return Response.json({
              type: 4,
              data: { content: "❌ Erreur : Tu dois spécifier un utilisateur cible.", flags: 64 }
            });
          }

          if (!coasterId && !packType) {
            return Response.json({
              type: 4,
              data: { content: "❌ Erreur : Tu dois spécifier soit un coaster, soit un pack à donner.", flags: 64 }
            });
          }

          try {
            await env.DB.prepare(`INSERT OR IGNORE INTO users (discord_id) VALUES (?)`).bind(targetUserId).run();

            if (coasterId) {
              await env.DB.prepare(
                `INSERT INTO inventory (user_id, coaster_id, finish, quantity) 
                 VALUES (?, ?, 'normal', 1)
                 ON CONFLICT(user_id, coaster_id, finish) 
                 DO UPDATE SET quantity = quantity + 1`
              ).bind(targetUserId, coasterId).run();

              return Response.json({
                type: 4,
                data: { content: `☕ Succès ! Le coaster \`${coasterId}\` a été ajouté à l'inventaire de <@${targetUserId}>.` }
              });
            }

            if (packType) {
              await env.DB.prepare(
                `INSERT INTO user_packs (user_id, pack_type, quantity) 
                 VALUES (?, ?, 1)
                 ON CONFLICT(user_id, pack_type) 
                 DO UPDATE SET quantity = quantity + 1`
              ).bind(targetUserId, packType).run
