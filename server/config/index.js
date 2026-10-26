// server/config/index.js
// Centralized configuration loader using dotenv

const path = require('path');
const dotenv = require('dotenv');

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    jwt: {
        secret: process.env.JWT_SECRET || 'dev_fallback_jwt_secret_key_change_in_production_12345',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    database: {
        path: process.env.DB_PATH || path.resolve(__dirname, '../database/shopeasy.db')
    },
    admin: {
        name: process.env.ADMIN_NAME || 'ShopEasy Admin',
        email: process.env.ADMIN_EMAIL || 'admin@shopeasy.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@12345'
    }
};

module.exports = config;
