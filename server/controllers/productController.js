// server/controllers/productController.js
// Handles product catalogue queries, search, filtering, and admin operations

const db = require('../database/db');
const { formatINR, toRupees, toPaise } = require('../utils/currency');

/**
 * GET /api/products
 * Query params: category (slug or id), search (string), page (number), limit (number)
 */
function getProducts(req, res, next) {
    try {
        const { category, search, page = 1, limit = 12 } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
        const offset = (pageNum - 1) * limitNum;

        let baseQuery = `
            SELECT p.id, p.category_id, p.name, p.slug, p.description, 
                   p.price_paise, p.stock_quantity, p.image_url, p.is_active, p.created_at,
                   c.name as category_name, c.slug as category_slug
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1
        `;
        let countQuery = `
            SELECT COUNT(*) as total
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1
        `;

        const params = [];
        const countParams = [];

        // Category filter
        if (category) {
            if (/^\d+$/.test(category)) {
                baseQuery += ` AND p.category_id = ?`;
                countQuery += ` AND p.category_id = ?`;
                params.push(parseInt(category, 10));
                countParams.push(parseInt(category, 10));
            } else {
                baseQuery += ` AND c.slug = ?`;
                countQuery += ` AND c.slug = ?`;
                params.push(category.toLowerCase());
                countParams.push(category.toLowerCase());
            }
        }

        // Search partial match on product name or description
        if (search && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`;
            baseQuery += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
            countQuery += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
            params.push(searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm);
        }

        // Ordering & Pagination
        baseQuery += ` ORDER BY p.id ASC LIMIT ? OFFSET ?`;
        params.push(limitNum, offset);

        const totalRow = db.prepare(countQuery).get(...countParams);
        const total = totalRow ? totalRow.total : 0;
        const products = db.prepare(baseQuery).all(...params);

        // Format monetary amounts for client display
        const formattedProducts = products.map(p => ({
            ...p,
            price_rupees: toRupees(p.price_paise),
            formatted_price: formatINR(p.price_paise),
            in_stock: p.stock_quantity > 0
        }));

        return res.status(200).json({
            success: true,
            products: formattedProducts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum) || 1
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/products/:id
 */
function getProductById(req, res, next) {
    try {
        const { id } = req.params;
        const query = `
            SELECT p.id, p.category_id, p.name, p.slug, p.description, 
                   p.price_paise, p.stock_quantity, p.image_url, p.is_active, p.created_at,
                   c.name as category_name, c.slug as category_slug
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? OR p.slug = ?
        `;
        const product = db.prepare(query).get(id, id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.'
            });
        }

        return res.status(200).json({
            success: true,
            product: {
                ...product,
                price_rupees: toRupees(product.price_paise),
                formatted_price: formatINR(product.price_paise),
                in_stock: product.stock_quantity > 0
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getProducts,
    getProductById
};
