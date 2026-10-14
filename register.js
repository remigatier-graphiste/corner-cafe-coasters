const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = "1559598773389500526"; // Ton application ID (public)

const commands = [
  {
    name: 'donner',
    description: 'Donner un coaster à un utilisateur (Admin)',
    options: [
      {
        name: 'utilisateur',
        description: 'Le membre à qui donner le coaster',
        type: 6,
        required: true,
      },
      {
        name: 'coaster_id',
        description: 'L''ID du coaster à donner (ex: hiver-2027-001)',
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
    process.exit(1);
  }
}

main();
