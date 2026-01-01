import express from 'express';
import multer from 'multer';
import { analyzeImage } from '../controllers/aiController.js';

const router = express.Router();

// Multer storage setup
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Sahi Route:
router.post('/analyze', upload.single('image'), analyzeImage);

export default router;