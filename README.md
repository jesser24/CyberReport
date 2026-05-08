# CyberReport — Version entreprise / MySQL / Resend

CyberReport est une application de démonstration professionnelle pour la déclaration, le suivi et l'administration d'incidents informatiques en entreprise.

## Améliorations incluses

- Interface modernisée orientée entreprise : landing page, formulaires, dashboard admin, liste et détail incident.
- Espace admin plus complet : statistiques, graphiques Chart.js, filtres, recherche, tri, pagination, export Excel, détail complet, journal d'audit, modification et suppression.
- CRUD complet MySQL : création, consultation, modification, suppression.
- Base MySQL relationnelle : `admins`, `incidents`, `commentaires`, `audit_logs`.
- Commentaires administrateur envoyés automatiquement par email Resend à l'adresse du déclarant de l'incident.
- Emails Resend pour confirmation de ticket, notification admin, changement de statut et commentaire.
- Génération PDF du ticket pour le déclarant.

## Installation

```bash
npm install
```

Créer/importer la base :

```bash
mysql -u root -p < cyberreport.sql
```

Copier le fichier d'environnement :

```bash
copy .env.example .env
```

Puis modifier `.env` avec vos accès MySQL et Resend.

## Configuration Resend exemple

Pour Gmail, utilisez un mot de passe d'application Google, pas le mot de passe normal du compte.

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=CyberReport <onboarding@resend.dev>
REPLY_TO=votre_adresse@gmail.com
EMAIL_FROM="CyberReport <votre_adresse@gmail.com>"
ADMIN_EMAIL=admin@example.com
```

## Démarrage

```bash
npm start
```

Site public :

```txt
http://localhost:3000
```

Administration :

```txt
http://localhost:3000/admin/login
```

Compte admin par défaut :

```txt
Email : admin@cyberreport.fr
Mot de passe : Admin@1234
```

## Commentaires par email

Dans le détail d'un incident, l'administrateur peut écrire un commentaire. Lors de l'envoi :

1. le commentaire est enregistré en base dans la table `commentaires`,
2. le journal d'audit est mis à jour,
3. un email Resend est envoyé au déclarant de l'incident.

Si le commentaire s'enregistre mais que l'email ne part pas, vérifiez les variables Resend dans `.env`.


## Déploiement Render + Resend

Cette version utilise **Resend uniquement** pour les emails. Le service SMTP/Nodemailer a été retiré.

### Variables Render obligatoires

```env
NODE_ENV=production
PORT=3000
APP_BASE_URL=https://votre-domaine.onrender.com
SESSION_SECRET=change_me_long_random_secret
SESSION_FILE_PATH=/tmp/cyberreport-sessions.json

DB_HOST=votre-host-mysql
DB_PORT=3306
DB_USER=votre-user
DB_PASSWORD=votre-password
DB_NAME=cyberreport
DB_SSL=true
DB_CONNECTION_LIMIT=10

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=CyberReport <onboarding@resend.dev>
REPLY_TO=votre-email@gmail.com
ADMIN_EMAIL=votre-email@gmail.com
PUBLIC_TRACKING_URL=https://votre-domaine.onrender.com/suivi
```

Important : `DB_HOST` ne doit jamais être `localhost` sur Render. Il doit pointer vers une base MySQL en ligne.

### Correction Render

Les sessions sont stockées dans `/tmp/cyberreport-sessions.json`, un emplacement accessible en écriture sur Render. Aucun Render Disk n’est nécessaire pour démarrer.

### Emails

Au démarrage, les logs doivent afficher :

```txt
Service email sélectionné : Resend
Service email prêt : Resend configuré.
```

Si vous utilisez un domaine personnalisé dans `EMAIL_FROM`, le domaine doit être vérifié dans Resend. Pour tester rapidement, utilisez `CyberReport <onboarding@resend.dev>`.
