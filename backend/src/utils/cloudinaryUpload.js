const cloudinary = require('../config/cloudinary');

// upload a buffer directly to cloudinary — no temp files
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(buffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    console.log(`Cloudinary: deleted ${publicId}`);
  } catch (err) {
    console.log(`Cloudinary: failed to delete ${publicId}:`, err.message);
  }
};

module.exports = { uploadBufferToCloudinary, deleteFromCloudinary };
