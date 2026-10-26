// server/controllers/categoryController.js
const db = require('../database/db');

function getCategories(req, res, next) {
    try {
        const categories = db.prepare(`
            SELECT c.id, c.name, c.slug, c.description,
                   COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
            GROUP BY c.id
            ORDER BY c.name ASC
        `).all();

        return res.status(200).json({
            success: true,
            categories
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getCategories
};
