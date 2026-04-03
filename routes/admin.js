// routes/admin.js – Routes du panneau d'administration
const express = require('express');
const router = express.Router();
const path = require('path');
const {
  getAdminByEmail,
  verifyPassword,
  getStats,
  listIncidents,
  getFilteredIncidents,
  getIncidentById,
  getCommentsForIncident,
  updateIncidentStatus,
  addComment,
  deleteIncidentById
} = require('../lib/storage');

const { buildIncidentsExcel } = require('../lib/excel');
const { requireAdmin } = require('../middleware/auth');
const config = require('../config/config');
const { sendStatusUpdateEmail } = require('../config/mailer');

// ── Connexion

router.get('/', (req, res) => {
  if (req.session?.adminId) return res.redirect('/admin/dashboard');
  return res.redirect('/admin/login');
});

router.get('/login', (req, res) => {
  if (req.session?.adminId) return res.redirect('/admin/dashboard');
  res.sendFile(path.join(__dirname, '../views/admin/login.html'));
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis.' });
  }

  const admin = getAdminByEmail(email.trim());

  if (!admin || !verifyPassword(password, admin.mot_de_passe)) {
    return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
  }

  req.session.adminId = admin.id;
  req.session.adminNom = admin.nom;
  req.session.adminRole = admin.role;

  res.json({ success: true, redirect: req.session.returnTo || '/admin/dashboard' });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ── Dashboard

router.get('/dashboard', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin/dashboard.html'));
});

router.get('/api/stats', requireAdmin, (req, res) => {
  res.json(getStats());
});

// ── Liste des incidents

router.get('/incidents', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin/incidents.html'));
});

router.get('/api/incidents/export', requireAdmin, (req, res) => {
  const { type, gravite, statut, search, sort = 'date_creation', order = 'DESC' } = req.query;
  const incidents = getFilteredIncidents({ type, gravite, statut, search, sort, order });
  const content = buildIncidentsExcel(incidents);

  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0')
  ].join('');

  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="incidents-${stamp}.xls"`);
  res.send(content);
});

router.get('/api/incidents', requireAdmin, (req, res) => {
  const {
    page = 1,
    limit = 15,
    type,
    gravite,
    statut,
    search,
    sort = 'date_creation',
    order = 'DESC'
  } = req.query;

  res.json(listIncidents({ page, limit, type, gravite, statut, search, sort, order }));
});

// ── Suppression d'un incident

router.delete('/api/incidents/:id', requireAdmin, (req, res) => {
  try {
    const incidentId = req.params.id;

    const incident = getIncidentById(incidentId);
    if (!incident) {
      return res.status(404).json({ message: 'Ticket introuvable.' });
    }

    const deleted = deleteIncidentById(incidentId);

    if (!deleted) {
      return res.status(500).json({ message: 'Impossible de supprimer le ticket.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression incident :', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ── Détail d'un incident

router.get('/incidents/:id', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin/incident-detail.html'));
});

router.get('/api/incidents/:id', requireAdmin, (req, res) => {
  const incident = getIncidentById(req.params.id);
  if (!incident) return res.status(404).json({ message: 'Incident introuvable.' });

  const comments = getCommentsForIncident(req.params.id);
  res.json({ incident, comments });
});

// ── Modifier le statut d'un incident

router.put('/api/incidents/:id/statut', requireAdmin, (req, res) => {
  const { statut } = req.body;
  if (!config.STATUTS.includes(statut)) {
    return res.status(400).json({ message: 'Statut invalide.' });
  }

  const existingIncident = getIncidentById(req.params.id);
  if (!existingIncident) {
    return res.status(404).json({ message: 'Incident introuvable.' });
  }

  const previousStatus = existingIncident.statut;
  const incident = updateIncidentStatus(req.params.id, statut);

  if (incident && previousStatus !== statut) {
    sendStatusUpdateEmail(incident, previousStatus).catch(console.error);
  }

  res.json({ success: true });
});

// ── Ajouter un commentaire

router.post('/api/incidents/:id/commentaires', requireAdmin, (req, res) => {
  const { commentaire } = req.body;
  if (!commentaire?.trim()) {
    return res.status(400).json({ message: 'Le commentaire ne peut pas être vide.' });
  }

  const comment = addComment(req.params.id, req.session.adminId, commentaire.trim());
  if (!comment) {
    return res.status(404).json({ message: 'Incident introuvable.' });
  }

  res.json({ success: true });
});

// ── Informations session admin

router.get('/api/me', requireAdmin, (req, res) => {
  res.json({
    nom: req.session.adminNom,
    role: req.session.adminRole
  });
});

module.exports = router;