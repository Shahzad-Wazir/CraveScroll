const multer = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
];

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB max (safe for Render 512MB RAM)
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Unsupported video format. Please upload MP4, WebM, or MOV.', 400));
    }
  },
});

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Unsupported image format. Please upload JPG, PNG, or WebP.', 400));
    }
  },
});

module.exports = { uploadVideo, uploadImage };
