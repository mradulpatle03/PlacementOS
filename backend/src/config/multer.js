const multer = require('multer');

const storage = multer.memoryStorage();

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'), false);
};

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const imageUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },  // 2MB for logos
});

module.exports = { upload, imageUpload };