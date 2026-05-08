const { ensureSchema, ensureDefaultAdmin } = require('../lib/storage');

async function initDatabase() {
  await ensureSchema();
  const created = await ensureDefaultAdmin();
  if (created) console.log('✅ Compte admin créé : admin@cyberreport.fr / Admin@1234');
  console.log('✅ Base MySQL initialisée avec succès');
}

module.exports = { initDatabase };
