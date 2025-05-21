const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/authmiddleware');
const multer = require('multer');

// Configuração do multer para armazenamento em memória
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // limite de 10MB por arquivo
    }
});

// Rotas de autenticação
router.post('/set-password/:code', UserController.setPassword);

// Rotas protegidas que requerem autenticação
router.post('/sign-file', authMiddleware, upload.single('file'), UserController.signFile);
router.post('/verify-signature', authMiddleware, upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), UserController.verifySignature);
router.post('/encrypt', authMiddleware, upload.single('file'), UserController.encryptFile);
router.post('/decrypt', authMiddleware, upload.single('file'), UserController.decryptFile);

module.exports = router; 