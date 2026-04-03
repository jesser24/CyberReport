// routes/public.js – Routes publiques du site
const express = require('express');
const router = express.Router();
const path = require('path');
const {
  getLastTicketForYear,
  createIncident,
  getIncidentByEmailAndTicket
} = require('../lib/storage');
const { validateIncident } = require('../middleware/validation');
const upload = require('../config/upload');
const { sendConfirmationEmail, sendAdminNotification } = require('../config/mailer');

// ── Helper : génère un numéro de ticket unique ───────────────────────────────
function generateTicketNumber() {
  const year = new Date().getFullYear();
  const lastTicket = getLastTicketForYear(year);

  let seq = 1;
  if (lastTicket) {
    const parts = lastTicket.ticket_number.split('-');
    seq = parseInt(parts[2]) + 1;
  }
  return `INC-${year}-${String(seq).padStart(4, '0')}`;
}

// ── Page d'accueil ───────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

// ── Page À propos ────────────────────────────────────────────────────────────
router.get('/a-propos', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/apropos.html'));
});

// ── Page FAQ ─────────────────────────────────────────────────────────────────
router.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/faq.html'));
});

// ── Page de signalement ──────────────────────────────────────────────────────
router.get('/signaler', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/signaler.html'));
});

// ── Soumission du formulaire ─────────────────────────────────────────────────
router.post('/signaler',
  upload.single('fichier'),
  validateIncident,
  async (req, res) => {
    try {
      const {
        titre_incident, prenom, nom, email, telephone, service,
        type_incident, gravite, appareil, description
      } = req.body;

      const ticket_number = generateTicketNumber();
      const fichier = req.file ? req.file.filename : null;

      const incident = createIncident({
        ticket_number,
        titre_incident: titre_incident.trim(),
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.trim(),
        telephone: telephone?.trim() || null,
        service: service?.trim() || null,
        type_incident,
        gravite,
        appareil: appareil || null,
        description: description.trim(),
        fichier,
        statut: 'Nouveau'
      });

      // Envoi des emails (non-bloquant)
      sendConfirmationEmail(incident).catch(console.error);
      sendAdminNotification(incident).catch(console.error);

      res.json({
        success: true,
        ticket_number,
        message: 'Votre signalement a été enregistré avec succès.',
        incidentId: incident.id
      });
    } catch (err) {
      console.error('Erreur soumission incident:', err);
      res.status(500).json({
        success: false,
        errors: ['Une erreur interne est survenue. Veuillez réessayer.']
      });
    }
  }
);


// ── Statistiques publiques pour la page d'accueil ───────────────────────────
router.get('/api/public-stats', (req, res) => {
  const { getStats } = require('../lib/storage');
  res.json(getStats());
});

// ── Page de suivi d'incident ─────────────────────────────────────────────────
router.get('/suivi', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/suivi.html'));
});

// ── API de suivi : recherche par email + ticket ──────────────────────────────
router.post('/api/suivi', (req, res) => {
  const { email, ticket_number } = req.body;

  if (!email || !ticket_number) {
    return res.status(400).json({ success: false, message: 'Email et numéro de ticket requis.' });
  }

  const incident = getIncidentByEmailAndTicket(email.trim(), ticket_number.trim());

  if (!incident) {
    return res.status(404).json({
      success: false,
      message: 'Aucun incident trouvé avec ces informations.'
    });
  }

  const safeIncident = {
    ticket_number: incident.ticket_number,
    prenom: incident.prenom,
    nom: incident.nom,
    type_incident: incident.type_incident,
    gravite: incident.gravite,
    statut: incident.statut,
    appareil: incident.appareil,
    service: incident.service,
    date_creation: incident.date_creation,
    date_modification: incident.date_modification
  };

  res.json({ success: true, incident: safeIncident });
});

module.exports = router;
