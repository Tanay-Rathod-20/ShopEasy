// server/controllers/orderController.js
// Handles checkout, order creation with database transactions, tracking, and order history

const db = require('../database/db');
const { formatINR, toRupees } = require('../utils/currency');

/**
 * Builds realistic tracking milestone steps based on order status and creation date
 */
function buildTrackingInfo(order) {
    const orderDate = new Date(order.created_at);
    
    // Calculate expected delivery date (3 days after order date)
    const expectedDelivery = new Date(orderDate);
    expectedDelivery.setDate(expectedDelivery.getDate() + 3);

    const formattedExpected = expectedDelivery.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const trackingNumber = `SE-DEMO-${(order.id * 18471 + 100000).toString()}`;
    const courierPartner = 'ShopEasy Logistics (Simulated Demo Carrier)';
    const status = order.status;

    // Strict 1-to-1 milestone mapping based on verified order status
    const steps = [
        {
            key: 'placed',
            title: 'Order Placed',
            desc: 'Order received and recorded in system.',
            timestamp: orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            completed: ['Placed', 'Shipped', 'Delivered'].includes(status),
            active: status === 'Placed'
        },
        {
            key: 'shipped',
            title: 'Shipped (In Transit)',
            desc: status === 'Placed' 
                ? 'Awaiting fulfillment & courier dispatch.' 
                : `Handed over to ${courierPartner}. Waybill #${trackingNumber}`,
            timestamp: ['Shipped', 'Delivered'].includes(status) ? 'Dispatched' : 'Pending dispatch',
            completed: ['Shipped', 'Delivered'].includes(status),
            active: status === 'Shipped'
        },
        {
            key: 'delivered',
            title: 'Delivered',
            desc: status === 'Delivered' 
                ? 'Package successfully handed over to customer.' 
                : `Estimated delivery by ${formattedExpected} (Demo estimate).`,
            timestamp: status === 'Delivered' ? 'Delivered' : formattedExpected,
            completed: status === 'Delivered',
            active: status === 'Delivered'
        }
    ];

    if (status === 'Cancelled') {
        steps.push({
            key: 'cancelled',
            title: 'Order Cancelled',
            desc: 'This order was marked as cancelled.',
            timestamp: 'Cancelled',
            completed: true,
            active: true
        });
    }

    return {
        tracking_number: trackingNumber,
        courier: courierPartner,
        estimated_delivery: formattedExpected,
        current_status: status,
        is_demo: true,
        steps
    };
}

/**
 * POST /api/orders
 * Places an order from current cart using an atomic SQLite transaction
 */
function createOrder(req, res, next) {
    try {
        const userId = req.user.id;
        const {
            customerName,
            customerPhone,
            shippingAddress,
            shippingCity,
            shippingPincode,
            paymentMethod: reqPaymentMethod = 'COD'
        } = req.body;

        // 1. Validate delivery information
        if (!customerName || !customerPhone || !shippingAddress || !shippingCity || !shippingPincode) {
            return res.status(400).json({
                success: false,
                message: 'All shipping fields (Name, Phone, Address, City, PIN code) are required.'
            });
        }

        const phoneRegex = /^[0-9+\-\s()]{8,15}$/;
        if (!phoneRegex.test(customerPhone.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid contact phone number.'
            });
        }

        const pincodeRegex = /^[0-9]{4,8}$/;
        if (!pincodeRegex.test(shippingPincode.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid postal/PIN code.'
            });
        }

        // 2. Validate Payment Method strictly (reject unsupported methods with 400)
        const validMethods = ['COD', 'UPI', 'CARD', 'NETBANKING'];
        const paymentMethod = typeof reqPaymentMethod === 'string' ? reqPaymentMethod.toUpperCase() : '';
        if (!validMethods.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: `Invalid payment method "${reqPaymentMethod}". Supported methods: ${validMethods.join(', ')}.`
            });
        }

        // 3. Fetch current cart items with fresh product data
        const cartItems = db.prepare(`
            SELECT c.id as cart_item_id, c.quantity,
                   p.id as product_id, p.name as product_name, p.price_paise, p.stock_quantity, p.is_active
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `).all(userId);

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your shopping cart is empty. Please add products before placing an order.'
            });
        }

        // 4. Verify stock for all items
        for (const item of cartItems) {
            if (item.is_active !== 1) {
                return res.status(400).json({
                    success: false,
                    message: `Product "${item.product_name}" is no longer available.`
                });
            }
            if (item.stock_quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for "${item.product_name}". Only ${item.stock_quantity} remaining, but your cart has ${item.quantity}.`
                });
            }
        }

        // 5. Calculate grand total safely on server
        let calculatedTotalPaise = 0;
        for (const item of cartItems) {
            calculatedTotalPaise += item.price_paise * item.quantity;
        }

        // 6. Generate unique human-readable order number (e.g. ORD-20261026-ABCD)
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const orderNumber = `ORD-${datePart}-${randomPart}`;

        // 7. Execute atomic SQLite transaction
        const placeOrderTransaction = db.transaction(() => {
            // A. Insert Order Record
            const insertOrder = db.prepare(`
                INSERT INTO orders (
                    order_number, user_id, total_paise, status, payment_method,
                    customer_name, customer_phone, shipping_address, shipping_city, shipping_pincode
                ) VALUES (?, ?, ?, 'Placed', ?, ?, ?, ?, ?, ?)
            `);
            const orderResult = insertOrder.run(
                orderNumber,
                userId,
                calculatedTotalPaise,
                paymentMethod,
                customerName.trim(),
                customerPhone.trim(),
                shippingAddress.trim(),
                shippingCity.trim(),
                shippingPincode.trim()
            );
            const orderId = orderResult.lastInsertRowid;

            // B. Insert Order Items and Decrement Product Stock
            const insertItem = db.prepare(`
                INSERT INTO order_items (order_id, product_id, product_name, unit_price_paise, quantity, subtotal_paise)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const decrementStock = db.prepare(`
                UPDATE products
                SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);

            for (const item of cartItems) {
                const subtotal = item.price_paise * item.quantity;
                insertItem.run(orderId, item.product_id, item.product_name, item.price_paise, item.quantity, subtotal);
                decrementStock.run(item.quantity, item.product_id);
            }

            // C. Clear Customer Cart
            db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);

            return {
                orderId,
                orderNumber,
                totalPaise: calculatedTotalPaise,
                createdAt: new Date().toISOString()
            };
        });

        const newOrder = placeOrderTransaction();
        const tracking = buildTrackingInfo({
            id: newOrder.orderId,
            status: 'Placed',
            created_at: newOrder.createdAt
        });

        let successMessage = 'Order placed successfully! Payment due upon doorstep delivery (Cash on Delivery).';
        if (paymentMethod !== 'COD') {
            successMessage = `Order placed successfully. Demo payment method (${paymentMethod}) selected — no real payment processed.`;
        }

        return res.status(201).json({
            success: true,
            message: successMessage,
            order: {
                id: newOrder.orderId,
                order_number: newOrder.orderNumber,
                total_paise: newOrder.totalPaise,
                total_rupees: toRupees(newOrder.totalPaise),
                formatted_total: formatINR(newOrder.totalPaise),
                status: 'Placed',
                payment_method: paymentMethod,
                is_demo_payment: paymentMethod !== 'COD',
                tracking
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/orders
 * Returns order history for the authenticated user with tracking details
 */
function getCustomerOrders(req, res, next) {
    try {
        const userId = req.user.id;

        const orders = db.prepare(`
            SELECT id, order_number, total_paise, status, payment_method,
                   customer_name, customer_phone, shipping_address, shipping_city, shipping_pincode,
                   created_at
            FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(userId);

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
                tracking: buildTrackingInfo(order),
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
 * GET /api/orders/:id
 * Returns a specific order details with full tracking
 */
function getOrderById(req, res, next) {
    try {
        const userId = req.user.id;
        const orderIdOrNum = req.params.id;

        const order = db.prepare(`
            SELECT id, order_number, user_id, total_paise, status, payment_method,
                   customer_name, customer_phone, shipping_address, shipping_city, shipping_pincode,
                   created_at
            FROM orders
            WHERE (id = ? OR order_number = ?)
        `).get(orderIdOrNum, orderIdOrNum);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.'
            });
        }

        // Verify ownership (unless admin)
        if (order.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have permission to view this order.'
            });
        }

        const items = db.prepare(`
            SELECT oi.id, oi.product_id, oi.product_name, oi.unit_price_paise, oi.quantity, oi.subtotal_paise,
                   p.image_url
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `).all(order.id);

        return res.status(200).json({
            success: true,
            order: {
                ...order,
                total_rupees: toRupees(order.total_paise),
                formatted_total: formatINR(order.total_paise),
                tracking: buildTrackingInfo(order),
                items: items.map(it => ({
                    ...it,
                    unit_price_rupees: toRupees(it.unit_price_paise),
                    formatted_unit_price: formatINR(it.unit_price_paise),
                    subtotal_rupees: toRupees(it.subtotal_paise),
                    formatted_subtotal: formatINR(it.subtotal_paise)
                }))
            }
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    createOrder,
    getCustomerOrders,
    getOrderById
};
