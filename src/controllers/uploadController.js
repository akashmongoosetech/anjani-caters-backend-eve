import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

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
