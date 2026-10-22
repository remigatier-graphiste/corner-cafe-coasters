import { verifyKey } from 'discord-interactions';

export interface Env {
  DB: D1Database;
  ADMIN_ROLE_ID?: string;
  PLAYER_ROLE_ID?: string;
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
    name: 'drop',
    description: 'Recuperer ton pack du service (Resets a 02h et 14h)',
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
    description: 'Afficher ton profil, ta streak et les statistiques de ta collection',
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
    description: 'Recycler 5 coasters de meme rarete en pack',
    options: [
      { name: 'coaster_1', description: 'ID du 1er coaster à recycler', type: 3, required: true },
      { name: 'coaster_2', description: 'ID du 2ème coaster à recycler', type: 3, required: true },
      { name: 'coaster_3', description: 'ID du 3ème coaster à recycler', type: 3, required: true },
      { name: 'coaster_4', description: 'ID du 4ème coaster à recycler', type: 3, required: true },
      { name: 'coaster_5', description: 'ID du 5ème coaster à recycler', type: 3, required: true },
    ],
  }
];

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

function getFrenchDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function getCurrentDropSlot(): { slotId: string, currentDateStr: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  }).formatToParts(now);

  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);

  const currentDateStr = `${year}-${month}-${day}`;
  
  let slotName = '02h';
  if (hour >= 14) {
    slotName = '14h';
  } else if (hour < 2) {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yStr = getFrenchDateString(yesterday);
    return { slotId: `${yStr}-14h`, currentDateStr };
  }

  return { slotId: `${currentDateStr}-${slotName}`, currentDateStr };
}

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

async function registerUserAndGiveRole(userId: string, guildId: string, env: Env) {
  const existing = await env.DB.prepare(`SELECT discord_id FROM users WHERE discord_id = ?`).bind(userId).first();
  
  if (!existing) {
    await env.DB.prepare(`INSERT INTO users (discord_id, streak_count) VALUES (?, 0)`).bind(userId).run();

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
        console.error("Erreur attribution rôle :", e);
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
        return new Response("❌ Erreur : DISCORD_TOKEN manquant.", { status: 500 });
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
        return new Response("✅ Commandes enregistrées avec succès !");
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
          last_daily TEXT,
          last_drop_date TEXT,
          streak_count INTEGER DEFAULT 0
        )
      `).run();

      await env.DB.prepare(`
        INSERT OR IGNORE INTO sets (id, name) VALUES ('origins', 'Origins')
      `).run();
    } catch (e) {}

    // INTERACTION BOUTON
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
            type: 4,
            data: { content: "⛔ Tu ne peux pas accepter ton propre échange !", flags: 64 }
          });
        }

        try {
          await registerUserAndGiveRole(takerId, guildId, env);

          const offerUserItem = await env.DB.prepare(
            `SELECT quantity FROM inventory WHERE user_id = ? AND coaster_id = ? AND quantity > 0`
          ).bind(offerUser, offerCoasterId).first() as any;

          const takerItem = await env.DB.prepare(
            `SELECT quantity FROM inventory WHERE user_id = ? AND coaster_id = ? AND quantity > 0`
          ).bind(takerId, wantCoasterId).first() as any;

          if (!offerUserItem || offerUserItem.quantity < 1) {
            return Response.json({
              type: 4,
              data: { content: `❌ L'échange a échoué : l'auteur ne possède plus le coaster \`${offerCoasterId}\`.`, flags: 64 }
            });
          }

          if (!takerItem || takerItem.quantity < 1) {
            return Response.json({
              type: 4,
              data: { content: `❌ Tu ne possèdes pas le coaster demandé (\`${wantCoasterId}\`) !`, flags: 64 }
            });
          }

          await env.DB.batch([
            env.DB.prepare(`UPDATE inventory SET quantity = quantity - 1 WHERE user_id = ? AND coaster_id = ? AND finish = 'normal'`).bind(offerUser, offerCoasterId),
            env.DB.prepare(`INSERT INTO inventory (user_id, coaster_id, finish, quantity) VALUES (?, ?, 'normal', 1) ON CONFLICT(user_id, coaster_id, finish) DO UPDATE SET quantity = quantity + 1`).bind(offerUser, wantCoasterId),
            env.DB.prepare(`UPDATE inventory SET quantity = quantity - 1 WHERE user_id = ? AND coaster_id = ? AND finish = 'normal'`).bind(takerId, wantCoasterId),
            env.DB.prepare(`INSERT INTO inventory (user_id, coaster_id, finish, quantity) VALUES (?, ?, 'normal', 1) ON CONFLICT(user_id, coaster_id, finish) DO UPDATE SET quantity = quantity + 1`).bind(takerId, offerCoasterId)
          ]);

          return Response.json({
            type: 4,
            data: { 
              content: `🤝 **Échange réussi !** <@${takerId}> a accepté l'offre de <@${offerUser}>.\n\n` +
                       `• <@${offerUser}> reçoit \`${wantCoasterId}\`\n` +
                       `• <@${takerId}> reçoit \`${offerCoasterId}\``
            }
          });

        } catch (err: any) {
          return Response.json({
            type: 4,
            data: { content: `❌ Erreur d'échange : ${err.message}`, flags: 64 }
          });
        }
      }
    }

    // COMMANDES SLASH
    if (interaction.type === 2) {
      const { name, options } = interaction.data;
      const memberRoles = interaction.member?.roles || [];
      const ADMIN_ROLE_ID = env.ADMIN_ROLE_ID || '1559658871252058193';
      const isAdmin = memberRoles.includes(ADMIN_ROLE_ID);
      const userId = interaction.member?.user?.id || interaction.user?.id;
      const guildId = interaction.guild_id;

      switch (name) {
        case 'donner': {
          if (!isAdmin) return Response.json({ type: 4, data: { content: "⛔ Permissions insuffisantes.", flags: 64 } });

          const targetUserId = options?.find((opt: any) => opt.name === 'utilisateur')?.value;
          const coasterId = options?.find((opt: any) => opt.name === 'coaster_id')?.value;
          const packType = options?.find((opt: any) => opt.name === 'pack')?.value;

          try {
            await registerUserAndGiveRole(targetUserId, guildId, env);

            if (coasterId) {
              await env.DB.prepare(
                `INSERT INTO inventory (user_id, coaster_id, finish, quantity) VALUES (?, ?, 'normal', 1)
                 ON CONFLICT(user_id, coaster_id, finish) DO UPDATE SET quantity = quantity + 1`
              ).bind(targetUserId, coasterId).run();

              return Response.json({ type: 4, data: { content: `☕ Le coaster \`${coasterId}\` a été donné à <@${targetUserId}>.` } });
            }

            if (packType) {
              await env.DB.prepare(
                `INSERT INTO user_packs (user_id, pack_type, quantity, set_id) VALUES (?, ?, 1, 'origins')
                 ON CONFLICT(user_id, pack_type, set_id) DO UPDATE SET quantity = quantity + 1`
              ).bind(targetUserId, packType).run();

              return Response.json({ type: 4, data: { content: `🎁 Un pack **${packType}** a été offert à <@${targetUserId}>.` } });
            }

          } catch (err: any) {
            return Response.json({ type: 4, data: { content: `❌ Erreur : ${err.message}`, flags: 64 } });
          }
          break;
        }

        case 'retirer': {
          if (!isAdmin) return Response.json({ type: 4, data: { content: "⛔ Permissions insuffisantes.", flags: 64 } });

          const targetUserId = options?.find((opt: any) => opt.name === 'utilisateur')?.value;
          const coasterId = options?.find((opt: any) => opt.name === 'coaster_id')?.value;
          const packType = options?.find((opt: any) => opt.name === 'pack')?.value;

          try {
            if (coasterId) {
              await env.DB.prepare(`UPDATE inventory SET quantity = MAX(0, quantity - 1) WHERE user_id = ? AND coaster_id = ?`).bind(targetUserId, coasterId).run();
              return Response.json({ type: 4, data: { content: `🧹 Un exemplaire de \`${coasterId}\` retiré à <@${targetUserId}>.` } });
            }

            if (packType) {
              await env.DB.prepare(`UPDATE user_packs SET quantity = MAX(0, quantity - 1) WHERE user_id = ? AND pack_type = ? AND set_id = 'origins'`).bind(targetUserId, packType).run();
              return Response.json({ type: 4, data: { content: `🧹 Un pack \`${packType}\` retiré à <@${targetUserId}>.` } });
            }

          } catch (err: any) {
            return Response.json({ type: 4, data: { content: `❌ Erreur : ${err.message}`, flags: 64 } });
          }
          break;
        }

        case 'event': {
          if (!isAdmin) return Response.json({ type: 4, data: { content: "⛔ Permissions insuffisantes.", flags: 64 } });

          const packType = options?.find((opt: any) => opt.name === 'pack')?.value;

          try {
            const { results: allUsers } = await env.DB.prepare(`SELECT discord_id FROM users`).all();
            if (!allUsers || allUsers.length === 0) {
              return Response.json({ type: 4, data: { content: "❌ Aucun utilisateur enregistré.", flags: 64 } });
            }

            const statements: D1PreparedStatement[] = allUsers.map((u: any) =>
              env.DB.prepare(
                `INSERT INTO user_packs (user_id, pack_type, quantity, set_id) VALUES (?, ?, 1, 'origins')
                 ON CONFLICT(user_id, pack_type, set_id) DO UPDATE SET quantity = quantity + 1`
              ).bind(u.discord_id, packType)
            );

            await env.DB.batch(statements);

            return Response.json({
              type: 4,
              data: { content: `🎉 **ÉVÉNEMENT DU CORNER CAFE !** Un pack **${packType}** a été offert à **${allUsers.length}** joueurs ! 🎁` }
            });

          } catch (err: any) {
            return Response.json({ type: 4, data: { content: `❌ Erreur : ${err.message}`, flags: 64 } });
          }
        }

        case 'drop': {
          try {
            await registerUserAndGiveRole(userId, guildId, env);

            const { slotId, currentDateStr } = getCurrentDropSlot();

            const userRecord = await env.DB.prepare(
              `SELECT last_daily, last_drop_date, streak_count FROM users WHERE discord_id = ?`
            ).bind(userId).first() as any;

            if (userRecord?.last_daily === slotId) {
              return Response.json({
                type: 4,
                data: { content: `⏳ Tu as déjà récupéré ton pack pour ce créneau ! Prochain réapprovisionnement à **14h00** ou **02h00** ☕` }
              });
            }

            let streak = userRecord?.streak_count || 0;
            const lastDate = userRecord?.last_drop_date;

            if (!lastDate) {
              streak = 1;
            } else if (lastDate === currentDateStr) {
              streak = Math.max(1, streak);
            } else {
              const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
              const yesterdayStr = getFrenchDateString(yesterday);

              if (lastDate === yesterdayStr) {
                streak += 1;
              } else {
                streak = 1;
              }
            }

            let rewardedPack = 'sachet';
            let bonusMsg = '';

            if (streak === 14) {
              rewardedPack = 'boite';
              bonusMsg = ` 🔥 **STREAK EXCEPTIONNELLE DE 14 JOURS !** Tu débloques une **Boîte** (5 coasters) !`;
            } else if (streak === 7) {
              rewardedPack = 'grand_sachet';
              bonusMsg = ` 🔥 **STREAK DE 7 JOURS !** Tu débloques un **Grand Sachet** (3 coasters) !`;
            }

            await env.DB.prepare(
              `UPDATE users SET last_daily = ?, last_drop_date = ?, streak_count = ? WHERE discord_id = ?`
            ).bind(slotId, currentDateStr, streak, userId).run();

            await env.DB.prepare(
              `INSERT INTO user_packs (user_id, pack_type, quantity, set_id) VALUES (?, ?, 1, 'origins')
               ON CONFLICT(user_id, pack_type, set_id) DO UPDATE SET quantity = quantity + 1`
            ).bind(userId, rewardedPack).run();

            const packNames: Record<string, string> = {
              'sachet': 'Sachet (1 coaster)',
              'grand_sachet': 'Grand Sachet (3 coasters)',
              'boite': 'Boîte (5 coasters)'
            };

            return Response.json({
              type: 4,
              data: {
                content: `📦 **Nouveau Drop récupéré !** Tu as reçu 1x **${packNames[rewardedPack]}** !` +
                         `\n🔥 **Série actuelle :** **${streak} jour(s)** d'affilée !${bonusMsg}\n` +
                         `_Utilise \`/ouvrir\` pour découvrir ce qu'il contient !_`
              }
            });

          } catch (err: any) {
            return Response.json({ type: 4, data: { content: `❌ Erreur drop : ${err.message}`, flags: 64 } });
          }
        }

        case 'ouvrir': {
          const packType = options?.find((opt: any) => opt.name === 'pack')?.value;

          ctx.waitUntil((async () => {
            try {
              const packRecord = await env.DB.prepare(
                `SELECT quantity FROM user_packs WHERE user_id = ? AND pack_type = ? AND set_id = 'origins'`
              ).bind(userId, packType).first() as any;

              if (!packRecord || packRecord.quantity <= 0) {
                await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: `❌ Tu ne possèdes aucun pack \`${packType}\`. Fais un \`/drop\` !` })
                });
                return;
              }

              const packSizes: Record<string, number> = {
                'sachet': 1, 'grand_sachet': 3, 'boite': 5, 'coffret': 10
              };
              const count = packSizes[packType] || 1;

              const { results: allCoasters } = await env.DB.prepare(`SELECT * FROM coasters WHERE set_id = 'origins'`).all();
              if (!allCoasters || allCoasters.length === 0) {
                await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: "❌ Aucun coaster trouvé pour le set Origins." })
                });
                return;
              }

              await registerUserAndGiveRole(userId, guildId, env);

              const slateOrBetter = allCoasters.filter((c: any) => {
                const r = (c.rarity || '').toLowerCase();
                return r.includes('ardoise') || r.includes('ceramique') || r.includes('céramique') || r.includes('metal') || r.includes('métal') || r.includes('diamant');
              });

              const ceramicOrBetter = allCoasters.filter((c: any) => {
                const r = (c.rarity || '').toLowerCase();
                return r.includes('ceramique') || r.includes('céramique') || r.includes('metal') || r.includes('métal') || r.includes('diamant');
              });

              const pulledCoasters: any[] = [];
              const dbStatements: D1PreparedStatement[] = [
                env.DB.prepare(`UPDATE user_packs SET quantity = quantity - 1 WHERE user_id = ? AND pack_type = ? AND set_id = 'origins'`).bind(userId, packType)
              ];

              for (let i = 0; i < count; i++) {
                let coaster: any;

                if (packType === 'boite' && i === count - 1 && slateOrBetter.length > 0) {
                  coaster = getRandomWeightedCoaster(slateOrBetter);
                } else if (packType === 'coffret' && i === count - 1 && ceramicOrBetter.length > 0) {
                  coaster = getRandomWeightedCoaster(ceramicOrBetter);
                } else {
                  coaster = getRandomWeightedCoaster(allCoasters);
                }

                pulledCoasters.push(coaster);

                dbStatements.push(
                  env.DB.prepare(`
                    INSERT INTO inventory (user_id, coaster_id, finish, quantity) 
                    VALUES (?, ?, 'normal', 1) 
                    ON CONFLICT(user_id, coaster_id, finish) 
                    DO UPDATE SET quantity = quantity + 1
                  `).bind(userId, coaster.id)
                );
              }

              await env.DB.batch(dbStatements);

              const packNames: Record<string, string> = {
                'sachet': 'Sachet', 'grand_sachet': 'Grand Sachet', 'boite': 'Boîte', 'coffret': 'Coffret'
              };

              const itemsList = pulledCoasters.map(c => {
                const { circle, name } = getRarityInfo(c.rarity);
                return `${circle} **[${name}]** **${c.name || c.id}** (\`${c.id}\`)`;
              }).join('\n');

              const embed: any = {
                title: `🎁 Ouverture d'un ${packNames[packType] || packType} (Origins) !`,
                description: `Tu as obtenu :\n\n${itemsList}`,
                color: 14897974
              };

              if (pulledCoasters.length > 0 && pulledCoasters[0].image) {
                embed.image = { url: `https://raw.githubusercontent.com/remigatier-graphiste/corner-cafe-coasters/main/public/coasters/origins/${pulledCoasters[0].image}` };
              }

              await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: '', embeds: [embed] })
              });

            } catch (err: any) {
              await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `❌ Erreur ouverture : ${err.message}` })
              });
            }
          })());

          return Response.json({ type: 5 });
        }

        case 'inventaire': {
          try {
            await registerUserAndGiveRole(userId, guildId, env);

            const { results: coasters } = await env.DB.prepare(
              `SELECT i.coaster_id, i.finish, i.quantity, c.name, c.rarity 
               FROM inventory i 
               LEFT JOIN coasters c ON i.coaster_id = c.id 
               WHERE i.user_id = ? AND i.quantity > 0`
            ).bind(userId).all();

            const { results: packs } = await env.DB.prepare(
              `SELECT pack_type, quantity, set_id FROM user_packs WHERE user_id = ? AND quantity > 0`
            ).bind(userId).all();

            const packNames: Record<string, string> = {
              'sachet': 'Sachet', 'grand_sachet': 'Grand Sachet', 'boite': 'Boîte', 'coffret': 'Coffret'
            };

            let description = "**☕ Ton Inventaire & Collection :**\n\n";

            description += "**📦 Packs non ouverts :**\n";
            if (!packs || packs.length === 0) {
              description += "_Aucun pack disponible (tape `/drop`)_\n";
            } else {
              for (const p of packs as any[]) {
                description += `- **${packNames[p.pack_type] || p.pack_type}** (${p.set_id}) : **x${p.quantity}**\n`;
              }
            }

            description += "\n**🥏 Coasters possédés :**\n";
            if (!coasters || coasters.length === 0) {
              description += "_Ton inventaire de coasters est vide._\n";
            } else {
              for (const row of coasters as any[]) {
                const coasterName = row.name || row.coaster_id;
                const { circle, name } = getRarityInfo(row.rarity);
                description += `- ${circle} **[${name}]** **${coasterName}** (\`ID: ${row.coaster_id}\`) : **x${row.quantity}**\n`;
              }
            }

            return Response.json({ type: 4, data: { content: description } });

          } catch (err: any) {
            return Response.json({ type: 4, data: { content: `❌ Erreur inventaire : ${err.message}`, flags: 64 } });
          }
        }

        case 'profil': {
          try {
            await registerUserAndGiveRole(userId, guildId, env);

            const { results: coasters } = await env.DB.prepare(
              `SELECT i.coaster_id, i.quantity, c.rarity 
               FROM inventory i 
               LEFT JOIN coasters c ON i.coaster_id = c.id 
               WHERE i.user_id = ? AND i.quantity > 0`
            ).bind(userId).all();

            const userRecord = await env.DB.prepare(`SELECT streak_count FROM users WHERE discord_id = ?`).bind(userId).first() as any;

            const totalExistingRes = await env.DB.prepare(`SELECT COUNT(*) as total FROM coasters WHERE set_id = 'origins'`).first() as any;
            const totalExisting = totalExistingRes?.total || 75;

            let totalCards = 0;
            let uniqueCards = coasters.length;
            const rarityCounts: Record<string, number> = {
              'Carton': 0, 'Bois': 0, 'Ardoise': 0, 'Céramique': 0, 'Métal': 0, 'Diamant': 0
            };

            for (const row of coasters as any[]) {
              const qty = row.quantity || 0;
              totalCards += qty;

              const { name: rarityName } = getRarityInfo(row.rarity);
              if (rarityCounts[rarityName] !== undefined) {
                rarityCounts[rarityName] += qty;
              }
            }

            const completionPercent = totalExisting > 0 ? Math.round((uniqueCards / totalExisting) * 100) : 0;
            const userObj = interaction.member?.user || interaction.user;
            const userName = userObj?.username || "Barista";

            const profileDesc = [
              `🔥 **Série en cours :** **${userRecord?.streak_count || 0} jour(s)** consécutifs`,
              ``,
              `📊 **Complétion (Origins) :** **${uniqueCards} / ${totalExisting}** uniques (${completionPercent}%)`,
              `📦 **Total de cartes :** **${totalCards}** (avec doublons)`,
              ``,
              `**Détail par rareté :**`,
              `🟤 **Carton** : ${rarityCounts['Carton'] || 0}`,
              `🪵 **Bois** : ${rarityCounts['Bois'] || 0}`,
              `⬛ **Ardoise** : ${rarityCounts['Ardoise'] || 0}`,
              `☕ **Céramique** : ${rarityCounts['Céramique'] || 0}`,
              `🪙 **Métal** : ${rarityCounts['Métal'] || 0}`,
              `💎 **Diamant** : ${rarityCounts['Diamant'] || 0}`
            ].join('\n');

            const embed: any = {
              title: `☕ Profil de ${userName}`,
              description: profileDesc,
              color: 14897974
            };

            return Response.json({ type: 4, data: { embeds: [embed] } });

          } catch (err: any) {
            return Response.json({ type: 4, data: { content: `❌ Erreur profil : ${err.message}`, flags: 64 } });
          }
        }

        case 'cadeau': {
          const targetUserId = options?.find((opt: any) => opt.name === 'utilisateur')?.value;
          const coasterId = options?.find((opt: any) => opt.name === 'coaster_id')?.value;

          try {
            await registerUserAndGiveRole(userId, guildId, env);
            await registerUserAndGiveRole(targetUserId, guildId, env);

            if (userId === targetUserId) {
              return Response.json({
                type: 4,
                data: { content: "⛔ Tu ne peux pas t'offrir un cadeau à toi-même !", flags: 64 }
              });
            }

            const userItem = await env.DB.prepare(
              `SELECT i.quantity, c.name, c.rarity FROM inventory i LEFT JOIN coasters c ON i.coaster_id = c.id WHERE i.user_id = ? AND i.coaster_id = ? AND i.quantity > 0`
            ).bind(userId, coasterId).first() as any;

            if (!userItem || userItem.quantity < 1) {
              return Response.json({
                type: 4,
                data: { content: `❌ Tu ne possèdes pas le coaster \`${coasterId}\` !`, flags: 64 }
              });
            }

            await env.DB.batch([
              env.DB.prepare(`UPDATE inventory SET quantity = quantity - 1 WHERE user_id = ? AND coaster_id = ? AND finish = 'normal'`).bind(userId, coasterId),
              env.DB.prepare(`INSERT INTO inventory (user_id, coaster_id, finish, quantity) VALUES (?, ?, 'normal', 1) ON CONFLICT(user_id, coaster_id, finish) DO UPDATE SET quantity = quantity + 1`).bind(targetUserId, coasterId)
            ]);

            const { circle, name: rarityName } = getRarityInfo(userItem.rarity);
            const coasterName = userItem.name || coasterId;

            return Response.json({
              type: 4,
              data: {
                content: `🎁 **Cadeau envoyé !** <@${userId}> a offert le coaster ${circle} **[${rarityName}]** **${coasterName}** (\`${coasterId}\`) à <@${targetUserId}> ! 🎉`
              }
            });

          } catch (err: any) {
            return Response.json({
              type: 4,
              data: { content: `❌ Erreur cadeau : ${err.message}`, flags: 64 }
            });
          }
        }

        case 'proposer': {
          const myCoasterId = options?.find((opt: any) => opt.name === 'mon_coaster')?.value;
          const wantCoasterId = options?.find((opt: any) => opt.name === 'coaster_desire')?.value;

          try {
            await registerUserAndGiveRole(userId, guildId, env);

            const myItem = await env.DB.prepare(
              `SELECT i.quantity, c.name, c.rarity FROM inventory i LEFT JOIN coasters c ON i.coaster_id = c.id WHERE i.user_id = ? AND i.coaster_id = ? AND i.quantity > 0`
            ).bind(userId, myCoasterId).first() as any;

            if (!myItem || myItem.quantity < 1) {
              return Response.json({
                type: 4,
                data: { content: `❌ Tu ne possèdes pas le coaster \`${myCoasterId}\` !`, flags: 64 }
              });
            }

            const wantItem = await env.DB.prepare(
              `SELECT name, rarity FROM coasters WHERE id = ?`
            ).bind(wantCoasterId).first() as any;

            const myRarity = getRarityInfo(myItem.rarity);
            const wantRarity = getRarityInfo(wantItem?.rarity);

            const offerName = myItem.name || myCoasterId;
            const wantName = wantItem?.name || wantCoasterId;

            return Response.json({
              type: 4,
              data: {
                content: `🔄 **Proposition d'Échange Public** par <@${userId}> !\n\n` +
                         `• **Donne :** ${myRarity.circle} **[${myRarity.name}]** **${offerName}** (\`${myCoasterId}\`)\n` +
                         `• **Demande :** ${wantRarity.circle} **[${wantRarity.name}]** **${wantName}** (\`${wantCoasterId}\`)\n\n` +
                         `_Si tu possèdes \`${wantCoasterId}\`, clique sur le bouton ci-dessous pour effectuer l'échange immédiatement !_`,
                components: [
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        style: 3,
                        label: 'Accepter l\'échange 🤝',
                        custom_id: `accept_trade:${userId}:${myCoasterId}:${wantCoasterId}`
                      }
                    ]
                  }
                ]
              }
            });

          } catch (err: any) {
            return Response.json({
              type: 4,
              data: { content: `❌ Erreur création échange : ${err.message}`, flags: 64 }
            });
          }
        }

        case 'changer': {
          const ids = [
            options?.find((o: any) => o.name === 'coaster_1')?.value,
            options?.find((o: any) => o.name === 'coaster_2')?.value,
            options?.find((o: any) => o.name === 'coaster_3')?.value,
            options?.find((o: any) => o.name === 'coaster_4')?.value,
            options?.find((o: any) => o.name === 'coaster_5')?.value,
          ].filter(Boolean);

          try {
            await registerUserAndGiveRole(userId, guildId, env);

            if (ids.length !== 5) {
              return Response.json({ type: 4, data: { content: "❌ Tu dois spécifier exactement 5 coasters !", flags: 64 } });
            }

            const requestedCounts: Record<string, number> = {};
            for (const id of ids) {
              requestedCounts[id] = (requestedCounts[id] || 0) + 1;
            }

            const coastersInfo: any[] = [];
            for (const [id, countNeeded] of Object.entries(requestedCounts)) {
              const item = await env.DB.prepare(
                `SELECT i.quantity, c.name, c.rarity FROM inventory i LEFT JOIN coasters c ON i.coaster_id = c.id WHERE i.user_id = ? AND i.coaster_id = ?`
              ).bind(userId, id).first() as any;

              if (!item || item.quantity <= countNeeded) {
                const owned = item?.quantity || 0;
                return Response.json({
                  type: 4,
                  data: {
                    content: `⛔ **Recyclage refusé (Protection Doublon) :** Tu essaies de recycler ${countNeeded}x \`${id}\`, mais tu n'en possèdes que ${owned}. Il faut en garder **au moins 1 exemplaire** dans ta collection !`,
                    flags: 64
                  }
                });
              }

              coastersInfo.push({ id, countNeeded, rarity: item.rarity, name: item.name });
            }

            const firstCoasterRarity = (coastersInfo[0].rarity || '').toLowerCase().trim();
            for (const c of coastersInfo) {
              const r = (c.rarity || '').toLowerCase().trim();
              if (r !== firstCoasterRarity) {
                return Response.json({
                  type: 4,
                  data: { content: "❌ Tous les 5 coasters doivent appartenir à la **même rareté** !", flags: 64 }
                });
              }
            }

            if (firstCoasterRarity.includes('diamant')) {
              return Response.json({ type: 4, data: { content: "⛔ Les cartes Diamant sont trop précieuses pour être recyclées !", flags: 64 } });
            }

            let rewardedPack = 'sachet';
            let packName = 'Sachet (1 coaster)';

            if (firstCoasterRarity.includes('bois')) {
              rewardedPack = 'grand_sachet';
              packName = 'Grand Sachet (3 coasters)';
            } else if (firstCoasterRarity.includes('ardoise')) {
              rewardedPack = 'boite';
              packName = 'Boîte (5 coasters)';
            } else if (firstCoasterRarity.includes('ceramique') || firstCoasterRarity.includes('céramique') || firstCoasterRarity.includes('metal') || firstCoasterRarity.includes('métal')) {
              rewardedPack = 'coffret';
              packName = 'Coffret (10 coasters)';
            }

            const statements: D1PreparedStatement[] = [];
            for (const [id, count] of Object.entries(requestedCounts)) {
              statements.push(
                env.DB.prepare(`UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND coaster_id = ?`).bind(count, userId, id)
              );
            }

            statements.push(
              env.DB.prepare(
                `INSERT INTO user_packs (user_id, pack_type, quantity, set_id) VALUES (?, ?, 1, 'origins')
                 ON CONFLICT(user_id, pack_type, set_id) DO UPDATE SET quantity = quantity + 1`
              ).bind(userId, rewardedPack)
            );

            await env.DB.batch(statements);

            const { circle } = getRarityInfo(coastersInfo[0].rarity);

            return Response.json({
              type: 4,
              data: {
                content: `♻️ **Recyclage réussi !** Tu as recyclé 5x coasters ${circle} contre 1x **${packName}** (Origins) ! 🎉`
              }
            });

          } catch (err: any) {
            return Response.json({ type: 4, data: { content: `❌ Erreur recyclage : ${err.message}`, flags: 64 } });
          }
        }

        default:
          return Response.json({ type: 4, data: { content: "Commande inconnue 🤖", flags: 64 } });
      }
    }

    return Response.json({ type: 1 });
  }
};
