// db/database.js – Compatibilité simple avec l'ancien import
const storage = require('../lib/storage');

function getDb() {
  return storage;
}

module.exports = { getDb };
