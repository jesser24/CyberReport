const NAV_HTML = `
<nav class="navbar navbar-expand-lg navbar-dark sticky-top" style="background:rgba(7,17,31,.82);border-bottom:1px solid rgba(148,163,184,.12);">
  <div class="container py-2">
    <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="/">
      <span style="width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,rgba(14,165,233,.22),rgba(103,232,249,.12));display:flex;align-items:center;justify-content:center;border:1px solid rgba(103,232,249,.18);box-shadow:0 10px 24px rgba(14,165,233,.14);">
        <i class="fas fa-shield-alt" style="font-size:1rem;color:#67e8f9;"></i>
      </span>
      <span style="font-size:1.02rem;">Cyber<span style="color:#67e8f9;">Report</span></span>
    </a>
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navMenu">
      <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1 mt-3 mt-lg-0">
        <li class="nav-item"><a class="nav-link" href="/">Accueil</a></li>
        <li class="nav-item"><a class="nav-link" href="/a-propos">À propos</a></li>
        <li class="nav-item"><a class="nav-link" href="/faq">FAQ</a></li>
        <li class="nav-item"><a class="nav-link" href="/suivi">Suivi</a></li>
        <li class="nav-item ms-lg-2 mt-2 mt-lg-0">
          <a class="btn btn-cr-primary btn-sm px-3 py-2" href="/signaler">
            <i class="fas fa-plus-circle me-2"></i>Nouveau signalement
          </a>
        </li>
      </ul>
    </div>
  </div>
</nav>`;

const FOOTER_HTML = `
<footer class="py-5 mt-5">
  <div class="container">
    <div class="cr-card" style="background:linear-gradient(180deg,rgba(14,24,39,.86),rgba(8,15,26,.96));border-color:rgba(148,163,184,.12);">
      <div class="row g-4 align-items-center">
        <div class="col-lg-5">
          <div class="d-flex align-items-center gap-3 mb-3">
            <span style="width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,rgba(14,165,233,.24),rgba(103,232,249,.12));display:flex;align-items:center;justify-content:center;border:1px solid rgba(103,232,249,.18);">
              <i class="fas fa-shield-alt" style="color:#67e8f9;"></i>
            </span>
            <div>
              <div style="font-size:1.1rem;font-weight:700;color:#f8fbff;">CyberReport</div>
              <div style="font-size:.88rem;color:#aab6c7;">Plateforme de signalement d'incidents informatiques</div>
            </div>
          </div>
          <p class="mb-0" style="font-size:.92rem;">Une interface claire pour signaler, suivre et administrer les incidents de sécurité et les problèmes IT.</p>
        </div>
        <div class="col-md-6 col-lg-4">
          <div style="font-size:.85rem;color:#dbe7f5;font-weight:700;margin-bottom:.9rem;">Navigation rapide</div>
          <div class="d-flex flex-column gap-2">
            <a href="/">Accueil</a>
            <a href="/a-propos">À propos</a>
            <a href="/faq">FAQ</a>
            <a href="/suivi">Suivre un ticket</a>
          </div>
        </div>
        <div class="col-md-6 col-lg-3 text-md-end">
          <a href="/admin/login" class="btn btn-cr-outline px-4 mb-3">
            <i class="fas fa-lock me-2"></i>Espace admin
          </a>
          <div style="font-size:.78rem;color:#8391a6;">© 2026 CyberReport · Tous droits réservés</div>
        </div>
      </div>
    </div>
  </div>
</footer>`;

document.addEventListener('DOMContentLoaded', () => {
  const navEl = document.getElementById('navbar-placeholder');
  if (navEl) navEl.innerHTML = NAV_HTML;

  const footEl = document.getElementById('footer-placeholder');
  if (footEl) footEl.innerHTML = FOOTER_HTML;

  const current = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.navbar .nav-link').forEach(link => {
    const href = new URL(link.href).pathname.replace(/\/$/, '') || '/';
    if (href === current) link.classList.add('active');
  });
});
