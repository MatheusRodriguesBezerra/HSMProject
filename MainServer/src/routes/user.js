const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');

router.post('/set-password/:code', UserController.setPassword);

module.exports = router; 