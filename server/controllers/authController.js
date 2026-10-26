// server/controllers/authController.js
// Handles user registration, login, and authentication state

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const config = require('../config');

// Helper to sign JWT
function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
}

/**
 * POST /api/auth/register
 */
function register(req, res, next) {
    try {
        const { name, email, password } = req.body;

        // Check if email already taken
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email address already exists.'
            });
        }

        // Hash password
        const passwordHash = bcrypt.hashSync(password, 10);

        // Security rule: Always enforce role = 'customer' on public registration
        const insertStmt = db.prepare(`
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, 'customer')
        `);
        const result = insertStmt.run(name, email, passwordHash);

        const newUser = {
            id: result.lastInsertRowid,
            name,
            email,
            role: 'customer'
        };

        const token = signToken(newUser);

        return res.status(201).json({
            success: true,
            message: 'Registration successful! Welcome to ShopEasy.',
            token,
            user: newUser
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/auth/login
 */
function login(req, res, next) {
    try {
        const { email, password } = req.body;

        const user = db.prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        const token = signToken(safeUser);

        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            token,
            user: safeUser
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/auth/me
 */
function getMe(req, res) {
    return res.status(200).json({
        success: true,
        user: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        }
    });
}

module.exports = {
    register,
    login,
    getMe
};
