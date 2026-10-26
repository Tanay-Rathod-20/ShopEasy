// server/config/index.js
// Centralized configuration loader using dotenv

const path = require('path');
const dotenv = require('dotenv');

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const KNOWN_INSECURE_SECRETS = [
    'dev_fallback_jwt_secret_key_change_in_production_12345',
    'shopeasy_super_secret_jwt_key_2026_change_in_production',
    'your_jwt_secret_key_minimum_32_characters_here',
    'secret',
    'jwt_secret',
    '12345678'
];

const KNOWN_DEFAULT_ADMIN_PASSWORDS = [
    'Admin@12345',
    'admin123',
    'password',
    'admin',
    '12345678'
];

const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    jwt: {
        secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_fallback_jwt_secret_key_change_in_production_12345'),
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    database: {
        path: process.env.DB_PATH || path.resolve(__dirname, '../database/shopeasy.db')
    },
    admin: {
        name: process.env.ADMIN_NAME || 'ShopEasy Admin',
        email: process.env.ADMIN_EMAIL || 'admin@shopeasy.com',
        password: process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Admin@12345')
    },

    /**
     * Validates configuration settings based on environment.
     * In production, strictly enforces strong secrets and rejects demo defaults.
     */
    validate() {
        const isProd = this.env === 'production';

        if (isProd) {
            // 1. JWT Secret Enforcement
            if (!this.jwt.secret || typeof this.jwt.secret !== 'string') {
                throw new Error('Production configuration error: JWT_SECRET environment variable is missing.');
            }
            if (this.jwt.secret.length < 32) {
                throw new Error('Production configuration error: JWT_SECRET must be at least 32 characters long in production mode.');
            }
            if (KNOWN_INSECURE_SECRETS.includes(this.jwt.secret)) {
                throw new Error('Production configuration error: JWT_SECRET cannot be a known default or demo placeholder in production mode.');
            }

            // 2. Admin Credentials Enforcement
            if (!this.admin.password || typeof this.admin.password !== 'string') {
                throw new Error('Production configuration error: ADMIN_PASSWORD environment variable is missing.');
            }
            if (KNOWN_DEFAULT_ADMIN_PASSWORDS.includes(this.admin.password)) {
                throw new Error('Production configuration error: ADMIN_PASSWORD cannot be a known demo password in production mode.');
            }
            if (this.admin.password.length < 10) {
                throw new Error('Production configuration error: ADMIN_PASSWORD must be at least 10 characters long in production mode.');
            }
            if (!this.admin.email || !this.admin.email.includes('@')) {
                throw new Error('Production configuration error: A valid ADMIN_EMAIL must be provided in production mode.');
            }
        } else {
            // Safe development checks
            if (!this.jwt.secret) {
                this.jwt.secret = 'dev_fallback_jwt_secret_key_change_in_production_12345';
            }
            if (!this.admin.password) {
                this.admin.password = 'Admin@12345';
            }
        }
        return true;
    }
};

module.exports = config;
