# CyberReport

Plateforme de signalement d'incidents informatiques en Node.js / Express.

## Installation

```bash
npm install
npm start
```

## Identifiants admin par défaut

- Email : `admin@cyberreport.fr`
- Mot de passe : `Admin@1234`

## Configuration email

Pour activer l'envoi des emails automatiques, créez un fichier `.env` à partir de `.env.example` puis renseignez :

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ADMIN_EMAIL`
- `APP_BASE_URL`

### Emails envoyés automatiquement

- Email de confirmation lors de la création d'un ticket
- Pièce jointe PDF récapitulative du ticket
- Notification à l'administrateur lors d'un nouveau ticket
- Email au déclarant à chaque changement de statut du ticket


## Configuration email prête à l'emploi

Le projet contient un fichier `.env` d'exemple prêt pour une configuration Resend.

Notifications actives :
- email de confirmation au déclarant après création d'un ticket
- PDF récapitulatif du ticket en pièce jointe
- notification à l'administrateur pour chaque nouveau ticket
- email automatique au déclarant lors de chaque changement de statut

Statuts pris en charge : `Nouveau`, `En cours`, `En attente`, `Résolu`, `Fermé`.

Avant mise en production, pense à changer `SESSION_SECRET` et `APP_BASE_URL`.


## Configuration email

Le projet charge désormais automatiquement les variables du fichier `.env` grâce à `dotenv`.
Après installation, démarrez le projet avec `npm install` puis `npm start`.
Au démarrage, le serveur affiche `Service email prêt` si la configuration Resend est détectée.
