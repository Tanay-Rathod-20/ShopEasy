// server/controllers/adminController.js
// Protected administrator operations: dashboard statistics, product CRUD, category CRUD, order management

const db = require('../database/db');
const { formatINR, toRupees, toPaise } = require('../utils/currency');

/**
 * GET /api/admin/stats
 * Returns overview KPI numbers for the admin dashboard
 */
function getDashboardStats(req, res, next) {
    try {
        // Total revenue from non-cancelled orders
        const revenueRow = db.prepare(`
            SELECT COALESCE(SUM(total_paise), 0) as total_revenue
            FROM orders
            WHERE status != 'Cancelled'
        `).get();
        const totalRevenuePaise = revenueRow.total_revenue;

        // Total counts
        const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
        const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get().count;
        const customerCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get().count;

        // Orders by status breakdown
        const statusBreakdown = db.prepare(`
            SELECT status, COUNT(*) as count
            FROM orders
            GROUP BY status
        `).all();

        // Recent 5 orders
        const recentOrders = db.prepare(`
            SELECT id, order_number, customer_name, total_paise, status, payment_method, created_at
            FROM orders
            ORDER BY created_at DESC
            LIMIT 5
        `).all().map(o => ({
            ...o,
            total_rupees: toRupees(o.total_paise),
            formatted_total: formatINR(o.total_paise)
        }));

        return res.status(200).json({
            success: true,
            stats: {
                total_revenue_paise: totalRevenuePaise,
                total_revenue_rupees: toRupees(totalRevenuePaise),
                formatted_revenue: formatINR(totalRevenuePaise),
                total_orders: orderCount,
                total_products: productCount,
                total_customers: customerCount,
                status_breakdown: statusBreakdown,
                recent_orders: recentOrders
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/admin/orders
 * Returns all customer orders with item details and customer info
 */
function getAllOrders(req, res, next) {
    try {
        const { status } = req.query;

        let query = `
            SELECT o.id, o.order_number, o.user_id, o.total_paise, o.status, o.payment_method,
                   o.customer_name, o.customer_phone, o.shipping_address, o.shipping_city, o.shipping_pincode,
                   o.created_at, u.email as user_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
        `;
        const params = [];

        if (status) {
            query += ' WHERE o.status = ?';
            params.push(status);
        }

        query += ' ORDER BY o.created_at DESC';

        const orders = db.prepare(query).all(...params);

        const ordersWithItems = orders.map(order => {
            const items = db.prepare(`
                SELECT oi.id, oi.product_id, oi.product_name, oi.unit_price_paise, oi.quantity, oi.subtotal_paise,
                       p.image_url
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `).all(order.id);

            return {
                ...order,
                total_rupees: toRupees(order.total_paise),
                formatted_total: formatINR(order.total_paise),
                items: items.map(it => ({
                    ...it,
                    unit_price_rupees: toRupees(it.unit_price_paise),
                    formatted_unit_price: formatINR(it.unit_price_paise),
                    subtotal_rupees: toRupees(it.subtotal_paise),
                    formatted_subtotal: formatINR(it.subtotal_paise)
                }))
            };
        });

        return res.status(200).json({
            success: true,
            orders: ordersWithItems
        });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/admin/orders/:id/status
 * Updates status of any order
 */
function updateOrderStatus(req, res, next) {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        const validStatuses = ['Placed', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Valid values: ${validStatuses.join(', ')}`
            });
        }

        const result = db.prepare(`
            UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR order_number = ?
        `).run(status, orderId, orderId);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: `Order status updated to "${status}".`
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/admin/products
 * Returns all products (both active and inactive) for management
 */
function getAllProducts(req, res, next) {
    try {
        const products = db.prepare(`
            SELECT p.id, p.category_id, p.name, p.slug, p.description, 
                   p.price_paise, p.stock_quantity, p.image_url, p.is_active, p.created_at,
                   c.name as category_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            ORDER BY p.id DESC
        `).all();

        return res.status(200).json({
            success: true,
            products: products.map(p => ({
                ...p,
                price_rupees: toRupees(p.price_paise),
                formatted_price: formatINR(p.price_paise)
            }))
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/admin/products
 * Creates a new product
 */
function createProduct(req, res, next) {
    try {
        const { category_id, name, description, price_rupees, stock_quantity, image_url } = req.body;

        if (!category_id || !name || !description || price_rupees === undefined || stock_quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Category, product name, description, price, and stock are required.'
            });
        }

        const pricePaise = toPaise(price_rupees);
        const stockQty = parseInt(stock_quantity, 10);

        if (pricePaise < 0 || isNaN(stockQty) || stockQty < 0) {
            return res.status(400).json({
                success: false,
                message: 'Price and stock quantity must be non-negative values.'
            });
        }

        // Generate URL-safe slug
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);
        const imgUrl = image_url && image_url.trim() ? image_url.trim() : 'https://placehold.co/600x400?text=ShopEasy+Product';

        const insertStmt = db.prepare(`
            INSERT INTO products (category_id, name, slug, description, price_paise, stock_quantity, image_url, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `);
        const result = insertStmt.run(category_id, name.trim(), slug, description.trim(), pricePaise, stockQty, imgUrl);

        return res.status(201).json({
            success: true,
            message: 'Product created successfully.',
            product_id: result.lastInsertRowid
        });
    } catch (err) {
        next(err);
    }
}

/**
 * PUT /api/admin/products/:id
 * Updates an existing product
 */
function updateProduct(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const { category_id, name, description, price_rupees, stock_quantity, image_url, is_active } = req.body;

        const product = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.'
            });
        }

        const pricePaise = price_rupees !== undefined ? toPaise(price_rupees) : undefined;
        const stockQty = stock_quantity !== undefined ? parseInt(stock_quantity, 10) : undefined;
        const activeFlag = is_active !== undefined ? (is_active ? 1 : 0) : undefined;

        db.prepare(`
            UPDATE products
            SET category_id = COALESCE(?, category_id),
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                price_paise = COALESCE(?, price_paise),
                stock_quantity = COALESCE(?, stock_quantity),
                image_url = COALESCE(?, image_url),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(category_id, name, description, pricePaise, stockQty, image_url, activeFlag, id);

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully.'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/admin/products/:id
 * Soft deletes / deactivates product
 */
function deleteProduct(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);

        // Check if product is in any past orders
        const inOrders = db.prepare('SELECT COUNT(*) as count FROM order_items WHERE product_id = ?').get(id).count;

        if (inOrders > 0) {
            // Soft delete to protect referential integrity of historical orders
            db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
            return res.status(200).json({
                success: true,
                message: 'Product has past orders, so it was safely deactivated (hidden from catalogue).'
            });
        } else {
            db.prepare('DELETE FROM products WHERE id = ?').run(id);
            return res.status(200).json({
                success: true,
                message: 'Product deleted permanently.'
            });
        }
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/admin/categories
 * Creates a new category
 */
function createCategory(req, res, next) {
    try {
        const { name, description } = req.body;
        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Category name must be at least 2 characters long.'
            });
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const existing = db.prepare('SELECT id FROM categories WHERE slug = ? OR name = ?').get(slug, name.trim());
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A category with this name already exists.'
            });
        }

        const result = db.prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)')
            .run(name.trim(), slug, (description || '').trim());

        return res.status(201).json({
            success: true,
            message: 'Category created successfully.',
            category_id: result.lastInsertRowid
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getDashboardStats,
    getAllOrders,
    updateOrderStatus,
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory
};
