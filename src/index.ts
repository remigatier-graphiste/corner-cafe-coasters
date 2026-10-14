import { verifyKey } from 'discord-interactions';

export interface Env {
  DB: D1Database;
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

    // Utilisation de "await" pour valider correctement la signature cryptographique
    const isValid = signature && timestamp ? await verifyKey(bodyText, signature, timestamp, PUBLIC_KEY) : false;

    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    const interaction = JSON.parse(bodyText);

    // Réponse au test de liaison de Discord (Ping -> Pong)
    if (interaction.type === 1) {
      return Response.json({ type: 1 });
    }

    return Response.json({ type: 1 });
  }
};
