const crypto = require('crypto');
const mysql = require('mysql2/promise');
const config = require('../config/config');

let pool;

function getPool() {
  if (!pool) {
    const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';
    const poolOptions = {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cyberreport',
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      queueLimit: 0,
      timezone: 'Z',
      charset: 'utf8mb4'
    };

    if (sslEnabled) {
      poolOptions.ssl = { rejectUnauthorized: false };
    }

    pool = mysql.createPool(poolOptions);
  }
  return pool;
}

function toMysqlDate(date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function toIsoRow(row) {
  if (!row) return row;
  for (const key of ['date_creation', 'date_modification', 'date']) {
    if (row[key] instanceof Date) row[key] = row[key].toISOString();
  }
  return row;
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

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function ensureSchema() {
  const db = getPool();
  await db.query(`CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('admin','superadmin') NOT NULL DEFAULT 'admin',
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(30) NOT NULL UNIQUE,
    titre_incident VARCHAR(180) NOT NULL,
    prenom VARCHAR(90) NOT NULL,
    nom VARCHAR(90) NOT NULL,
    email VARCHAR(180) NOT NULL,
    telephone VARCHAR(40) NULL,
    service VARCHAR(120) NULL,
    type_incident VARCHAR(80) NOT NULL,
    gravite ENUM('Faible','Moyen','Élevé','Critique') NOT NULL,
    appareil VARCHAR(120) NULL,
    description TEXT NOT NULL,
    fichier VARCHAR(255) NULL,
    statut ENUM('Nouveau','En cours','En attente','Résolu','Fermé') NOT NULL DEFAULT 'Nouveau',
    date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ticket (ticket_number),
    INDEX idx_email_ticket (email, ticket_number),
    INDEX idx_filters (type_incident, gravite, statut),
    INDEX idx_date_creation (date_creation)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS commentaires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    admin_id INT NULL,
    commentaire TEXT NOT NULL,
    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_comment_incident (incident_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NULL,
    admin_id INT NULL,
    action VARCHAR(80) NOT NULL,
    details TEXT NULL,
    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_audit_date (date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function ensureDefaultAdmin() {
  const existing = await getAdminByEmail('admin@cyberreport.fr');
  if (existing) return false;
  await query(
    'INSERT INTO admins (nom, email, mot_de_passe, role, date_creation) VALUES (?, ?, ?, ?, ?)',
    ['Administrateur', 'admin@cyberreport.fr', hashPassword('Admin@1234'), 'superadmin', toMysqlDate()]
  );
  return true;
}

async function getAdminByEmail(email) {
  const rows = await query('SELECT * FROM admins WHERE LOWER(email)=LOWER(?) LIMIT 1', [String(email).trim()]);
  return rows[0] || null;
}

async function getIncidentById(id) {
  const rows = await query('SELECT * FROM incidents WHERE id = ? LIMIT 1', [Number(id)]);
  return toIsoRow(rows[0]) || null;
}

async function getIncidentByEmailAndTicket(email, ticketNumber) {
  const rows = await query(
    'SELECT * FROM incidents WHERE LOWER(email)=LOWER(?) AND LOWER(ticket_number)=LOWER(?) LIMIT 1',
    [String(email).trim(), String(ticketNumber).trim()]
  );
  return toIsoRow(rows[0]) || null;
}

async function getLastTicketForYear(year) {
  const rows = await query(
    'SELECT * FROM incidents WHERE ticket_number LIKE ? ORDER BY id DESC LIMIT 1',
    [`INC-${year}-%`]
  );
  return toIsoRow(rows[0]) || null;
}

async function createIncident(payload) {
  const sql = `INSERT INTO incidents
    (ticket_number, titre_incident, prenom, nom, email, telephone, service, type_incident, gravite, appareil, description, fichier, statut, date_creation, date_modification)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const ts = toMysqlDate();
  const params = [payload.ticket_number, payload.titre_incident || 'Incident', payload.prenom, payload.nom, payload.email,
    payload.telephone || null, payload.service || null, payload.type_incident, payload.gravite, payload.appareil || null,
    payload.description, payload.fichier || null, payload.statut || 'Nouveau', ts, ts];
  const result = await query(sql, params);
  await addAuditLog(result.insertId, null, 'CREATE_INCIDENT', `Signalement créé: ${payload.ticket_number}`);
  return getIncidentById(result.insertId);
}

async function deleteIncidentById(id, adminId = null) {
  const incident = await getIncidentById(id);
  if (!incident) return false;
  await addAuditLog(id, adminId, 'DELETE_INCIDENT', `Suppression du ticket ${incident.ticket_number}`);
  await query('DELETE FROM incidents WHERE id = ?', [Number(id)]);
  return true;
}

function buildWhere({ type, gravite, statut, search } = {}) {
  const clauses = [];
  const params = [];
  if (type) { clauses.push('type_incident = ?'); params.push(type); }
  if (gravite) { clauses.push('gravite = ?'); params.push(gravite); }
  if (statut) { clauses.push('statut = ?'); params.push(statut); }
  if (search) {
    clauses.push(`(ticket_number LIKE ? OR titre_incident LIKE ? OR prenom LIKE ? OR nom LIKE ? OR email LIKE ? OR telephone LIKE ? OR service LIKE ? OR type_incident LIKE ? OR description LIKE ?)`);
    for (let i = 0; i < 9; i++) params.push(`%${search}%`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function safeSort(sort = 'date_creation', order = 'DESC') {
  const allowed = new Set(['date_creation', 'gravite', 'statut', 'type_incident', 'ticket_number', 'titre_incident']);
  const sortKey = allowed.has(sort) ? sort : 'date_creation';
  return { sortKey, dir: order === 'ASC' ? 'ASC' : 'DESC' };
}

async function getFilteredIncidents(filters = {}) {
  const { where, params } = buildWhere(filters);
  const { sortKey, dir } = safeSort(filters.sort, filters.order);
  const rows = await query(`SELECT * FROM incidents ${where} ORDER BY ${sortKey} ${dir}`, params);
  return rows.map(toIsoRow);
}

async function listIncidents({ page = 1, limit = 15, type, gravite, statut, search, sort = 'date_creation', order = 'DESC' }) {
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(100, Math.max(1, Number(limit) || 15));
  const { where, params } = buildWhere({ type, gravite, statut, search });
  const { sortKey, dir } = safeSort(sort, order);
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM incidents ${where}`, params);
  const offset = (page - 1) * limit;
  // MySQL peut refuser les placeholders dans LIMIT/OFFSET selon la version/driver.
  // Les valeurs sont converties et bornées juste au-dessus, donc l'injection SQL est évitée.
  const rows = await query(`SELECT * FROM incidents ${where} ORDER BY ${sortKey} ${dir} LIMIT ${limit} OFFSET ${offset}`, params);
  return { incidents: rows.map(toIsoRow), total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

async function getCommentsForIncident(incidentId) {
  const rows = await query(`SELECT c.*, COALESCE(a.nom, 'Administrateur') AS admin_nom
    FROM commentaires c LEFT JOIN admins a ON a.id = c.admin_id
    WHERE c.incident_id = ? ORDER BY c.date ASC`, [Number(incidentId)]);
  return rows.map(toIsoRow);
}

async function updateIncidentStatus(incidentId, statut, adminId = null) {
  await query('UPDATE incidents SET statut = ?, date_modification = ? WHERE id = ?', [statut, toMysqlDate(), Number(incidentId)]);
  await addAuditLog(incidentId, adminId, 'UPDATE_STATUS', `Statut changé vers ${statut}`);
  return getIncidentById(incidentId);
}

async function updateIncident(incidentId, payload, adminId = null) {
  const allowed = ['titre_incident','prenom','nom','email','telephone','service','type_incident','gravite','appareil','description','statut'];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      sets.push(`${key} = ?`);
      params.push(payload[key] === '' ? null : payload[key]);
    }
  }
  if (!sets.length) return getIncidentById(incidentId);
  sets.push('date_modification = ?');
  params.push(toMysqlDate(), Number(incidentId));
  await query(`UPDATE incidents SET ${sets.join(', ')} WHERE id = ?`, params);
  await addAuditLog(incidentId, adminId, 'UPDATE_INCIDENT', 'Informations principales modifiées');
  return getIncidentById(incidentId);
}

async function addComment(incidentId, adminId, commentaire) {
  const incident = await getIncidentById(incidentId);
  if (!incident) return null;
  const result = await query('INSERT INTO commentaires (incident_id, admin_id, commentaire, date) VALUES (?, ?, ?, ?)', [Number(incidentId), Number(adminId) || null, commentaire, toMysqlDate()]);
  await query('UPDATE incidents SET date_modification = ? WHERE id = ?', [toMysqlDate(), Number(incidentId)]);
  await addAuditLog(incidentId, adminId, 'ADD_COMMENT', 'Commentaire ajouté');
  const rows = await query('SELECT * FROM commentaires WHERE id = ?', [result.insertId]);
  return toIsoRow(rows[0]);
}

async function addAuditLog(incidentId, adminId, action, details = null) {
  try {
    await query('INSERT INTO audit_logs (incident_id, admin_id, action, details, date) VALUES (?, ?, ?, ?, ?)', [incidentId || null, adminId || null, action, details, toMysqlDate()]);
  } catch (e) {
    console.error('Audit log ignoré:', e.message);
  }
}

async function getAuditLogs(incidentId) {
  const rows = await query(`SELECT l.*, COALESCE(a.nom, 'Système') AS admin_nom
    FROM audit_logs l LEFT JOIN admins a ON a.id = l.admin_id
    WHERE l.incident_id = ? ORDER BY l.date DESC LIMIT 30`, [Number(incidentId)]);
  return rows.map(toIsoRow);
}

async function getStats() {
  const [[totals], parType, parGravite, parStatut, parMois] = await Promise.all([
    query(`SELECT COUNT(*) total,
      SUM(statut IN ('Nouveau','En cours','En attente')) ouverts,
      SUM(gravite = 'Critique') critiques,
      SUM(statut IN ('Résolu','Fermé')) resolus
      FROM incidents`),
    query(`SELECT type_incident AS label, COUNT(*) AS count FROM incidents GROUP BY type_incident ORDER BY count DESC`),
    query(`SELECT gravite AS label, COUNT(*) AS count FROM incidents GROUP BY gravite`),
    query(`SELECT statut AS label, COUNT(*) AS count FROM incidents GROUP BY statut`),
    query(`SELECT DATE_FORMAT(date_creation, '%Y-%m') AS mois, COUNT(*) AS count FROM incidents GROUP BY mois ORDER BY mois ASC`)
  ]);
  return {
    total: Number(totals.total || 0),
    ouverts: Number(totals.ouverts || 0),
    critiques: Number(totals.critiques || 0),
    resolus: Number(totals.resolus || 0),
    parType, parGravite, parStatut, parMois
  };
}

module.exports = {
  getPool,
  ensureSchema,
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
  updateIncident,
  addComment,
  getAuditLogs,
  getStats,
  hashPassword
};
