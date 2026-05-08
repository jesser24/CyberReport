-- Base de données CyberReport - MySQL 8+
CREATE DATABASE IF NOT EXISTS cyberreport CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cyberreport;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  role ENUM('admin','superadmin') NOT NULL DEFAULT 'admin',
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incidents (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commentaires (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id INT NOT NULL,
  admin_id INT NULL,
  commentaire TEXT NOT NULL,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comment_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_comment_incident (incident_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id INT NULL,
  admin_id INT NULL,
  action VARCHAR(80) NOT NULL,
  details TEXT NULL,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_audit_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
