import { verifyKey } from 'discord-interactions';

export interface Env {
  DB: D1Database;
  ADMIN_ROLE_ID?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

    // 1. Réponse au PING de Discord
    if (interaction.type === 1) {
      return Response.json({ type: 1 });
    }

    // 2. Gestion des commandes Slash (Type 2)
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

          // Extraction des options de la commande (ex: utilisateur et sous-bock)
          // On s'attend à ce que l'option 1 soit l'utilisateur et l'option 2 soit l'ID du sous-bock
          const targetUserOpt = options?.find((opt: any) => opt.name === 'utilisateur');
          const coasterOpt = options?.find((opt: any) => opt.name === 'sous_bock');

          const targetUserId = targetUserOpt?.value;
          const coasterId = coasterOpt?.value || 'hiver-2027-001'; // Par défaut le sous-bock de test

          if (!targetUserId) {
            return Response.json({
              type: 4,
              data: { content: "❌ Erreur : Tu dois spécifier un utilisateur à qui donner le sous-bock.", flags: 64 }
            });
          }

          try {
            // A. S'assurer que l'utilisateur existe dans la table users (Lazy Initialization)
            await env.DB.prepare(
              `INSERT OR IGNORE INTO users (discord_id) VALUES (?)`
            ).bind(targetUserId).run();

            // B. Ajouter le sous-bock dans son inventaire (ou incrémenter la quantité si déjà possédé)
            await env.DB.prepare(
              `INSERT INTO inventory (user_id, coaster_id, finish, quantity) 
               VALUES (?, ?, 'normal', 1)
               ON CONFLICT(user_id, coaster_id, finish) 
               DO UPDATE SET quantity = quantity + 1`
            ).bind(targetUserId, coasterId).run();

            return Response.json({
              type: 4,
              data: { content: `☕ Succès ! Le sous-bock \`${coasterId}\` a été ajouté à l'inventaire de <@${targetUserId}>.` }
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
