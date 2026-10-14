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

    // Route d'enregistrement des commandes
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
            const now = Date.now();
            const lastDaily = userRecord?.last_daily ? parseInt(userRecord.last_daily) : 0;
            const cooldown = 24 * 60 * 60 * 1000;

            if (now - lastDaily < cooldown) {
              const remainingTime = Math.ceil((cooldown - (now - lastDaily)) / (1000 * 60 * 60));
              return Response.json({
                type: 4,
                data: { content: `⏳ Tu as déjà récupéré ton pack quotidien ! Tu pourras en ravoir un dans environ **${remainingTime}h**.` }
              });
            }

            await env.DB.prepare(`UPDATE users SET last_daily = ? WHERE discord_id = ?`).bind(now.toString(), userId).run();

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

          // Exécution en tâche de fond async pour éviter le timeout de 3 secondes de Discord
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

              const pulledCoasters: any[] = [];
              const dbStatements: D1PreparedStatement[] = [
                env.DB.prepare(`UPDATE user_packs SET quantity = quantity - 1 WHERE user_id = ? AND pack_type = ? AND set_id = 'general'`).bind(userId, packType)
              ];

              for (let i = 0; i < count; i++) {
                const randomIndex = Math.floor(Math.random() * allCoasters.length);
                const coaster = allCoasters[randomIndex] as any;
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

              const embed: any = {
                title: `🎁 Ouverture d'un ${packNames[packType] || packType} !`,
                description: `Tu as obtenu :\n\n` + pulledCoasters.map(c => `✨ **${c.name || c.id}** (\`${c.id}\`)${c.rarity ? ` [Rareté: *${c.rarity}*]` : ''}`).join('\n'),
                color: 14897974
              };

              const firstImg = pulledCoasters[0]?.image || pulledCoasters[0]?.image_url;
              if (firstImg && typeof firstImg === 'string' && firstImg.startsWith('http')) {
                embed.image = { url: firstImg };
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
                body: JSON.stringify({ content: `❌ Erreur lors de l'ouverture du pack : ${err.message}` })
              });
            }
          })());

          // Réponse instantanée à Discord (Type 5: DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE)
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
                const rarityStr = row.rarity ? ` [Rareté: *${row.rarity}*]` : '';
                description += `- **${coasterName}** (\`ID: ${row.coaster_id}\`)${rarityStr} [Finition: *${row.finish}*] : **x${row.quantity}**\n`;
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
