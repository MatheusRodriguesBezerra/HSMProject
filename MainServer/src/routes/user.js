const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/authmiddleware');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

router.post('/set-password/:code', UserController.setPassword);
router.post('/sign-file', authMiddleware, upload.single('file'), UserController.signFile);


module.exports = router; 