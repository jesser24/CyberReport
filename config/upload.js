// config/upload.js – Configuration de Multer pour l'upload de fichiers
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Crée le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Stockage sur disque avec nom unique
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, 'incident-' + uniqueSuffix + ext);
  }
});

// Filtre sur le type MIME
const fileFilter = (req, file, cb) => {
  if (config.UPLOAD.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Formats acceptés : JPEG, PNG, GIF, PDF, TXT'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.UPLOAD.maxSize }
});

module.exports = upload;
