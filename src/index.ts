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

    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const bodyText = await request.text();

    if (!signature || !timestamp || !verifyKey(bodyText, signature, timestamp, env.DISCORD_PUBLIC_KEY)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const interaction = JSON.parse(bodyText);

    if (interaction.type === 1) {
      return Response.json({ type: 1 });
    }

    if (interaction.type === 2) {
      const { name, options } = interaction.data;
      const userId = interaction.member?.user?.id || interaction.user?.id;

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
          return Response.json({ type: 4, data: { content: 'Commande inconnue ☕', flags: 64 } });
      }
    }

    if (interaction.type === 3) {
      const customId = interaction.data.custom_id;
      const userId = interaction.member?.user?.id || interaction.user?.id;

      if (customId.startsWith('open_reveal_')) {
        return handleRevealNext(env, userId, customId);
      }
      if (customId.startsWith('claim_drop_')) {
        return handleClaimDrop(env, userId, customId);
      }
    }

    return new Response('Bad request', { status: 400 });
  },
};

function hasBaristaPermission(interaction: any, env: Env): boolean {
  // Vérifie si l'utilisateur a la permission Admin Discord OU le rôle "Coasters Barista ☕"
  const permissions = BigInt(interaction.member?.permissions || '0');
  const isAdmin = (permissions & 0x8n) === 0x8n;
  
  const userRoles: string[] = interaction.member?.roles || [];
  const hasRole = env.ADMIN_ROLE_ID ? userRoles.includes(env.ADMIN_ROLE_ID) : false;

  return isAdmin || hasRole;
}

async function handleDaily(env: Env, userId: string): Promise<Response> {
  const today = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
  
  let user = await env.DB.prepare(`SELECT last_daily FROM users WHERE discord_id = ?`).bind(userId).first();
  if (user && user.last_daily === today) {
    return Response.json({
      type: 4,
      data: { content: '☕ Tu as déjà récupéré ton petit sachet quotidien aujourd\'hui ! Repasse demain au comptoir.', flags: 64 }
    });
  }

  await env.DB.prepare(`INSERT INTO users (discord_id, last_daily) VALUES (?, ?) ON CONFLICT(discord_id) DO UPDATE SET last_daily = ?`)
    .bind(userId, today, today).run();

  const activeSet = await env.DB.prepare(`SELECT id, name FROM sets WHERE is_open = 1 LIMIT 1`).first();
  const setId = activeSet ? (activeSet.id as string) : 'hiver-2027';

  await env.DB.prepare(`
    INSERT INTO user_packs (user_id, pack_type, set_id, quantity) VALUES (?, 'petit_sachet', ?, 1)
    ON CONFLICT(user_id, pack_type, set_id) DO UPDATE SET quantity = quantity + 1
  `).bind(userId, setId).run();

  return Response.json({
    type: 4,
    data: { content: `🍪 **C'est l'heure de la pause !** Tu as reçu 1 Petit Sachet de dessous de verre (*${setId}*). Utilise \`/ouvrir type: Petit Sachet\` pour l'ouvrir !` }
  });
}

async function handleOpenPack(env: Env, userId: string, packTypeId: string): Promise<Response> {
  const activeSet = await env.DB.prepare(`SELECT id, name FROM sets WHERE is_open = 1 LIMIT 1`).first();
  const setId = activeSet ? (activeSet.id as string) : 'hiver-2027';
  const setName = activeSet ? (activeSet.name as string) : 'Hiver 2027';

  const pack = await env.DB.prepare(`SELECT quantity FROM user_packs WHERE user_id = ? AND pack_type = ? AND set_id = ?`)
    .bind(userId, packTypeId, setId).first();

  if (!pack || (pack.quantity as number) <= 0) {
    return Response.json({
      type: 4,
      data: { content: `❌ Tu n'as plus de **${packTypeId}** en stock pour l'extension **${setName}**. Participe aux events ou utilise \`/quotidien\` !`, flags: 64 }
    });
  }

  await env.DB.prepare(`UPDATE user_packs SET quantity = quantity - 1 WHERE user_id = ? AND pack_type = ? AND set_id = ?`)
    .bind(userId, packTypeId, setId).run();

  const packConfig = PACK_TYPES[packTypeId as keyof typeof PACK_TYPES];
  const coastersInSet = await env.DB.prepare(`SELECT * FROM coasters WHERE set_id = ?`).bind(setId).all();
  
  if (!coastersInSet.results || coastersInSet.results.length === 0) {
    return Response.json({ type: 4, data: { content: '❌ Erreur : Aucun dessous de verre configuré dans cette extension.', flags: 64 } });
  }

  const results = [];
  for (let i = 0; i < packConfig.size; i++) {
    const isGuaranteedSlot = i === packConfig.size - 1 && packConfig.minRarity;
    const chosenRarity = rollRarity(isGuaranteedSlot ? packConfig.minRarity : undefined);

    const pool = coastersInSet.results.filter((c: any) => c.rarity === chosenRarity);
    const targetPool = pool.length > 0 ? pool : coastersInSet.results;
    const drawn = targetPool[Math.floor(Math.random() * targetPool.length)] as any;
    const finish = Math.random() < SHINY_CHANCE ? 'brillant' : 'normal';

    const existing = await env.DB.prepare(`SELECT quantity FROM inventory WHERE user_id = ? AND coaster_id = ? AND finish = ?`)
      .bind(userId, drawn.id, finish).first();

    const isNew = !existing || (existing.quantity as number) === 0;

    await env.DB.prepare(`
      INSERT INTO inventory (user_id, coaster_id, finish, quantity) VALUES (?, ?, ?, 1)
      ON CONFLICT(user_id, coaster_id, finish) DO UPDATE SET quantity = quantity + 1
    `).bind(userId, drawn.id, finish).run();

    results.push({
      coasterId: drawn.id,
      name: drawn.name,
      rarity: drawn.rarity,
      type: drawn.type,
      description: drawn.description,
      finish,
      isNew,
      image: drawn.image
    });
  }

  const openingRes = await env.DB.prepare(`INSERT INTO openings (user_id, pack_type, set_id, results) VALUES (?, ?, ?, ?) RETURNING id`)
    .bind(userId, packTypeId, setId, JSON.stringify(results)).first();
  const openingId = openingRes?.id;

  const firstCard = results[0];
  const rarityInfo = RARITIES[firstCard.rarity as keyof typeof RARITIES];

  return Response.json({
    type: 4,
    data: {
      content: formatCoasterMessage(firstCard, setName, 1, results.length),
      components: results.length > 1 ? [{
        type: 1,
        components: [{
          type: 2,
          style: 1,
          label: `Révéler le suivant (2/${results.length})`,
          custom_id: `open_reveal_${openingId}_1`
        }]
      }] : []
    }
  });
}

async function handleRevealNext(env: Env, userId: string, customId: string): Promise<Response> {
  const parts = customId.split('_');
  const openingId = parts[2];
  const currentIndex = parseInt(parts[3], 10);

  const opening = await env.DB.prepare(`SELECT * FROM openings WHERE id = ? AND user_id = ?`).bind(openingId, userId).first();
  if (!opening) {
    return Response.json({ type: 7, data: { content: '❌ Session d\'ouverture expirée.', components: [] } });
  }

  const activeSet = await env.DB.prepare(`SELECT name FROM sets WHERE id = ?`).bind(opening.set_id).first();
  const setName = activeSet ? (activeSet.name as string) : 'Hiver 2027';

  const results = JSON.parse(opening.results as string);
  const card = results[currentIndex];
  const nextIndex = currentIndex + 1;
  const isFinished = nextIndex >= results.length;

  return Response.json({
    type: 7,
    data: {
      content: formatCoasterMessage(card, setName, nextIndex, results.length),
      components: isFinished ? [] : [{
        type: 1,
        components: [{
          type: 2,
          style: 1,
          label: `Révéler le suivant (${nextIndex + 1}/${results.length})`,
          custom_id: `open_reveal_${openingId}_${nextIndex}`
        }]
      }]
    }
  });
}

function formatCoasterMessage(card: any, setName: string, current: number, total: number): string {
  const rarityInfo = RARITIES[card.rarity as keyof typeof RARITIES];
  const typeStr = card.type ? ` • *${card.type}*` : '';
  const descStr = card.description ? `\n> *"${card.description}"*` : '';
  const shinyStr = card.finish === 'brillant' ? ' ✨ **BRILLANT !**' : '';
  const newStr = card.isNew ? ' 🌟 **NOUVEAU !**' : ' *(Doublon)*';

  return `📦 **Ouverture (${current}/${total})** — Extension : **${setName}**\n` +
         `${rarityInfo.emoji} **${card.name}** [Material: ${rarityInfo.label}]${typeStr}${shinyStr}${newStr}` +
         `${descStr}`;
}

async function handleInventory(env: Env, userId: string): Promise<Response> {
  const stats = await env.DB.prepare(`SELECT COUNT(DISTINCT coaster_id) as count FROM inventory WHERE user_id = ?`).bind(userId).first();
  const totalCards = await env.DB.prepare(`SELECT COUNT(*) as count FROM coasters`).first();

  return Response.json({
    type: 4,
    data: {
      content: `☕ **Ton Album — Corner Cafe**\nTu possèdes **${stats?.count || 0} / ${totalCards?.count || 0}** dessous de verres uniques.\n*(La page web interactive arrive bientôt pour consulter toute ta collection en images !)*`,
      flags: 64
    }
  });
}

async function handleAdminGive(env: Env, interaction: any, options: any): Promise<Response> {
  if (!hasBaristaPermission(interaction, env)) {
    return Response.json({ type: 4, data: { content: '❌ Réservé aux membres ayant le rôle **Coasters Barista ☕**.', flags: 64 } });
  }

  const targetUser = options.find((o: any) => o.name === 'membre').value;
  const packType = options.find((o: any) => o.name === 'type').value;
  const qty = options.find((o: any) => o.name === 'quantite')?.value || 1;

  const activeSet = await env.DB.prepare(`SELECT id FROM sets WHERE is_open = 1 LIMIT 1`).first();
  const setId = activeSet ? (activeSet.id as string) : 'hiver-2027';

  await env.DB.prepare(`
    INSERT INTO user_packs (user_id, pack_type, set_id, quantity) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, pack_type, set_id) DO UPDATE SET quantity = quantity + ?
  `).bind(targetUser, packType, setId, qty, qty).run();

  return Response.json({
    type: 4,
    data: { content: `☕ **Barista** : ${qty}x **${packType}** offerts avec succès à <@${targetUser}> !` }
  });
}

async function handleAdminDrop(env: Env, interaction: any, options: any): Promise<Response> {
  if (!hasBaristaPermission(interaction, env)) {
    return Response.json({ type: 4, data: { content: '❌ Réservé aux membres ayant le rôle **Coasters Barista ☕**.', flags: 64 } });
  }

  const packType = options.find((o: any) => o.name === 'type').value;
  const activeSet = await env.DB.prepare(`SELECT id FROM sets WHERE is_open = 1 LIMIT 1`).first();
  const setId = activeSet ? (activeSet.id as string) : 'hiver-2027';
  const dropId = Math.random().toString(36).substring(2, 9);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await env.DB.prepare(`INSERT INTO drops (id, pack_type, set_id, quantity_each, expires_at, created_by) VALUES (?, ?, ?, 1, ?, ?)`)
    .bind(dropId, packType, setId, expiresAt, interaction.member.user.id).run();

  return Response.json({
    type: 4,
    data: {
      content: `☕ **Un drop de paquets vient d'arriver au Comptoir !**\nClique sur le bouton ci-dessous pour récupérer ton **${packType}** (premier arrivé, premier servi).`,
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 3,
          label: '☕ Récupérer mon paquet',
          custom_id: `claim_drop_${dropId}`
        }]
      }]
    }
  });
}

async function handleClaimDrop(env: Env, userId: string, customId: string): Promise<Response> {
  const dropId = customId.replace('claim_drop_', '');
  const drop = await env.DB.prepare(`SELECT * FROM drops WHERE id = ?`).bind(dropId).first();

  if (!drop) {
    return Response.json({ type: 4, data: { content: '❌ Ce drop n\'existe plus ou a expiré.', flags: 64 } });
  }

  const claimed = await env.DB.prepare(`SELECT 1 FROM drop_claims WHERE drop_id = ? AND user_id = ?`).bind(dropId, userId).first();
  if (claimed) {
    return Response.json({ type: 4, data: { content: '☕ Tu as déjà récupéré ton paquet pour cet événement !', flags: 64 } });
  }

  await env.DB.prepare(`INSERT INTO drop_claims (drop_id, user_id) VALUES (?, ?)`).bind(dropId, userId).run();
  await env.DB.prepare(`
    INSERT INTO user_packs (user_id, pack_type, set_id, quantity) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, pack_type, set_id) DO UPDATE SET quantity = quantity + 1
  `).bind(userId, drop.pack_type, drop.set_id, drop.quantity_each).run();

  return Response.json({
    type: 4,
    data: { content: `🎉 Bravo ! Tu as récupéré ton **${drop.pack_type}** (${drop.set_id}). Utilise \`/ouvrir\` pour le découvrir !`, flags: 64 }
  });
}

function rollRarity(minRarity?: RarityId): RarityId {
  const minIndex = minRarity ? RARITY_ORDER.indexOf(minRarity) : 0;
  const validRarities = RARITY_ORDER.slice(minIndex);

  const totalWeight = validRarities.reduce((sum, id) => sum + RARITIES[id].weight, 0);
  let random = Math.random() * totalWeight;
  for (const id of validRarities) {
    if (random < RARITIES[id].weight) return id;
    random -= RARITIES[id].weight;
  }
  return validRarities[0];
}
