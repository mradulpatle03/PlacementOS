const multer = require("multer");

// must come after the multer middleware in the route
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({
          success: false,
          message: "File too large. Maximum size is 5MB.",
        });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err && err.message === "Only PDF files are allowed") {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err && err.message === "Only image files are allowed") {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

module.exports = handleMulterError;
