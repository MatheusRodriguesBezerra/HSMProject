const express = require('express');
const router = express.Router();
const hsmController = require('../controllers/hsmController');

// Rota para obter status do HSM
router.get('/status', hsmController.getStatus);

// Rota para executar operações no HSM
router.post('/execute', hsmController.executeOperation);

module.exports = router; 