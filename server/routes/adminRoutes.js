// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes strictly require valid JWT authentication and role === 'admin'
router.use(authenticateToken, requireAdmin);

// Dashboard Overview
router.get('/stats', adminController.getDashboardStats);

// Orders Management
router.get('/orders', adminController.getAllOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

// Products Management
router.get('/products', adminController.getAllProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Categories Management
router.post('/categories', adminController.createCategory);

module.exports = router;
