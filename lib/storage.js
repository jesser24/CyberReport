const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'cyberreport.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      counters: { admins: 0, incidents: 0, comments: 0 },
      admins: [],
      incidents: [],
      comments: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const [algo, salt, originalHash] = storedHash.split(':');
  if (algo !== 'scrypt' || !salt || !originalHash) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function ensureDefaultAdmin() {
  const data = readData();
  const existing = data.admins.find((a) => a.email.toLowerCase() === 'admin@cyberreport.fr');
  if (!existing) {
    const id = ++data.counters.admins;
    data.admins.push({
      id,
      nom: 'Administrateur',
      email: 'admin@cyberreport.fr',
      mot_de_passe: hashPassword('Admin@1234'),
      role: 'superadmin',
      date_creation: nowIso()
    });
    writeData(data);
    return true;
  }
  return false;
}

function getAdminByEmail(email) {
  const data = readData();
  return data.admins.find((a) => a.email.toLowerCase() === String(email).trim().toLowerCase()) || null;
}

function getIncidentById(id) {
  const data = readData();
  return data.incidents.find((i) => i.id === Number(id)) || null;
}

function getIncidentByEmailAndTicket(email, ticketNumber) {
  const data = readData();
  return data.incidents.find(
    (i) =>
      i.email.toLowerCase() === String(email).trim().toLowerCase() &&
      i.ticket_number.toLowerCase() === String(ticketNumber).trim().toLowerCase()
  ) || null;
}

function deleteIncidentById(id) {
  const data = readData();
  const incidentId = Number(id);
  const incidentIndex = data.incidents.findIndex((i) => i.id === incidentId);

  if (incidentIndex === -1) return false;

  data.incidents.splice(incidentIndex, 1);
  data.comments = data.comments.filter((c) => c.incident_id !== incidentId);
  writeData(data);
  return true;
}

function getLastTicketForYear(year) {
  const data = readData();
  return data.incidents
    .filter((i) => i.ticket_number.startsWith(`INC-${year}-`))
    .sort((a, b) => b.id - a.id)[0] || null;
}

function createIncident(payload) {
  const data = readData();
  const id = ++data.counters.incidents;
  const timestamp = nowIso();
  const incident = {
    id,
    ticket_number: payload.ticket_number,
    titre_incident: payload.titre_incident || 'Incident',
    prenom: payload.prenom,
    nom: payload.nom,
    email: payload.email,
    telephone: payload.telephone || null,
    service: payload.service || null,
    type_incident: payload.type_incident,
    gravite: payload.gravite,
    appareil: payload.appareil || null,
    description: payload.description,
    fichier: payload.fichier || null,
    statut: payload.statut || 'Nouveau',
    date_creation: timestamp,
    date_modification: timestamp
  };
  data.incidents.push(incident);
  writeData(data);
  return incident;
}

function applyIncidentFilters(incidents, { type, gravite, statut, search } = {}) {
  let filtered = [...incidents];

  if (type) filtered = filtered.filter((i) => i.type_incident === type);
  if (gravite) filtered = filtered.filter((i) => i.gravite === gravite);
  if (statut) filtered = filtered.filter((i) => i.statut === statut);

  if (search) {
    const s = String(search).toLowerCase();
    filtered = filtered.filter((i) =>
      [
        i.ticket_number,
        i.titre_incident,
        i.prenom,
        i.nom,
        i.email,
        i.telephone,
        i.service,
        i.type_incident,
        i.description
      ].some((v) => String(v || '').toLowerCase().includes(s))
    );
  }

  return filtered;
}

function sortIncidents(incidents, sort = 'date_creation', order = 'DESC') {
  const allowedSort = new Set(['date_creation', 'gravite', 'statut', 'type_incident', 'ticket_number', 'titre_incident']);
  const sortKey = allowedSort.has(sort) ? sort : 'date_creation';
  const direction = order === 'ASC' ? 1 : -1;

  return [...incidents].sort((a, b) => {
    const av = String(a[sortKey] ?? '');
    const bv = String(b[sortKey] ?? '');
    return av.localeCompare(bv, 'fr', { numeric: true }) * direction;
  });
}

function getFilteredIncidents({ type, gravite, statut, search, sort = 'date_creation', order = 'DESC' } = {}) {
  const data = readData();
  return sortIncidents(applyIncidentFilters(data.incidents, { type, gravite, statut, search }), sort, order);
}

function listIncidents({ page = 1, limit = 15, type, gravite, statut, search, sort = 'date_creation', order = 'DESC' }) {
  const incidents = getFilteredIncidents({ type, gravite, statut, search, sort, order });
  const total = incidents.length;
  const start = (Number(page) - 1) * Number(limit);
  const paginated = incidents.slice(start, start + Number(limit));

  return {
    incidents: paginated,
    total,
    page: Number(page),
    totalPages: Math.max(1, Math.ceil(total / Number(limit)))
  };
}

function getCommentsForIncident(incidentId) {
  const data = readData();
  return data.comments
    .filter((c) => c.incident_id === Number(incidentId))
    .map((comment) => ({
      ...comment,
      admin_nom: data.admins.find((a) => a.id === comment.admin_id)?.nom || 'Administrateur'
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function updateIncidentStatus(incidentId, statut) {
  const data = readData();
  const incident = data.incidents.find((i) => i.id === Number(incidentId));
  if (!incident) return null;
  incident.statut = statut;
  incident.date_modification = nowIso();
  writeData(data);
  return incident;
}

function addComment(incidentId, adminId, commentaire) {
  const data = readData();
  const incident = data.incidents.find((i) => i.id === Number(incidentId));
  if (!incident) return null;
  const id = ++data.counters.comments;
  const comment = {
    id,
    incident_id: Number(incidentId),
    admin_id: Number(adminId),
    commentaire,
    date: nowIso()
  };
  data.comments.push(comment);
  incident.date_modification = nowIso();
  writeData(data);
  return comment;
}

function getStats() {
  const data = readData();
  const incidents = data.incidents;
  const total = incidents.length;
  const ouverts = incidents.filter((i) => ['Nouveau', 'En cours', 'En attente'].includes(i.statut)).length;
  const critiques = incidents.filter((i) => i.gravite === 'Critique').length;
  const resolus = incidents.filter((i) => ['Résolu', 'Fermé'].includes(i.statut)).length;

  const countBy = (key) =>
    Object.entries(
      incidents.reduce((acc, item) => {
        const k = item[key] || 'Non spécifié';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {})
    ).map(([label, count]) => ({ label, count }));

  const parType = countBy('type_incident').sort((a, b) => b.count - a.count);
  const parGravite = countBy('gravite');
  const parStatut = countBy('statut');
  const parMoisMap = incidents.reduce((acc, item) => {
    const mois = String(item.date_creation).slice(0, 7);
    if (mois) acc[mois] = (acc[mois] || 0) + 1;
    return acc;
  }, {});
  const parMois = Object.entries(parMoisMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mois, count]) => ({ mois, count }));

  return { total, ouverts, critiques, resolus, parType, parGravite, parMois, parStatut };
}

module.exports = {
  DATA_FILE,
  ensureDataFile,
  ensureDefaultAdmin,
  getAdminByEmail,
  verifyPassword,
  getLastTicketForYear,
  createIncident,
  getIncidentById,
  getIncidentByEmailAndTicket,
  deleteIncidentById,
  getFilteredIncidents,
  listIncidents,
  getCommentsForIncident,
  updateIncidentStatus,
  addComment,
  getStats,
  hashPassword
};
