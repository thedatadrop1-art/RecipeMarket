const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage so we can pipe to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// Upload a file buffer to Cloudinary
const uploadToCloudinary = (file, folder = 'general') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `recipemarket/${folder}`,
        transformation: [
          { width: 1200, height: 900, crop: 'limit', quality: 'auto:good', format: 'webp' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
};

// Delete an image from Cloudinary by URL
const deleteFromCloudinary = async (url) => {
  if (!url) return;
  const publicId = url.split('/').slice(-2).join('/').replace(/\.[^.]+$/, '');
  await cloudinary.uploader.destroy(`recipemarket/${publicId}`);
};

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary };
