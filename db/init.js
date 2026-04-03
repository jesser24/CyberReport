// db/init.js – Initialisation du stockage JSON
const { ensureDataFile, ensureDefaultAdmin, DATA_FILE } = require('../lib/storage');

ensureDataFile();
const created = ensureDefaultAdmin();

if (created) {
  console.log('✅ Compte admin créé : admin@cyberreport.fr / Admin@1234');
}
console.log(`✅ Stockage initialisé avec succès : ${DATA_FILE}`);

module.exports = { ok: true };
