const ImageKit = require('imagekit');
const AppError = require('../utils/AppError');
const orphanedMediaModel = require('../models/orphanedMedia.model');

let imagekitInstance = null;

function getImageKit() {
  if (imagekitInstance) return imagekitInstance;

  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new AppError('Cloud media storage (ImageKit) is not configured on the server.', 503);
  }

  imagekitInstance = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });

  return imagekitInstance;
}

async function uploadFile(fileBuffer, fileName, folder = '/cravescroll/videos') {
  const ik = getImageKit();
  const result = await ik.upload({
    file: fileBuffer,
    fileName,
    folder,
  });
  return {
    url: result.url,
    fileId: result.fileId,
  };
}

async function deleteFile(fileId) {
  if (!fileId) return true;
  try {
    const ik = getImageKit();
    await ik.deleteFile(fileId);
    return true;
  } catch (err) {
    console.warn(`ImageKit deleteFile failed (${fileId}):`, err.message);
    return false;
  }
}

async function deleteFileOrTrackOrphan(fileId, mediaType = 'video', reason = 'Post-DB cleanup failed') {
  if (!fileId) return;
  const deleted = await deleteFile(fileId);
  if (!deleted) {
    try {
      await orphanedMediaModel.create({ fileId, mediaType, reason });
    } catch (logErr) {
      console.error('Failed to log orphaned media:', logErr.message);
    }
  }
}

module.exports = {
  uploadFile,
  deleteFile,
  deleteFileOrTrackOrphan,
};
