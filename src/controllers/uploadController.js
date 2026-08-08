import fs from 'fs';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

// Magic-byte signatures for the image formats we accept on public uploads.
const IMAGE_MAGIC_BYTES = [
  { name: 'JPEG', bytes: [0xFF, 0xD8, 0xFF] },
  { name: 'PNG', bytes: [0x89, 0x50, 0x4E, 0x47] },
  { name: 'GIF', bytes: [0x47, 0x49, 0x46, 0x38] },
  { name: 'WEBP', bytes: [0x52, 0x49, 0x46, 0x46] }
];

function isRealImage(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(16);
    fs.readSync(fd, header, 0, header.length, 0);
    fs.closeSync(fd);

    for (const sig of IMAGE_MAGIC_BYTES) {
      if (sig.bytes.every((b, i) => header[i] === b)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const uploadMedia = async (req, res, next) => {
  try {
    const file = req.file;
    const body = req.body;

    const sampleImage = 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80';
    const sampleVideo = 'https://assets.mixkit.co/videos/preview/mixkit-chef-cooking-food-in-a-kitchen-41584-large.mp4';

    let url = sampleImage;
    if (body.type === 'video' || (file && file.mimetype && file.mimetype.includes('video'))) {
      url = sampleVideo;
    }

    if (file) {
      url = `/uploads/${file.filename}`;
    } else if (body.url) {
      url = body.url;
    }

    return res.status(200).json(new ApiResponse(200, {
      url,
      filename: file ? file.originalname : 'uploaded-media',
      size: file ? file.size : 1024 * 500,
      mimetype: file ? file.mimetype : 'image/jpeg'
    }, 'File uploaded successfully'));
  } catch (error) {
    next(error);
  }
};

export const uploadPublicMedia = async (req, res, next) => {
  try {
    const file = req.file;

    if (!file) {
      return next(new ApiError(400, 'No file uploaded'));
    }

    if (!isRealImage(file.path)) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return next(new ApiError(400, 'Uploaded file is not a valid image.'));
    }

    const url = `/uploads/${file.filename}`;

    return res.status(200).json(new ApiResponse(200, {
      url,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }, 'File uploaded successfully'));
  } catch (error) {
    next(error);
  }
};
