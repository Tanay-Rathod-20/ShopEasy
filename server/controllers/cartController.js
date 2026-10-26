// server/controllers/cartController.js
// Handles shopping cart CRUD with server-side stock validation and price calculations

const db = require('../database/db');
const { formatINR, toRupees } = require('../utils/currency');

/**
 * GET /api/cart
 * Returns all cart items for the authenticated user with line totals and grand total
 */
function getCart(req, res, next) {
    try {
        const userId = req.user.id;

        const items = db.prepare(`
            SELECT c.id as cart_item_id, c.quantity, c.created_at,
                   p.id as product_id, p.name as product_name, p.slug as product_slug,
                   p.price_paise, p.stock_quantity, p.image_url, p.is_active,
                   cat.name as category_name
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            JOIN categories cat ON p.category_id = cat.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `).all(userId);

        let grandTotalPaise = 0;
        let totalItems = 0;

        const formattedItems = items.map(item => {
            const lineTotalPaise = item.price_paise * item.quantity;
            grandTotalPaise += lineTotalPaise;
            totalItems += item.quantity;

            return {
                id: item.cart_item_id,
                product_id: item.product_id,
                name: item.product_name,
                slug: item.product_slug,
                image_url: item.image_url,
                category_name: item.category_name,
                unit_price_paise: item.price_paise,
                unit_price_rupees: toRupees(item.price_paise),
                formatted_unit_price: formatINR(item.price_paise),
                quantity: item.quantity,
                stock_quantity: item.stock_quantity,
                line_total_paise: lineTotalPaise,
                line_total_rupees: toRupees(lineTotalPaise),
                formatted_line_total: formatINR(lineTotalPaise),
                is_in_stock: item.stock_quantity >= item.quantity,
                is_active: item.is_active === 1
            };
        });

        return res.status(200).json({
            success: true,
            cart: {
                items: formattedItems,
                total_items: totalItems,
                grand_total_paise: grandTotalPaise,
                grand_total_rupees: toRupees(grandTotalPaise),
                formatted_grand_total: formatINR(grandTotalPaise)
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/cart
 * Adds or increments an item in the cart.
 * Enforces stock constraints.
 */
function addToCart(req, res, next) {
    try {
        const userId = req.user.id;
        const { productId, quantity = 1 } = req.body;
        const qty = parseInt(quantity, 10);

        if (!productId || isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid productId and positive quantity are required.'
            });
        }

        // 1. Check product existence, active status, and current stock
        const product = db.prepare('SELECT id, name, stock_quantity, is_active FROM products WHERE id = ?').get(productId);
        if (!product || product.is_active !== 1) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or is currently unavailable.'
            });
        }

        if (product.stock_quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: `Sorry, "${product.name}" is currently out of stock.`
            });
        }

        // 2. Check if product already in user's cart
        const existingCartItem = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId);
        const currentQty = existingCartItem ? existingCartItem.quantity : 0;
        const newTotalQty = currentQty + qty;

        if (newTotalQty > product.stock_quantity) {
            return res.status(400).json({
                success: false,
                message: `Cannot add ${qty} more. Available stock is ${product.stock_quantity} (you already have ${currentQty} in cart).`
            });
        }

        if (existingCartItem) {
            db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(newTotalQty, existingCartItem.id);
        } else {
            db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)')
                .run(userId, productId, qty);
        }

        return res.status(200).json({
            success: true,
            message: `"${product.name}" added to cart successfully!`
        });
    } catch (err) {
        next(err);
    }
}

/**
 * PUT /api/cart/:id
 * Updates quantity of a specific cart item
 */
function updateCartItem(req, res, next) {
    try {
        const userId = req.user.id;
        const cartItemId = parseInt(req.params.id, 10);
        const { quantity } = req.body;
        const newQty = parseInt(quantity, 10);

        if (isNaN(newQty)) {
            return res.status(400).json({
                success: false,
                message: 'A valid numeric quantity is required.'
            });
        }

        // Verify item ownership
        const item = db.prepare(`
            SELECT c.id, c.user_id, c.product_id, p.name, p.stock_quantity
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.id = ?
        `).get(cartItemId);

        if (!item || item.user_id !== userId) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found.'
            });
        }

        // If new quantity <= 0, remove item
        if (newQty <= 0) {
            db.prepare('DELETE FROM cart_items WHERE id = ?').run(cartItemId);
            return res.status(200).json({
                success: true,
                message: `Removed "${item.name}" from cart.`
            });
        }

        // Check stock availability
        if (newQty > item.stock_quantity) {
            return res.status(400).json({
                success: false,
                message: `Cannot set quantity to ${newQty}. Only ${item.stock_quantity} units available.`
            });
        }

        db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(newQty, cartItemId);

        return res.status(200).json({
            success: true,
            message: 'Cart quantity updated.'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/cart/:id
 * Removes a single item from the cart
 */
function removeCartItem(req, res, next) {
    try {
        const userId = req.user.id;
        const cartItemId = parseInt(req.params.id, 10);

        const result = db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(cartItemId, userId);
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cart item not found or already removed.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Item removed from cart.'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/cart
 * Clears the user's entire cart
 */
function clearCart(req, res, next) {
    try {
        const userId = req.user.id;
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
        return res.status(200).json({
            success: true,
            message: 'Shopping cart cleared.'
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart
};
