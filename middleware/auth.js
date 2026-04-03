// middleware/auth.js – Middleware d'authentification admin

/**
 * Vérifie que l'utilisateur est connecté comme admin.
 * Redirige vers la page de connexion sinon.
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/admin/login');
}

/**
 * Vérifie que l'utilisateur est superadmin.
 */
function requireSuperAdmin(req, res, next) {
  if (req.session && req.session.adminRole === 'superadmin') {
    return next();
  }
  res.status(403).json({ error: 'Accès refusé' });
}

module.exports = { requireAdmin, requireSuperAdmin };
