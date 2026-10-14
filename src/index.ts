import { verifyKey } from 'discord-interactions';

export interface Env {
  DB: D1Database;
  ADMIN_ROLE_ID?: string;
  DISCORD_TOKEN?: string;
}

const commands = [
  {
    name: 'donner',
    description: 'Donner un coaster a un utilisateur (Admin)',
    options: [
      {
        name: 'utilisateur',
        description: 'Membre cible',
        type: 6,
        required: true,
      },
      {
        name: 'coaster_id',
        description: 'ID du coaster (ex: hiver-2027-001)',
        type: 3,
        required: false,
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
    description: 'Recuperer ton pack quotidien de coasters',
    options: [],
  },
  {
    name: 'ouvrir',
    description: 'Ouvrir un pack de coasters',
    options: [],
  },
  {
    name: 'inventaire',
    description: 'Afficher ta collection de coasters',
    options: [],
  }
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route magique pour enregistrer les commandes instantanément sur ton serveur
    if (url.pathname === '/register-commandes') {
      const CLIENT_ID = "1559598773389500526";
      const GUILD_ID = "408413734894174228";
      const token = env.DISCORD_TOKEN;
      
      if (!token) {
        return new Response("❌ Erreur : DISCORD_TOKEN manquant dans les secrets Cloudflare.", { status: 500 });
      }

      const discordRes = await fetch(`https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
      });

      if (discordRes.ok) {
        return new Response("✅ Commandes de serveur enregistrées instantanément ! Fais Ctrl+R sur Discord.");
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

    if (interaction.type === 2) {
      const { name, options } = interaction.data;
      const memberRoles = interaction.member?.roles || [];
      const ADMIN_ROLE_ID = env.ADMIN_ROLE_ID || '1559658871252058193';
      const isAdmin = memberRoles.includes(ADMIN_ROLE_ID);

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

          const targetUserId = targetUserOpt?.value;
          const coasterId = coasterOpt?.value || 'hiver-2027-001';

          if (!targetUserId) {
            return Response.json({
              type: 4,
              data: { content: "❌ Erreur : Tu dois spécifier un utilisateur à qui donner le coaster.", flags: 64 }
            });
          }

          try {
            await env.DB.prepare(
              `INSERT OR IGNORE INTO users (discord_id) VALUES (?)`
            ).bind(targetUserId).run();

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

          } catch (err: any) {
            return Response.json({
              type: 4,
              data: { content: `❌ Erreur technique avec la base de données : ${err.message}`, flags: 64 }
            });
          }
        }

        case 'drop': {
          if (!isAdmin) {
            return Response.json({
              type: 4,
              data: { content: "⛔ Tu n'as pas les permissions pour utiliser cette commande.", flags: 64 }
            });
          }
          return Response.json({
            type: 4,
            data: { content: "☕ [Admin] Commande /drop en cours de configuration..." }
          });
        }

        case 'quotidien':
        case 'ouvrir':
        case 'inventaire':
          return Response.json({
            type: 4,
            data: { content: `🎁 Commande /${name} enregistrée, bientôt disponible !` }
          });

        default:
          return Response.json({
            type: 4,
            data: { content: "Commande inconnue 🤖", flags: 64 }
          });
      }
    }

    return Response.json({ type: 1 });
  }
};
