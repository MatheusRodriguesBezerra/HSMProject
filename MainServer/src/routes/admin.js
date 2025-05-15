const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const authMiddleware = require('../middleware/authmiddleware');
const checkAdminRole = require('../middleware/checkRoles');

router.post('/create-user', authMiddleware, checkAdminRole, AdminController.createUser);
router.get('/get-users', authMiddleware, checkAdminRole, AdminController.getUsers);
router.get('/get-logs', authMiddleware, checkAdminRole, AdminController.getLogs);
router.delete('/delete-user/:id', authMiddleware, checkAdminRole, AdminController.deleteUser);
router.delete('/logs/clean', authMiddleware, checkAdminRole, AdminController.cleanLogs);

module.exports = router; 