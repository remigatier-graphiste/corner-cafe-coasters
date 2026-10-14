// register.js
const DISCORD_TOKEN = "TON_BOT_TOKEN_ICI";
const CLIENT_ID = "TON_APPLICATION_ID_ICI";

const commands = [
  {
    name: 'donner',
    description: 'Donner un coaster à un utilisateur (Admin)',
    options: [
      {
        name: 'utilisateur',
        description: 'Le membre à qui donner le coaster',
        type: 6, // RENDER_USER type
        required: true,
      },
      {
        name: 'coaster_id',
        description: 'L''ID du coaster à donner (ex: hiver-2027-001)',
        type: 3, // STRING type
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
    description: 'Récupérer ton pack quotidien de coasters',
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

async function main() {
  const url = `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (response.ok) {
    console.log('✅ Commandes enregistrées avec succès sur Discord !');
  } else {
    const error = await response.text();
    console.error('❌ Erreur lors de l\'enregistrement :', error);
  }
}

main();
