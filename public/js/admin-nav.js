async function initAdminNav() {
  let adminNom = 'Admin';
  try {
    const r = await fetch('/admin/api/me');
    if (!r.ok) { window.location.href = '/admin/login'; return; }
    const d = await r.json();
    adminNom = d.nom;
  } catch (e) {
    window.location.href = '/admin/login';
    return;
  }

  const currentPath = window.location.pathname;
  const navHtml = `
  <nav class="navbar navbar-expand-lg navbar-dark sticky-top" style="background:rgba(7,17,31,.86);border-bottom:1px solid rgba(148,163,184,.12);">
    <div class="container-fluid px-4 py-2">
      <a class="navbar-brand fw-bold d-flex align-items-center gap-3" href="/admin/dashboard">
        <span style="width:40px;height:40px;border-radius:14px;background:linear-gradient(135deg,rgba(14,165,233,.22),rgba(103,232,249,.12));display:flex;align-items:center;justify-content:center;border:1px solid rgba(103,232,249,.18);">
          <i class="fas fa-shield-alt" style="font-size:1rem;color:#67e8f9;"></i>
        </span>
        <span>
          Cyber<span style="color:#67e8f9;">Report</span>
          <span class="badge ms-2" style="background:rgba(239,68,68,.16);color:#fecaca;border:1px solid rgba(239,68,68,.24);font-size:.62rem;vertical-align:middle;">ADMIN</span>
        </span>
      </a>
      <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#adminNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="adminNav">
        <ul class="navbar-nav me-auto gap-lg-1 mt-3 mt-lg-0">
          <li class="nav-item">
            <a class="nav-link ${currentPath === '/admin/dashboard' ? 'active' : ''}" href="/admin/dashboard">
              <i class="fas fa-chart-line me-2"></i>Tableau de bord
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link ${currentPath.startsWith('/admin/incidents') ? 'active' : ''}" href="/admin/incidents">
              <i class="fas fa-list-ul me-2"></i>Incidents
            </a>
          </li>
        </ul>
        <div class="d-flex flex-column flex-lg-row align-items-lg-center gap-3 mt-3 mt-lg-0">
          <a href="/" target="_blank" style="color:#aab6c7;font-size:.85rem;">
            <i class="fas fa-up-right-from-square me-2"></i>Voir le site public
          </a>
          <div class="d-flex align-items-center gap-2 px-3 py-2" style="background:rgba(255,255,255,.03);border:1px solid rgba(148,163,184,.12);border-radius:999px;">
            <div style="width:34px;height:34px;background:linear-gradient(135deg,#0ea5e9,#67e8f9);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#07111f;font-size:.82rem;font-weight:800;">
              ${adminNom.charAt(0).toUpperCase()}
            </div>
            <span style="color:#dbe7f5;font-size:.88rem;font-weight:600;">${adminNom}</span>
          </div>
          <a href="/admin/logout" class="btn btn-sm btn-cr-outline px-3">
            <i class="fas fa-sign-out-alt me-2"></i>Déconnexion
          </a>
        </div>
      </div>
    </div>
  </nav>`;

  const placeholder = document.getElementById('admin-navbar');
  if (placeholder) placeholder.innerHTML = navHtml;
}

document.addEventListener('DOMContentLoaded', initAdminNav);
