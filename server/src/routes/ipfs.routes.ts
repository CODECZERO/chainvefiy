import { Router } from 'express';
import { UploadFileOnIpfs } from '../controler/ipfs.controler.js';
import { upload } from '../midelware/fileUpload.midelware.js';

const router = Router();

// POST /api/ipfs/upload - Upload file to IPFS
router.post('/upload', upload.single('file'), UploadFileOnIpfs);

export default router;
