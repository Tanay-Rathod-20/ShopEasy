// server/app.js
// Express application setup and pipeline

const express = require('express');
const path = require('path');
const db = require('./database/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 1. Core Request Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Serve Static Frontend Files from "public"
app.use(express.static(path.join(__dirname, '../public')));

// 3. API Health Check Endpoint
app.get('/api/health', (req, res) => {
    try {
        // Simple fast query to verify database connection
        const dbCheck = db.prepare('SELECT 1 as alive').get();
        res.status(200).json({
            success: true,
            status: 'healthy',
            message: 'ShopEasy API server is running smoothly',
            database: dbCheck.alive === 1 ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            message: 'Database check failed',
            error: err.message
        });
    }
});

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// 4. Fallback for unhandled API routes (404 Not Found)
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint ${req.method} ${req.originalUrl} not found.`
    });
});

// 5. Centralized Error Handler (must be registered last)
app.use(errorHandler);

module.exports = app;
