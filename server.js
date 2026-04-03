const fs = require('fs');
const path = require('path');

(function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
})();

// server.js – Point d'entrée principal de l'application CyberReport
const express = require('express');
const session = require('express-session');
const config = require('./config/config');
const { verifyMailerConnection } = require('./config/mailer');
const FileSessionStore = require('./lib/file-session-store');

// Initialisation de la base de données au démarrage
require('./db/init');

const app = express();

// ── Middlewares ──────────────────────────────────────────────────────────────

// Parse JSON et formulaires URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions persistantes (évite MemoryStore en production / Render)
app.set('trust proxy', 1);
const sessionMaxAge = 8 * 60 * 60 * 1000;
app.use(session({
  store: new FileSessionStore({ ttlMs: sessionMaxAge }),
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'cyberreport.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: sessionMaxAge
  }
}));

// Fichiers statiques (CSS, JS, images, uploads)
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ───────────────────────────────────────────────────────────────────

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// ── Gestion des erreurs 404 ──────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views/404.html'));
});

// ── Démarrage du serveur ─────────────────────────────────────────────────────

app.listen(config.PORT, async () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                CyberReport - Demarre                       ║');
  console.log(`║           http://localhost:${config.PORT}                  ║`);
  console.log('║                                                            ║');
  console.log(`║      Admin : http://localhost:${config.PORT}/admin/login   ║`);
  console.log('║      Email : admin@cyberreport.fr                          ║');
  console.log('║      MDP   : Admin@1234                                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    await verifyMailerConnection();
  } catch (error) {
    console.error('Erreur email au démarrage :', error.message);
  }
});

module.exports = app;