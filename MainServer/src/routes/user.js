const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/authmiddleware');
const multer = require('multer');
const path = require('path');

// Configuração do multer para armazenamento em disco
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

router.post('/set-password/:code', UserController.setPassword);
router.post('/sign-file', authMiddleware, upload.single('file'), UserController.signFile);

// Rota para verificação de assinatura
router.post('/verify-signature', authMiddleware, upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), UserController.verifySignature);

module.exports = router; 