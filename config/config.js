// Configuration de l'application
module.exports = {
  PORT: process.env.PORT || 3000,
  SESSION_SECRET: process.env.SESSION_SECRET || 'cyberreport_secret_2026_xyz',
  APP_BASE_URL: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,

  EMAIL: {
    provider: 'resend',
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'CyberReport <onboarding@resend.dev>',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@cyberreport.fr'
  },

  TYPES_INCIDENT: [
    'Phishing',
    'Virus / Malware',
    'Problème réseau',
    'Bug logiciel',
    'Accès non autorisé',
    'Panne matérielle'
  ],

  NIVEAUX_GRAVITE: ['Faible', 'Moyen', 'Élevé', 'Critique'],

  TYPES_APPAREIL: [
    'Poste de travail',
    'Ordinateur portable',
    'Serveur',
    'Équipement réseau',
    'Autre'
  ],

  STATUTS: ['Nouveau', 'En cours', 'En attente', 'Résolu', 'Fermé'],

  UPLOAD: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
  }
};
