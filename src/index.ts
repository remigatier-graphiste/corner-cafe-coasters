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
  },
  {
    name: 'profil',
    description: 'Afficher ton profil et les statistiques de ta collection',
    options: [],
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

// Helper pour effectuer un tirage pondéré selon la colonne 'weight' (supporte les décimaux)
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
          Authorization: `Bot ${token}`, 'Content-Type': 'application/json', }, body: JSON.stringify([]), });  const discordRes = await fetch(`https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`, { method: 'PUT', headers: { Authorization: `Bot ${token}`,
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
          const offerUserItem = await env.DB.prepare(
            `SELECT quantity FROM inventory WHERE user_id = ? AND coaster_id = ? AND quantity > 0`
          ).bind(offerUser, offerCoasterId).first() as any;

          const takerItem = await env.DB.prepare(
            `SELECT quantity FROM inventory WHERE user_id = ? AND coaster_id = ? AND quantity > 0`
          ).bind(takerId, wantCoasterId).first() as any;

          if (!offerUserItem || offerUserItem.quantity < 1) {
            return Response.json({
              type: 4,
              data: { content: `❌ L'échange a échoué : l'auteur de la proposition ne possède plus le coaster \`${offerCoasterId}\`.`, flags: 64 }
            });
          }

          if (!takerItem || takerItem.quantity < 1) {
            return Response.json({
              type: 4,
              data: { content: `❌ Tu ne possèdes pas le coaster demandé (\`${wantCoasterId}\`) pour accepter cet échange !`, flags: 64 }
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
            data: { content: `❌ Erreur lors du traitement de l'échange : ${err.message}`, flags: 64 }
          });
        }
      }
    }

    // GESTION DES COMMANDES SLASH
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
              const existing = await env.DB.prepare(
                `SELECT quantity FROM inventory WHERE user_id = ? AND coaster_id = ? AND finish = 'normal'`
              ).bind(targetUserId, coasterId).first() as any;

              if (existing) {
                await env.DB.prepare(
                  `UPDATE inventory SET quantity = quantity + 1 WHERE user_id = ? AND coaster_id = ? AND finish = 'normal'`
                ).bind(targetUserId, coasterId).run();
              } else {
                await env.DB.prepare(
                  `INSERT INTO inventory (user_id, coaster_id, finish, quantity) VALUES (?, ?, 'normal', 1)`
                ).bind(targetUserId, coasterId).run();
              }

              return Response.json({
                type: 4,
                data: { content: `☕ Succès ! Le coaster \`${coasterId}\` a été ajouté à l'inventaire de <@${targetUserId}>.` }
              });
            }

            if (packType) {
              const updateRes = await env.DB.prepare(
                `UPDATE user_packs SET quantity = quantity + 1 WHERE user_id = ? AND pack_type = ? AND set_id = 'general'`
              ).bind(targetUserId, packType).run();

              if (!updateRes.meta.changes || updateRes.meta.changes === 0) {
                await env.DB.prepare(
                  `INSERT INTO user_packs (user_id, pack_type, quantity, set_id) VALUES (?, ?, 1, 'general')`
                ).bind(targetUserId, packType).run();
              }

              const packNames: Record<string, string> = {
                'sachet': 'Sachet (1 coaster)',
                'grand_sachet': 'Grand Sachet (3 coasters)',
                'boite': 'Boîte (5 coasters)',
                'coffret': 'Coffret (10 coasters)'
              };

              return Response.json({
                type: 4,
                data: { content: `🎁 Succès ! Un pack **${packNames[packType] || packType}** a été offert à <@${targetUserId}>.` }
              });
            }

          } catch (err: any) {
            return Response.json({
              type: 4,
              data: { content: `❌ Erreur technique : ${err.message}`, flags: 64 }
            });
          }
          break;
        }

        case 'quotidien': {
          try {
            await env.DB.prepare(`INSERT OR IGNORE INTO users (discord_id) VALUES (?)`).bind(userId).run();
            
            const userRecord = await env.DB.prepare(`SELECT last_daily FROM users WHERE discord_id = ?`).bind(userId).first() as any;
            const todayFrench = getFrenchDateString();

            if (userRecord?.last_daily === todayFrench) {
              return Response.json({
                type: 4,
                data: { content: `⏳ Tu as déjà récupéré ton pack quotidien aujourd'hui ! Reviens **demain dès minuit** 🌙` }
              });
            }

            await env.DB.prepare(`UPDATE users SET last_daily = ? WHERE discord_id = ?`).bind(todayFrench, userId).run();

            const updateRes = await env.DB.prepare(
              `UPDATE user_packs SET quantity = quantity + 1 WHERE user_id = ? AND pack_type = 'sachet' AND set_id = 'general'`
            ).bind(userId).run();

            if (!updateRes.meta.changes || updateRes.meta.changes === 0) {
              await env.DB.prepare(
                `INSERT INTO user_packs (user_id, pack_type, quantity, set_id) VALUES (?, 'sachet', 1, 'general')`
              ).bind(userId).run();
            }

            return Response.json({
              type: 4,
              data: { content: `🎉 Tu as récupéré ton **Sachet** quotidien ! Utilise \`/ouvrir\` pour l'ouvrir.` }
            });

          } catch (err: any) {
            return Response.json({
              type: 4,
              data: { content: `❌ Erreur lors du pack quotidien : ${err.message}`, flags: 64 }
            });
          }
        }

        case 'ouvrir': {
          const packType = options?.find((opt: any) => opt.name === 'pack')?.value;
          if (!packType) {
            return Response.json({
              type: 4,
              data: { content: "❌ Tu dois spécifier quel pack tu souhaites ouvrir.", flags: 64 }
            });
          }

          ctx.waitUntil((async () => {
            try {
              const packRecord = await env.DB.prepare(
                `SELECT quantity FROM user_packs WHERE user_id = ? AND pack_type = ? AND set_id = 'general'`
              ).bind(userId, packType).first() as any;

              if (!packRecord || packRecord.quantity <= 0) {
                await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: `❌ Tu ne possèdes aucun pack de ce type (\`${packType}\`). Récupère ton pack quotidien avec \`/quotidien\` !` })
                });
                return;
              }

              const packSizes: Record<string, number> = {
                'sachet': 1,
                'grand_sachet': 3,
                'boite': 5,
                'coffret': 10
              };
              const count = packSizes[packType] || 1;

              const { results: allCoasters } = await env.DB.prepare(`SELECT * FROM coasters`).all();
              if (!allCoasters || allCoasters.length === 0) {
                await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: "❌ Aucun coaster n'est enregistré dans la base de données." })
                });
                return;
              }

              await env.DB.prepare(`INSERT OR IGNORE INTO users (discord_id) VALUES (?)`).bind(userId).run();

              // FILTRES POUR LES GARANTIES DE RARETÉ PAR PACK
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
                env.DB.prepare(`UPDATE user_packs SET quantity = quantity - 1 WHERE user_id = ? AND pack_type = ? AND set_id = 'general'`).bind(userId, packType)
              ];

              for (let i = 0; i < count; i++) {
                let coaster: any;

                // Application des garanties sur le dernier tirage du pack
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
                'sachet': 'Sachet',
                'grand_sachet': 'Grand Sachet',
                'boite': 'Boîte',
                'coffret': 'Coffret'
              };

              const itemsList = pulledCoasters.map(c => {
                const { circle, name } = getRarityInfo(c.rarity);
                return `${circle} **[${name}]** **${c.name || c.id}** (\`${c.id}\`)`;
              }).join('\n');

              const embed: any = {
                title: `🎁 Ouverture d'un ${packNames[packType] || packType} !`,
                description: `Tu as obtenu :\n\n${itemsList}`,
                color: 14897974 // Terracotta #E35336
              };

              const imageUrl = "https://raw.githubusercontent.com/remigatier-graphiste/corner-cafe-coasters/main/public/coasters/hiver-2027/coaster_test.png";
              embed.image = { url: imageUrl };

              await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: '', embeds: [embed] })
              });

            } catch (err: any) {
              await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `❌ Erreur lors de l'ouverture du pack : ${err.message}` })
              });
            }
          })());

          return Response.json({ type: 5 });
        }

        case 'inventaire': {
          try {
            const { results: coasters } = await env.DB.prepare(
              `SELECT i.coaster_id, i.finish, i.quantity, c.name, c.rarity 
               FROM inventory i 
               LEFT JOIN coasters c ON i.coaster_id = c.id 
               WHERE i.user_id = ?`
            ).bind(userId).all();

            const { results: packs } = await env.DB.prepare(
              `SELECT pack_type, quantity FROM user_packs WHERE user_id = ? AND quantity > 0`
            ).bind(userId).all();

            const packNames: Record<string, string> = {
              'sachet': 'Sachet (1 coaster)',
              'grand_sachet': 'Grand Sachet (3 coasters)',
              'boite': 'Boîte (5 coasters)',
              'coffret': 'Coffret (10 coasters)'
            };

            let description = "**☕ Ton Inventaire & Collection :**\n\n";

            description += "**📦 Packs non ouverts :**\n";
            if (!packs || packs.length === 0) {
              description += "_Aucun pack pour le moment (tape `/quotidien`)_\n";
            } else {
              for (const p of packs as any[]) {
                description += `- **${packNames[p.pack_type] || p.pack_type}** : **x${p.quantity}**\n`;
              }
            }

            description += "\n**🥏 Coasters possédés :**\n";
            if (!coasters || coasters.length === 0) {
              description += "_Ton inventaire de coasters est vide._\n";
            } else {
              for (const row of coasters as any[]) {
                const coasterName = row.name || row.coaster_id;
                const { circle, name } = getRarityInfo(row.rarity);
                description += `- ${circle} **[${name}]** **${coasterName}** (\`ID: ${row.coaster_id}\`) [Finition: *${row.finish}*] : **x${row.quantity}**\n`;
              }
            }

            return Response.json({
              type: 4,
              data: { content: description }
            });

          } catch (err: any) {
            return Response.json({
              type: 4,
              data: { content: `❌ Erreur lors de la lecture de l'inventaire : ${err.message}`, flags: 64 }
            });
          }
        }

        case 'profil': {
          try {
            const { results: coasters } = await env.DB.prepare(
              `SELECT i.coaster_id, i.quantity, c.rarity 
               FROM inventory i 
               LEFT JOIN coasters c ON i.coaster_id = c.id 
               WHERE i.user_id = ?`
            ).bind(userId).all();

            const totalExistingRes = await env.DB.prepare(`SELECT COUNT(*) as total FROM coasters`).first() as any;
            const totalExisting = totalExistingRes?.total || 0;

            let totalCards = 0;
            let uniqueCards = coasters.length;
            const rarityCounts: Record<string, number> = {
              'Carton': 0,
              'Bois': 0,
              'Ardoise': 0,
              'Céramique': 0,
              'Métal': 0,
              'Diamant': 0
            };

            for (const row of coasters as any[]) {
              const qty = row.quantity || 0;
              totalCards += qty;

              const { name: rarityName } = getRarityInfo(row.rarity);
              if (rarityCounts[rarityName] !== undefined) {
                rarityCounts[rarityName] += qty;
              } else {
                rarityCounts[rarityName] = (rarityCounts[rarityName] || 0) + qty;
              }
            }

            const completionPercent = totalExisting > 0 ? Math.round((uniqueCards / totalExisting) * 100) : 0;

            let rankTitle = "🌱 Débutant Curieux";
            if (completionPercent >= 100) rankTitle = "👑 Maître du Café (Collection Complète !)";
            else if (completionPercent >= 75) rankTitle = "🌟 Collectionneur Expert";
            else if (completionPercent >= 40) rankTitle = "☕ Amateur Éclairé";
            else if (completionPercent >= 20) rankTitle = "☕ Apprenti Barista";

            const userObj = interaction.member?.user || interaction.user;
            const userName = userObj?.username || "Barista";
            const avatarHash = userObj?.avatar;
            const avatarUrl = avatarHash ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png` : undefined;

            const profileDesc = [
              `**Statut :** ${rankTitle}`,
              ``,
              `📊 **Complétion :** **${uniqueCards} /${totalExisting}** uniques (${completionPercent}%)`,
              `📦 **Total de cartes :** **${totalCards}** (avec doublons)`,
              ``,
              `🎨 **Cartes par rareté :**`,
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
              color: 14897974 // Terracotta #E35336
            };

            if (avatarUrl) {
              embed.thumbnail = { url: avatarUrl };
            }

            return Response.json({
              type: 4,
              data: { embeds: [embed] }
            });

          } catch (err: any) {
            return Response.json({
              type: 4,
              data: { content: `❌ Erreur lors de la lecture du profil : ${err.message}`, flags: 64 }
            });
          }
        }

        case 'proposer': {
          const myCoasterId = options?.find((opt: any) => opt.name === 'mon_coaster')?.value;
          const wantCoasterId = options?.find((opt: any) => opt.name === 'coaster_desire')?.value;

          try {
            const myItem = await env.DB.prepare(
              `SELECT i.quantity, c.name, c.rarity FROM inventory i LEFT JOIN coasters c ON i.coaster_id = c.id WHERE i.user_id = ? AND i.coaster_id = ? AND i.quantity > 0`
            ).bind(userId, myCoasterId).first() as any;

            if (!myItem || myItem.quantity < 1) {
              return Response.json({
                type: 4,
                data: { content: `❌ Tu ne possèdes pas le coaster \`${myCoasterId}\` dans ton inventaire !`, flags: 64 }
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
              data: { content: `❌ Erreur lors de la création de l'échange : ${err.message}`, flags: 64 }
            });
          }
        }

        case 'changer': {
          const coasterId = options?.find((opt: any) => opt.name === 'coaster_id')?.value;

          try {
            const item = await env.DB.prepare(
              `SELECT i.quantity, c.name, c.rarity FROM inventory i LEFT JOIN coasters c ON i.coaster_id = c.id WHERE i.user_id = ? AND i.coaster_id = ?`
            ).bind(userId, coasterId).first() as any;

            if (!item || item.quantity < 5) {
              const qty = item?.quantity || 0;
              return Response.json({
                type: 4,
                data: { content: `❌ Tu n'as pas assez d'exemplaires de \`${coasterId}\` ! (Possédés : **${qty}/5**)`, flags: 64 }
              });
            }

            const rarityLower = (item.rarity || '').toLowerCase().trim();

            if (rarityLower.includes('diamant')) {
              return Response.json({
                type: 4,
                data: { content: `⛔ Les coasters Diamant sont trop précieux pour être recyclés !`, flags: 64 }
              });
            }

            let rewardedPack = 'sachet';
            let packName = 'Sachet (1 coaster)';

            if (rarityLower.includes('bois')) {
              rewardedPack = 'grand_sachet';
              packName = 'Grand Sachet (3 coasters)';
            } else if (rarityLower.includes('ardoise')) {
              rewardedPack = 'boite';
              packName = 'Boîte (5 coasters)';
            } else if (rarityLower.includes('ceramique') || rarityLower.includes('céramique') || rarityLower.includes('metal') || rarityLower.includes('métal')) {
              rewardedPack = 'coffret';
              packName = 'Coffret (10 coasters)';
            }

            const updatePackRes = await env.DB.prepare(
              `UPDATE user_packs SET quantity = quantity + 1 WHERE user_id = ? AND pack_type = ? AND set_id = 'general'`
            ).bind(userId, rewardedPack).run();

            if (!updatePackRes.meta.changes || updatePackRes.meta.changes === 0) {
              await env.DB.prepare(
                `INSERT INTO user_packs (user_id, pack_type, quantity, set_id) VALUES (?, ?, 1, 'general')`
              ).bind(userId, rewardedPack).run();
            }

            await env.DB.prepare(
              `UPDATE inventory SET quantity = quantity - 5 WHERE user_id = ? AND coaster_id = ? AND finish = 'normal'`
            ).bind(userId, coasterId).run();

            const { circle } = getRarityInfo(item.rarity);

            return Response.json({
              type: 4,
              data: {
                content: `♻️ **Recyclage réussi !** Tu as échangé 5x ${circle} **${item.name || coasterId}** contre 1x **${packName}** ! 🎉`
              }
            });

          } catch (err: any) {
            return Response.json({
              type: 4,
              data: { content: `❌ Erreur lors du recyclage : ${err.message}`, flags: 64 }
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
