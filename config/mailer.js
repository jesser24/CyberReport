// config/mailer.js – Service d'envoi d'emails avec Nodemailer
const PDFDocument = require('pdfkit');
const config = require('./config');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return 'Non spécifiée';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getStatusLabel(statut) {
  const labels = {
    'Nouveau': 'Nouveau',
    'En cours': 'En cours de traitement',
    'En attente': 'En attente d’intervention',
    'Résolu': 'Résolu',
    'Fermé': 'Fermé'
  };
  return labels[statut] || statut || 'Inconnu';
}

function getStatusColor(statut) {
  const colors = {
    'Nouveau': '#0ea5e9',
    'En cours': '#8b5cf6',
    'En attente': '#f59e0b',
    'Résolu': '#22c55e',
    'Fermé': '#94a3b8'
  };
  return colors[statut] || '#0ea5e9';
}

const PUBLIC_TRACKING_URL = (process.env.PUBLIC_TRACKING_URL || 'https://www.cyberreport.fr/suivi').trim();

function hasEmailConfig() {
  return Boolean(config.EMAIL.apiKey && config.EMAIL.from && config.EMAIL.adminEmail);
}

async function verifyMailerConnection() {
  if (!config.EMAIL.apiKey) {
    console.warn('Emails désactivés : RESEND_API_KEY non configurée.');
    return false;
  }

  if (!config.EMAIL.from) {
    console.warn('Emails désactivés : EMAIL_FROM non configuré.');
    return false;
  }

  console.log('Service email prêt : Resend configuré.');
  return true;
}


function drawSectionTitle(doc, title) {
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(title);
  doc.moveDown(0.45);
}

function drawKeyValueRows(doc, rows) {
  rows.forEach(([label, value]) => {
    const startY = doc.y;
    doc.roundedRect(52, startY - 4, 492, 26, 8).fill('#f8fafc');
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9).text(label, 66, startY + 4, { width: 150 });
    doc.fillColor('#0f172a').font('Helvetica').fontSize(9.4).text(String(value ?? '—'), 196, startY + 4, { width: 324 });
    doc.moveDown(1.3);
  });
}

function buildIncidentPdfBuffer(incident) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const left = 52;
    const contentWidth = pageWidth - left * 2;
    const statusColor = getStatusColor(incident.statut);

    // Fond général
    doc.rect(0, 0, pageWidth, doc.page.height).fill('#f3f7fb');

    // Header
    doc.save();
    doc.rect(0, 0, pageWidth, 150).fill('#081120');
    doc.rect(0, 116, pageWidth, 34).fill(statusColor);
    doc.restore();

    doc.fillColor('#e2f3ff').font('Helvetica-Bold').fontSize(12)
      .text('CYBERREPORT', left, 32, { width: contentWidth, align: 'left' });
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24)
      .text("Confirmation de signalement d'incident", left, 54, { width: contentWidth });
    doc.fillColor('#d7e4f6').font('Helvetica').fontSize(10.5)
      .text('Récapitulatif officiel généré automatiquement pour le déclarant.', left, 88, { width: contentWidth });
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
      .text(`Statut actuel : ${getStatusLabel(incident.statut)}`, left, 123, { width: contentWidth });

    // Carte ticket
    doc.roundedRect(left, 170, contentWidth, 84, 18).fill('#ffffff');
    doc.roundedRect(left, 170, contentWidth, 84, 18).strokeColor('#d8e4f0').lineWidth(1).stroke();
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(9.5)
      .text('NUMÉRO DE TICKET', left + 20, 190);
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(24)
      .text(incident.ticket_number || '—', left + 20, 206);
    doc.roundedRect(left + 340, 190, 150, 42, 21).fill(statusColor);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10.5)
      .text(getStatusLabel(incident.statut), left + 340, 205, { width: 150, align: 'center' });

    // Intro
    doc.fillColor('#334155').font('Helvetica').fontSize(10.3)
      .text(
        'Merci pour votre déclaration. Ce document contient les informations principales de votre incident et peut être conservé pour le suivi de votre dossier.',
        left, 278, { width: contentWidth, lineGap: 3 }
      );

    doc.y = 332;
    drawSectionTitle(doc, 'Informations du déclarant');
    drawKeyValueRows(doc, [
      ['Nom complet', `${incident.prenom || ''} ${incident.nom || ''}`.trim() || 'Non renseigné'],
      ['Adresse email', incident.email || 'Non renseigné'],
      ['Téléphone', incident.telephone || 'Non renseigné'],
      ['Service', incident.service || 'Non renseigné']
    ]);

    doc.moveDown(0.25);
    drawSectionTitle(doc, 'Détails du ticket');
    drawKeyValueRows(doc, [
      ["Type d'incident", incident.type_incident || 'Non spécifié'],
      ['Niveau de gravité', incident.gravite || 'Non spécifié'],
      ['Appareil concerné', incident.appareil || 'Non spécifié'],
      ['Date de création', formatDate(incident.date_creation)],
      ['Dernière mise à jour', formatDate(incident.date_modification)]
    ]);

    doc.moveDown(0.25);
    drawSectionTitle(doc, 'Description transmise');
    const descY = doc.y;
    const descHeight = 92;
    doc.roundedRect(left, descY, contentWidth, descHeight, 14).fill('#ffffff');
    doc.roundedRect(left, descY, contentWidth, descHeight, 14).strokeColor('#d8e4f0').lineWidth(1).stroke();
    doc.fillColor('#0f172a').font('Helvetica').fontSize(10)
      .text(incident.description || 'Aucune description fournie.', left + 16, descY + 14, {
        width: contentWidth - 32,
        height: descHeight - 28,
        lineGap: 3
      });

    // Footer info card
    const footerY = 720;
    doc.roundedRect(left, footerY, contentWidth, 72, 16).fill('#eaf2fb');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10)
      .text('Suivi du ticket', left + 18, footerY + 16);
    doc.fillColor('#2563eb').font('Helvetica').fontSize(10)
      .text(PUBLIC_TRACKING_URL, left + 18, footerY + 32, { width: contentWidth - 36 });
    doc.fillColor('#64748b').font('Helvetica').fontSize(8.8)
      .text(
        'Document généré automatiquement par CyberReport. Merci de conserver ce PDF pour toute communication liée à votre incident.',
        left + 18, footerY + 48, { width: contentWidth - 36 }
      );

    doc.end();
  });
}

function renderInfoRows(rows) {
  return rows.map(([label, value]) => `
    <tr>
      <td style="padding:13px 14px;border-bottom:1px solid #e2e8f0;width:38%;font-weight:700;color:#334155;background:#f8fafc;">${escapeHtml(label)}</td>
      <td style="padding:13px 14px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${escapeHtml(value)}</td>
    </tr>
  `).join('');
}

function renderCallout({ tone = 'info', title, text }) {
  const tones = {
    info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
    success: { bg: '#ecfdf5', border: '#bbf7d0', color: '#15803d' },
    warning: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' }
  };
  const selected = tones[tone] || tones.info;
  return `
    <div style="padding:16px 18px;border-radius:16px;background:${selected.bg};border:1px solid ${selected.border};margin:0 0 18px;">
      <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${selected.color};margin-bottom:7px;">${escapeHtml(title)}</div>
      <div style="font-size:14px;line-height:1.7;color:#0f172a;">${escapeHtml(text)}</div>
    </div>
  `;
}

function renderLayout({ eyebrow, title, subtitle, accent = '#0ea5e9', bodyHtml, footer }) {
  return `<!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="color-scheme" content="light only">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#eef4fb;font-family:Arial,Helvetica,sans-serif;color:#334155;">
    <div style="max-width:700px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,.12);border:1px solid #dbe7f3;">
      <div style="padding:14px 32px;background:${accent};font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#ffffff;">CyberReport</div>
      <div style="padding:30px 32px;background:linear-gradient(135deg,#020817 0%,#0f172a 46%,${accent} 100%);color:#ffffff;">
        <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;opacity:.85;">${escapeHtml(eyebrow)}</div>
        <h1 style="margin:12px 0 8px;font-size:30px;line-height:1.18;">${escapeHtml(title)}</h1>
        <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(255,255,255,.88);">${escapeHtml(subtitle)}</p>
      </div>
      <div style="padding:30px 32px;">
        ${bodyHtml}
      </div>
      <div style="padding:18px 32px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.7;">
        ${footer || 'CyberReport · Notification automatique'}
      </div>
    </div>
  </body>
  </html>`;
}

async function sendMail(options) {
  if (!hasEmailConfig()) return false;

  const payload = {
    from: options.from || config.EMAIL.from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html
  };

  if (options.cc) payload.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
  if (options.bcc) payload.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
  if (options.reply_to) payload.reply_to = options.reply_to;

  if (Array.isArray(options.attachments) && options.attachments.length > 0) {
    payload.attachments = options.attachments.map((attachment) => ({
      filename: attachment.filename,
      content: Buffer.isBuffer(attachment.content)
        ? attachment.content.toString('base64')
        : Buffer.from(String(attachment.content ?? ''), 'utf8').toString('base64'),
      content_type: attachment.contentType || attachment.content_type || 'application/octet-stream'
    }));
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.EMAIL.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let details = '';
    try {
      const data = await response.json();
      details = data?.message || data?.name || JSON.stringify(data);
    } catch (_) {
      details = await response.text();
    }
    throw new Error(details || `Erreur HTTP ${response.status}`);
  }

  return true;
}

async function sendConfirmationEmail(incident) {
  const pdfBuffer = await buildIncidentPdfBuffer(incident);
  const html = renderLayout({
    eyebrow: 'Confirmation de ticket',
    title: 'Votre signalement a bien été enregistré',
    subtitle: 'Votre demande a été créée avec succès. Le récapitulatif PDF joint peut être conservé pour le suivi de votre dossier.',
    accent: '#0ea5e9',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Bonjour <strong>${escapeHtml(incident.prenom)} ${escapeHtml(incident.nom)}</strong>,</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.8;">Nous confirmons la bonne réception de votre déclaration d'incident. Votre ticket est désormais enregistré dans CyberReport et sera pris en charge par l'équipe compétente.</p>

      <div style="margin:22px 0;padding:22px;border-radius:20px;background:linear-gradient(135deg,#eff6ff,#f8fbff);border:1px solid #bfdbfe;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Numéro de ticket</div>
        <div style="margin-top:8px;font-size:30px;font-weight:800;letter-spacing:.04em;color:#0f172a;">${escapeHtml(incident.ticket_number)}</div>
        <div style="margin-top:12px;display:inline-block;background:${getStatusColor(incident.statut)};color:#ffffff;padding:9px 14px;border-radius:999px;font-size:12px;font-weight:800;">
          ${escapeHtml(getStatusLabel(incident.statut))}
        </div>
      </div>

      ${renderCallout({
        tone: 'info',
        title: 'Ce que vous recevez',
        text: 'Le PDF joint reprend les informations principales du ticket. Conservez-le avec le numéro de ticket pour faciliter vos échanges avec l’administration.'
      })}

      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin:0 0 18px;">
        ${renderInfoRows([
          ["Type d'incident", incident.type_incident],
          ['Gravité', incident.gravite],
          ['Appareil concerné', incident.appareil || 'Non spécifié'],
          ['Service', incident.service || 'Non spécifié'],
          ["Date d'enregistrement", formatDate(incident.date_creation)]
        ])}
      </table>

      <div style="padding:16px 18px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">Description transmise</div>
        <div style="font-size:14px;line-height:1.7;color:#0f172a;white-space:pre-wrap;">${escapeHtml(incident.description || 'Aucune description fournie.')}</div>
      </div>

      <a href="${PUBLIC_TRACKING_URL}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:800;">
        Suivre mon ticket
      </a>

      <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#64748b;">Cet email est envoyé automatiquement. En cas de besoin, utilisez le suivi en ligne avec votre numéro de ticket.</p>
    `,
    footer: 'CyberReport · Confirmation automatique · Merci de conserver ce message et le PDF joint pour le suivi de votre incident.'
  });

  try {
    await sendMail({
      from: config.EMAIL.from,
      to: incident.email,
      subject: `Confirmation de signalement – Ticket ${incident.ticket_number}`,
      html,
      attachments: [
        {
          filename: `${incident.ticket_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
    console.log(`Email de confirmation envoyé à ${incident.email}`);
  } catch (err) {
    console.error('Erreur envoi email confirmation:', err.message);
  }
}

async function sendAdminNotification(incident) {
  const html = renderLayout({
    eyebrow: 'Alerte administration',
    title: 'Un nouveau ticket nécessite une revue',
    subtitle: 'Un incident vient d’être soumis et peut être consulté immédiatement dans l’interface d’administration.',
    accent: '#f97316',
    bodyHtml: `
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
        <div style="padding:14px 16px;border-radius:16px;background:#fff7ed;border:1px solid #fed7aa;min-width:180px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#9a3412;font-weight:800;">Ticket</div>
          <div style="margin-top:6px;font-size:20px;font-weight:800;color:#7c2d12;">${escapeHtml(incident.ticket_number)}</div>
        </div>
        <div style="padding:14px 16px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;min-width:180px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;font-weight:800;">Gravité</div>
          <div style="margin-top:6px;font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(incident.gravite)}</div>
        </div>
      </div>

      ${renderCallout({
        tone: incident.gravite === 'Critique' || incident.gravite === 'Élevé' ? 'warning' : 'info',
        title: 'Action recommandée',
        text: 'Consultez le ticket dans le panneau d’administration afin de qualifier rapidement l’incident et mettre à jour son statut.'
      })}

      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin:0 0 18px;">
        ${renderInfoRows([
          ['Déclarant', `${incident.prenom} ${incident.nom}`],
          ['Email', incident.email],
          ['Téléphone', incident.telephone || 'Non renseigné'],
          ['Service', incident.service || 'Non renseigné'],
          ['Type', incident.type_incident],
          ['Statut', getStatusLabel(incident.statut)],
          ['Date', formatDate(incident.date_creation)]
        ])}
      </table>

      <div style="padding:16px 18px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">Description</div>
        <div style="font-size:14px;line-height:1.7;color:#0f172a;white-space:pre-wrap;">${escapeHtml(incident.description || 'Aucune description fournie.')}</div>
      </div>

      <a href="${config.APP_BASE_URL}/admin/incidents/${incident.id}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:800;">
        Ouvrir le ticket
      </a>
    `,
    footer: 'CyberReport · Notification interne administration'
  });

  try {
    await sendMail({
      from: config.EMAIL.from,
      to: config.EMAIL.adminEmail,
      subject: `[${incident.gravite}] Nouvel incident – ${incident.ticket_number}`,
      html
    });
    console.log('Notification admin envoyée');
  } catch (err) {
    console.error('Erreur envoi email admin:', err.message);
  }
}

async function sendStatusUpdateEmail(incident, previousStatus) {
  const statusColor = getStatusColor(incident.statut);
  const html = renderLayout({
    eyebrow: 'Mise à jour de ticket',
    title: 'Le statut de votre incident a évolué',
    subtitle: 'Votre dossier a été mis à jour par l’équipe de traitement. Voici les informations utiles pour suivre l’avancement.',
    accent: statusColor,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Bonjour <strong>${escapeHtml(incident.prenom)} ${escapeHtml(incident.nom)}</strong>,</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.8;">Le ticket <strong>${escapeHtml(incident.ticket_number)}</strong> a fait l’objet d’une mise à jour.</p>

      <div style="padding:22px;border-radius:20px;background:linear-gradient(135deg,#f8fafc,#ffffff);border:1px solid #e2e8f0;margin-bottom:18px;">
        <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Nouveau statut</div>
            <div style="margin-top:8px;display:inline-block;background:${statusColor};color:#fff;padding:10px 14px;border-radius:999px;font-size:14px;font-weight:800;">
              ${escapeHtml(getStatusLabel(incident.statut))}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Statut précédent</div>
            <div style="margin-top:8px;font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(getStatusLabel(previousStatus || 'Nouveau'))}</div>
          </div>
        </div>
      </div>

      ${renderCallout({
        tone: incident.statut === 'Résolu' || incident.statut === 'Fermé' ? 'success' : 'info',
        title: 'Information de suivi',
        text: incident.statut === 'Résolu'
          ? 'Votre incident a été marqué comme résolu. Vous pouvez conserver ce message comme confirmation de traitement.'
          : incident.statut === 'Fermé'
            ? 'Votre ticket a été clôturé. Le suivi reste accessible pour consultation si nécessaire.'
            : 'Votre ticket est toujours en cours de traitement. Vous pouvez consulter son évolution à tout moment via le suivi en ligne.'
      })}

      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin:0 0 18px;">
        ${renderInfoRows([
          ['Ticket', incident.ticket_number],
          ["Type d'incident", incident.type_incident],
          ['Gravité', incident.gravite],
          ['Dernière mise à jour', formatDate(incident.date_modification)]
        ])}
      </table>

      <a href="${PUBLIC_TRACKING_URL}" style="display:inline-block;background:linear-gradient(135deg,${statusColor},#0f172a);color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:800;">
        Consulter le suivi
      </a>
    `,
    footer: 'CyberReport · Notification automatique de changement de statut'
  });

  try {
    await sendMail({
      from: config.EMAIL.from,
      to: incident.email,
      subject: `Mise à jour du ticket ${incident.ticket_number} – ${getStatusLabel(incident.statut)}`,
      html
    });
    console.log(`Email de mise à jour envoyé à ${incident.email}`);
  } catch (err) {
    console.error('Erreur envoi email mise à jour:', err.message);
  }
}

module.exports = {
  sendConfirmationEmail,
  sendAdminNotification,
  sendStatusUpdateEmail,
  buildIncidentPdfBuffer,
  verifyMailerConnection
};
