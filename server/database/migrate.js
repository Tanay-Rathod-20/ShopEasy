// server/database/migrate.js
// Migrates orders table to support multiple payment methods: COD, UPI, CARD, NETBANKING

const db = require('./db');

function migrateOrdersTable() {
    console.log('[Migration] Updating orders table schema for payment methods...');

    db.pragma('foreign_keys = OFF');

    db.exec(`
        CREATE TABLE IF NOT EXISTS orders_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT NOT NULL UNIQUE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            total_paise INTEGER NOT NULL CHECK(total_paise >= 0),
            status TEXT NOT NULL DEFAULT 'Placed' CHECK(status IN ('Placed', 'Shipped', 'Delivered', 'Cancelled')),
            payment_method TEXT NOT NULL DEFAULT 'COD' CHECK(payment_method IN ('COD', 'UPI', 'CARD', 'NETBANKING')),
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            shipping_address TEXT NOT NULL,
            shipping_city TEXT NOT NULL,
            shipping_pincode TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO orders_new SELECT * FROM orders;
        DROP TABLE orders;
        ALTER TABLE orders_new RENAME TO orders;

        CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);

    db.pragma('foreign_keys = ON');
    console.log('[Migration] Orders table successfully migrated to support COD, UPI, CARD, and NETBANKING!');
}

if (require.main === module) {
    try {
        migrateOrdersTable();
        process.exit(0);
    } catch (e) {
        console.error('[Migration Error]:', e);
        process.exit(1);
    }
}

module.exports = migrateOrdersTable;
