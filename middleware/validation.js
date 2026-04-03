// middleware/validation.js – Validation serveur des formulaires
const config = require('../config/config');

function stripTags(value) {
  return String(value || '').replace(/<[^>]*>/g, '').trim();
}

/**
 * Valide le formulaire de signalement d'incident.
 * Retourne un tableau d'erreurs (vide si OK).
 */
function validateIncidentForm(body) {
  const errors = [];

  if (!body.titre_incident || stripTags(body.titre_incident).length < 5 || stripTags(body.titre_incident).length > 120) {
    errors.push('Le titre de l\'incident est requis (entre 5 et 120 caractères).');
  }

  if (!body.prenom || stripTags(body.prenom).length < 2)
    errors.push('Le prénom est requis (min. 2 caractères).');

  if (!body.nom || stripTags(body.nom).length < 2)
    errors.push('Le nom est requis (min. 2 caractères).');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!body.email || !emailRegex.test(stripTags(body.email)))
    errors.push('Adresse email invalide.');

  if (!body.type_incident || !config.TYPES_INCIDENT.includes(body.type_incident))
    errors.push('Type d\'incident invalide.');

  if (!body.gravite || !config.NIVEAUX_GRAVITE.includes(body.gravite))
    errors.push('Niveau de gravité invalide.');

  if (!body.description || stripTags(body.description).length < 20)
    errors.push('La description est requise (min. 20 caractères).');

  if (!body.consentement)
    errors.push('Vous devez accepter les conditions d\'utilisation.');

  if (body.telephone && stripTags(body.telephone)) {
    const telRegex = /^[\d\s\+\-\(\)]{8,20}$/;
    if (!telRegex.test(stripTags(body.telephone)))
      errors.push('Numéro de téléphone invalide.');
  }

  return errors;
}

/**
 * Middleware Express qui valide le corps de la requête de signalement.
 */
function validateIncident(req, res, next) {
  const errors = validateIncidentForm(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  ['titre_incident', 'prenom', 'nom', 'email', 'telephone', 'service', 'description'].forEach((field) => {
    if (typeof req.body[field] === 'string') {
      req.body[field] = stripTags(req.body[field]);
    }
  });

  next();
}

module.exports = { validateIncident, validateIncidentForm };
