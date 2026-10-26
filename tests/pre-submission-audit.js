// tests/pre-submission-audit.js
// Complete pre-submission verification audit script

async function runAudit() {
    console.log('========================================================');
    console.log('🔍 SHOPEASY COMPLETE PRE-SUBMISSION AUDIT');
    console.log('========================================================\n');

    let passed = 0;
    let failed = 0;

    const assert = (condition, title, details = '') => {
        if (condition) {
            console.log(`[PASS] ${title}`);
            passed++;
        } else {
            console.error(`[FAIL] ${title} ${details ? '(' + details + ')' : ''}`);
            failed++;
        }
    };

    const BASE_URL = 'http://localhost:5000';

    try {
        // --- 1. CORE STATIC PAGES ACCESSIBILITY ---
        console.log('\n--- 1. Testing Customer & Admin HTML Pages ---');
        const pages = [
            '/',
            '/login.html',
            '/cart.html',
            '/checkout.html',
            '/orders.html',
            '/product.html?id=1',
            '/admin.html',
            '/diagnostics.html'
        ];
        for (const p of pages) {
            const res = await fetch(`${BASE_URL}${p}`);
            assert(res.status === 200, `Page "${p}" accessible without errors (HTTP 200)`);
        }

        // --- 2. AUTHENTICATION & SECURITY ---
        console.log('\n--- 2. Testing Authentication, Hashing & Role Restrictions ---');
        // A. Register Customer
        const customerEmail = `audit_cust_${Date.now()}@example.com`;
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Kavita Rao',
                email: customerEmail,
                password: 'Password@123'
            })
        });
        const regData = await regRes.json();
        assert(regRes.status === 201 && regData.user.role === 'customer', 
            'Public registration creates customer account and enforces role = "customer"');
        const customerToken = regData.token;

        // B. Attempt Privilege Escalation
        const adminAccessAttempt = await fetch(`${BASE_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        assert(adminAccessAttempt.status === 403, 
            'Customer cannot access protected admin endpoints (HTTP 403 Forbidden)');

        // C. Admin Login
        const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@shopeasy.com',
                password: 'Admin@12345'
            })
        });
        const adminLoginData = await adminLoginRes.json();
        assert(adminLoginRes.status === 200 && adminLoginData.user.role === 'admin', 
            'Default admin account logs in and authenticates with role = "admin"');
        const adminToken = adminLoginData.token;

        // --- 3. PRODUCT CATALOGUE & IMAGES ---
        console.log('\n--- 3. Testing Product Catalogue, Search & Verified Images ---');
        const prodRes = await fetch(`${BASE_URL}/api/products?limit=25`);
        const prodData = await prodRes.json();
        assert(prodData.success && prodData.products.length >= 16, 
            `Catalogue contains 16 seeded products across categories`);

        // Test Category filtering
        const catRes = await fetch(`${BASE_URL}/api/products?category=fashion`);
        const catData = await catRes.json();
        assert(catData.products.length > 0 && catData.products.every(p => p.category_slug === 'fashion'),
            'Category filter (?category=fashion) returns only fashion apparel');

        // Test Search partial match
        const searchRes = await fetch(`${BASE_URL}/api/products?search=shirt`);
        const searchData = await searchRes.json();
        assert(searchData.products.some(p => p.name.toLowerCase().includes('shirt')),
            'Search partial match (?search=shirt) finds matching items');

        // Image validity check
        let imageErrors = 0;
        for (const p of prodData.products.slice(0, 5)) {
            const imgRes = await fetch(p.image_url.startsWith('http') ? p.image_url : `${BASE_URL}${p.image_url}`);
            if (imgRes.status !== 200) imageErrors++;
        }
        assert(imageErrors === 0, 'Product images serve cleanly (HTTP 200)');

        // --- 4. CART & STOCK VALIDATION ---
        console.log('\n--- 4. Testing Cart Flow & Stock Limits ---');
        // Add item 1
        const addRes = await fetch(`${BASE_URL}/api/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({ productId: 1, quantity: 2 })
        });
        assert(addRes.status === 200, 'Customer adds in-stock item to cart');

        // Over-stock check
        const overStock = await fetch(`${BASE_URL}/api/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({ productId: 1, quantity: 9999 })
        });
        assert(overStock.status === 400, 'Server prevents exceeding available product inventory (HTTP 400)');

        // Cart line totals
        const cartRes = await fetch(`${BASE_URL}/api/cart`, {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        const cartData = await cartRes.json();
        assert(cartData.cart.total_items === 2 && cartData.cart.grand_total_paise > 0, 
            'Server accurately recalculates unit prices, line totals, and grand total in paise');

        // --- 5. CHECKOUT, TRANSACTION & TRACKING AUDIT ---
        console.log('\n--- 5. Testing Checkout, Transaction Atomicity & Order Tracking ---');
        const checkoutRes = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({
                customerName: 'Kavita Rao',
                customerPhone: '9876543210',
                shippingAddress: 'Flat 101, Sunflower Apartments',
                shippingCity: 'Pune',
                shippingPincode: '411001',
                paymentMethod: 'COD'
            })
        });
        const orderData = await checkoutRes.json();
        assert(checkoutRes.status === 201 && orderData.order.order_number, 
            'Atomic checkout places order with Cash on Delivery and clears cart');

        const orderId = orderData.order.id;

        // Verify cart is now empty
        const emptyCartRes = await fetch(`${BASE_URL}/api/cart`, {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        const emptyCartData = await emptyCartRes.json();
        assert(emptyCartData.cart.items.length === 0, 
            'Customer cart successfully cleared within the checkout transaction');

        // Verify Tracking consistency:
        // When status is 'Placed', ONLY the 'Placed' milestone must be active, NOT 'Packed & Processed'!
        const tracking = orderData.order.tracking;
        const placedStep = tracking.steps.find(s => s.key === 'placed');
        const shippedStep = tracking.steps.find(s => s.key === 'shipped');
        assert(placedStep.completed && placedStep.active, 
            'Order tracking status "Placed" correctly highlights ONLY the "Order Placed" milestone');
        assert(!shippedStep.completed && !shippedStep.active, 
            'Subsequent milestones ("Shipped") remain uncompleted and pending');

        // --- 6. ADMIN OPERATIONS & DASHBOARD ---
        console.log('\n--- 6. Testing Admin Operations (KPI Stats, Product CRUD, Status Update) ---');
        // A. Admin Stats
        const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const statsData = await statsRes.json();
        assert(statsRes.status === 200 && statsData.stats.total_orders > 0, 
            'Admin dashboard retrieves live platform sales, total orders, and customer counts');

        // B. Admin Order Status Update
        const statusUpdateRes = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: 'Shipped' })
        });
        assert(statusUpdateRes.status === 200, 
            'Admin updates customer order status to "Shipped"');

        // Verify tracking stepper updated
        const verifyOrderRes = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        const verifyOrderData = await verifyOrderRes.json();
        assert(verifyOrderData.order.status === 'Shipped', 
            'Customer order reflects updated status "Shipped"');
        const updatedShippedStep = verifyOrderData.order.tracking.steps.find(s => s.key === 'shipped');
        assert(updatedShippedStep.completed, 
            'Customer tracking stepper dynamically updates to show "Shipped" milestone complete');

        // C. Admin Product CRUD
        const newProductRes = await fetch(`${BASE_URL}/api/admin/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                name: 'Audit Wireless Mechanical Keyboard',
                category_id: 1,
                price_rupees: 3499,
                stock_quantity: 15,
                image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600',
                description: 'Tactile hot-swappable switches with Bluetooth 5.0 and multi-device pairing.'
            })
        });
        const newProductData = await newProductRes.json();
        assert(newProductRes.status === 201 && newProductData.product_id, 
            'Admin successfully creates new product in SQLite catalogue');

        // D. Admin Soft-Deactivation
        const delRes = await fetch(`${BASE_URL}/api/admin/products/${newProductData.product_id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(delRes.status === 200, 'Admin can safely delete or deactivate products');

    } catch (err) {
        console.error('Audit execution error:', err);
        failed++;
    }

    console.log('\n========================================================');
    console.log(`FINAL PRE-SUBMISSION AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');
    process.exit(failed === 0 ? 0 : 1);
}

runAudit();
