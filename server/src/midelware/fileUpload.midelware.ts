import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Use process.cwd() so this file compiles under Jest (no import.meta). Server runs from server/ so public is cwd/public.
const UPLOAD_ROOT = process.cwd();

// A function to ensure that the folder exists
const ensureFolder = async (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      return true;
    }
    await fs.promises.mkdir(filePath, { recursive: true });
    return true;
  } catch (error: any) {
    throw new Error(`Error creating directory: ${error.message}`);
  }
};

// Multer function to store file in local server
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      // Resolve path relative to server root (two levels up from src/midelware)
      const folderExistPath = path.resolve(UPLOAD_ROOT, 'public');
      console.log('📁 Upload destination path:', folderExistPath);
      await ensureFolder(folderExistPath);
      cb(null, folderExistPath);
    } catch (error: any) {
      console.error('❌ Error setting upload destination:', error);
      cb(error, '');
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedFormats.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB of image size
});
