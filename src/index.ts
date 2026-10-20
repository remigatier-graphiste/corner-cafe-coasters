import { verifyKey } from 'discord-interactions';

export interface Env {
  DB: D1Database;
  ADMIN_ROLE_ID?: string;
  PLAYER_ROLE_ID?: string; // ID du rôle "Joueur" / "Collectionneur"
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
    name: 'retirer',
    description: 'Retirer un coaster ou un pack de l inventaire d un utilisateur (Admin)',
    options: [
      {
        name: 'utilisateur',
        description: 'Membre cible',
        type: 6,
        required: true,
      },
      {
        name: 'coaster_id',
        description: 'ID du coaster a retirer',
        type: 3,
        required: false,
      },
      {
        name: 'pack',
        description: 'Type de pack a retirer',
        type: 3,
        required: false,
        choices: [
          { name: 'Sachet', value: 'sachet' },
          { name: 'Grand Sachet', value: 'grand_sachet' },
          { name: 'Boite', value: 'boite' },
          { name: 'Coffret', value: 'coffret' }
        ]
      }
    ],
  },
  {
    name: 'event',
    description: 'Offrir un pack a TOUS les joueurs enregistres (Admin)',
    options: [
      {
        name: 'pack',
        description: 'Type de pack a offrir a tout le monde',
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
  },
  {
    name: 'profil',
    description: 'Afficher ton profil et les statistiques de ta collection',
    options: [],
  },
  {
    name: 'cadeau',
    description: 'Offrir un coaster de ton inventaire a un membre',
    options: [
      {
        name: 'utilisateur',
        description: 'Membre a qui offrir le coaster',
        type: 6,
        required: true,
      },
      {
        name: 'coaster_id',
        description: 'ID du coaster a offrir',
        type: 3,
        required: true,
      }
    ],
  },
  {
    name: 'proposer',
    description: 'Proposer un echange de coaster a la communaute',
    options: [
      {
        name: 'mon_coaster',
        description: 'ID du coaster que tu donnes',
        type: 3,
        required: true,
      },
      {
        name: 'coaster_desire',
        description: 'ID du coaster que tu veux recevoir',
        type: 3,
        required: true,
      }
    ],
  },
  {
    name: 'changer',
    description: 'Recycler 5 copies d un coaster en pack',
    options: [
      {
        name: 'coaster_id',
        description: 'ID du coaster a recycler (il faut 5 exemplaires)',
        type: 3,
        required: true,
      }
    ],
  }
];

// Helper pour associer un émoji représentatif et le nom bien capitalisé de la rareté
function getRarityInfo(rarity?: string): { circle: string, name: string } {
  if (!rarity) return { circle: '❓', name: 'Inconnue' };
  const r = rarity.toLowerCase().trim();
  if (r.includes('carton')) return { circle: '🟤', name: 'Carton' };
  if (r.includes('bois')) return { circle: '🪵', name: 'Bois' };
  if (r.includes('ardoise')) return { circle: '⬛', name: 'Ardoise' };
  if (r.includes('ceramique') || r.includes('céramique')) return { circle: '☕', name: 'Céramique' };
  if (r.includes('metal') || r.includes('métal')) return { circle: '🪙', name: 'Métal' };
  if (r.includes('diamant')) return { circle: '💎', name: 'Diamant' };
  return { circle: '❓', name: rarity.charAt(0).toUpperCase() + rarity.slice(1) };
}

// Helper pour obtenir la date actuelle au format YYYY-MM-DD en heure française (Europe/Paris)
function getFrenchDateString(): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

// Helper pour effectuer un tirage pondéré selon la colonne 'weight'
function getRandomWeightedCoaster(coasters: any[]): any {
  if (!coasters || coasters.length === 0) return null;
  const totalWeight = coasters.reduce((sum, c) => sum + (parseFloat(c.weight) || 1), 0);
  let randomNum = Math.random() * totalWeight;

  for (const coaster of coasters) {
    const weight = parseFloat(coaster.weight) || 1;
    if (randomNum < weight) {
      return coaster;
    }
    randomNum -= weight;
  }
  return coasters[0];
}

// Helper pour enregistrer un nouvel utilisateur et lui attribuer le rôle Discord
async function registerUserAndGiveRole(userId: string, guildId: string, env: Env) {
  const existing = await env.DB.prepare(`SELECT discord_id FROM users WHERE discord_id = ?`).bind(userId).first();
  
  if (!existing) {
    await env.DB.prepare(`INSERT INTO users (discord_id) VALUES (?)`).bind(userId).run();

    const roleId = env.PLAYER_ROLE_ID;
    const token = env.DISCORD_TOKEN;

    if (roleId && token && guildId) {
      try {
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        console.error("Erreur lors de l'attribution du rôle Discord :", e);
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/register-commandes') {
      const CLIENT_ID = "1559598773389500526";
      const GUILD_ID = "408413734894174228";
      const token = env.DISCORD_TOKEN;
      
      if (!token) {
        return new Response("❌ Erreur : DISCORD_TOKEN manquant dans les secrets Cloudflare.", { status: 500 });
      }

      await fetch(`https://discord.com/api/v10/applications/${CLIENT_ID}/commands`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]),
      });

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

    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          discord_id TEXT PRIMARY KEY,
          last_daily TEXT
        )
      `).run();

      await env.DB.prepare(`
        INSERT OR IGNORE INTO sets (id, name) VALUES ('general', 'Général')
      `).run();
    } catch (e) {}

    // GESTION DES CLICS SUR LES BOUTONS (/proposer)
    if (interaction.type === 3) {
      const customId = interaction.data.custom_id;
      const takerId = interaction.member?.user?.id || interaction.user?.id;
      const guildId = interaction.guild_id;

      if (customId.startsWith('accept_trade:')) {
        const parts = customId.split(':');
        const offerUser = parts[1];
        const offerCoasterId = parts[2];
        const wantCoasterId = parts[3];

        if (takerId === offerUser) {
          return Response.json({
