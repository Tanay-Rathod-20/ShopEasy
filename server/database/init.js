// server/database/init.js
// Database initialization and seeding script

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const config = require('../config');

function initDatabase() {
    console.log('[DB] Starting database initialization...');

    // 1. Run schema.sql to create tables and indexes
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
    console.log('[DB] Tables and indexes created successfully.');

    // 2. Run seed.sql to populate categories and products
    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    db.exec(seedSql);
    console.log('[DB] Categories and products seeded successfully.');

    // 3. Seed default Administrator account if not exists
    const checkAdmin = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(config.admin.email);
    if (!checkAdmin) {
        const saltRounds = 10;
        const passwordHash = bcrypt.hashSync(config.admin.password, saltRounds);
        
        const insertAdmin = db.prepare(`
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, 'admin')
        `);
        insertAdmin.run(config.admin.name, config.admin.email, passwordHash);
        console.log(`[DB] Default administrator created: ${config.admin.email}`);
    } else {
        console.log(`[DB] Administrator already exists: ${checkAdmin.email}`);
    }

    // 4. Print Summary Counts
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
    const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;

    console.log(`[DB] Initialization complete! Summary:`);
    console.log(`     - Users: ${userCount}`);
    console.log(`     - Categories: ${catCount}`);
    console.log(`     - Products: ${prodCount}`);
}

// Allow standalone execution: node server/database/init.js
if (require.main === module) {
    try {
        initDatabase();
        process.exit(0);
    } catch (err) {
        console.error('[DB] Error initializing database:', err);
        process.exit(1);
    }
}

module.exports = initDatabase;
