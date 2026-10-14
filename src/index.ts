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

      // Vérification si l'utilisateur est admin
      const isAdmin = memberRoles.includes(ADMIN_ROLE_ID);

      switch (name) {
        case 'donner': {
          if (!isAdmin) {
            return Response.json({
              type: 4,
              data: { content: "⛔ Tu n'as pas les permissions pour utiliser cette commande.", flags: 64 }
            });
          }
          return Response.json({
            type: 4,
            data: { content: "☕ [Admin] Commande /donner reçue ! Connexion à la base de données D1 en préparation..." }
          });
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
            data: { content: "☕ [Admin] Commande /drop reçue ! Lancement d'un drop de sous-bocks en préparation..." }
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
