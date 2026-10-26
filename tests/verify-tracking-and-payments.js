// tests/verify-tracking-and-payments.js
// Automated verification for tracking feature, payment methods, authorization, and state transitions

async function testTrackingAndPayments() {
    console.log('--- Testing Tracking, Payments, Security, and State Transitions ---\n');
    let passed = 0;
    let failed = 0;

    const assert = (condition, desc) => {
        if (condition) {
            console.log(`[PASS] ${desc}`);
            passed++;
        } else {
            console.error(`[FAIL] ${desc}`);
            failed++;
        }
    };

    const BASE_URL = 'http://localhost:5000';

    try {
        // 1. Verify product catalogue and internal image paths (without relying on external network)
        const prodRes = await fetch(`${BASE_URL}/api/products?limit=20`);
        const prodData = await prodRes.json();
        assert(prodData.success && prodData.products.length >= 16, 'Retrieved all 16 seeded products');

        let localImagesOk = true;
        for (const p of prodData.products) {
            if (!p.image_url) {
                localImagesOk = false;
                break;
            }
            if (p.image_url.startsWith('/images/')) {
                const imgRes = await fetch(`${BASE_URL}${p.image_url}`, { method: 'HEAD' });
                if (imgRes.status !== 200) {
                    console.error(`Local image failed for product ${p.id}: Status ${imgRes.status}`);
                    localImagesOk = false;
                }
            }
        }
        assert(localImagesOk, 'All seeded products have valid image references and local images serve HTTP 200');

        // 2. Register first customer for ordering
        const email1 = `track_cust1_${Date.now()}@example.com`;
        const regRes1 = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Ananya Sharma',
                email: email1,
                password: 'Password123'
            })
        });
        const regData1 = await regRes1.json();
        const token1 = regData1.token;
        assert(regRes1.status === 201 && token1, 'Created customer 1 for checkout tests');

        // Register second customer for cross-customer authorization tests
        const email2 = `track_cust2_${Date.now()}@example.com`;
        const regRes2 = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Rohan Gupta',
                email: email2,
                password: 'Password123'
            })
        });
        const regData2 = await regRes2.json();
        const token2 = regData2.token;
        assert(regRes2.status === 201 && token2, 'Created customer 2 for cross-customer isolation tests');

        // Admin login
        const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@shopeasy.com',
                password: 'Admin@12345'
            })
        });
        const adminLoginData = await adminLoginRes.json();
        const adminToken = adminLoginData.token;
        assert(adminLoginRes.status === 200 && adminToken, 'Administrator logged in successfully');

        // 3. Test Invalid Payment Method Validation (Reject unsupported values with HTTP 400)
        await fetch(`${BASE_URL}/api/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token1}`
            },
            body: JSON.stringify({ productId: 1, quantity: 1 })
        });

        const invalidPaymentRes = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token1}`
            },
            body: JSON.stringify({
                customerName: 'Ananya Sharma',
                customerPhone: '9876543210',
                shippingAddress: '402, Green Valley Apartments',
                shippingCity: 'Mumbai',
                shippingPincode: '400053',
                paymentMethod: 'BITCOIN_UNSUPPORTED'
            })
        });
        assert(invalidPaymentRes.status === 400, 'Server rejects unsupported payment method with HTTP 400 Bad Request');

        // 4. Place valid order with UPI (Demo payment)
        const upiOrderRes = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token1}`
            },
            body: JSON.stringify({
                customerName: 'Ananya Sharma',
                customerPhone: '9876543210',
                shippingAddress: '402, Green Valley Apartments, Andheri West',
                shippingCity: 'Mumbai',
                shippingPincode: '400053',
                paymentMethod: 'UPI'
            })
        });
        const upiOrderData = await upiOrderRes.json();
        assert(upiOrderRes.status === 201 && upiOrderData.order.payment_method === 'UPI', 
            'Placed order successfully with paymentMethod: UPI');
        assert(upiOrderData.order.is_demo_payment === true,
            'Backend flags UPI order as simulated demo payment');
        assert(upiOrderData.order.tracking && upiOrderData.order.tracking.tracking_number.startsWith('SE-DEMO-'),
            'Order tracking number correctly uses SE-DEMO- prefix');

        const orderId = upiOrderData.order.id;

        // 5. Place another order with COD (Cash on Delivery)
        await fetch(`${BASE_URL}/api/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token1}`
            },
            body: JSON.stringify({ productId: 2, quantity: 1 })
        });
        const codOrderRes = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token1}`
            },
            body: JSON.stringify({
                customerName: 'Ananya Sharma',
                customerPhone: '9876543210',
                shippingAddress: '402, Green Valley Apartments',
                shippingCity: 'Mumbai',
                shippingPincode: '400053',
                paymentMethod: 'COD'
            })
        });
        const codOrderData = await codOrderRes.json();
        assert(codOrderRes.status === 201 && codOrderData.order.payment_method === 'COD', 
            'Placed second order successfully with paymentMethod: COD');
        assert(codOrderData.order.is_demo_payment === false,
            'COD order is not marked as demo payment (COD is fully functional)');

        // 6. Security Regression Tests: Order Authorization
        // A. Customer calling removed customer route PATCH /api/orders/:id/status
        const custRouteAttempt = await fetch(`${BASE_URL}/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token1}`
            },
            body: JSON.stringify({ status: 'Shipped' })
        });
        assert(custRouteAttempt.status === 404, 
            'Customer endpoint PATCH /api/orders/:id/status was completely removed (HTTP 404 Not Found)');

        // B. Customer calling admin endpoint PATCH /api/admin/orders/:id/status
        const adminRouteByCustAttempt = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token1}`
            },
            body: JSON.stringify({ status: 'Shipped' })
        });
        assert(adminRouteByCustAttempt.status === 403, 
            'Customer cannot update status via admin endpoint (HTTP 403 Forbidden)');

        // C. Customer 2 attempting to view Customer 1 order details
        const crossCustOrderAccess = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token2}` }
        });
        assert(crossCustOrderAccess.status === 403, 
            'Customer cannot view another customer’s order details (HTTP 403 Forbidden)');

        // D. Customer 2 attempting to update Customer 1 order status via admin endpoint
        const crossCustUpdateAdminAttempt = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token2}`
            },
            body: JSON.stringify({ status: 'Delivered' })
        });
        assert(crossCustUpdateAdminAttempt.status === 403,
            'Customer cannot update another customer’s order status via admin endpoint (HTTP 403 Forbidden)');

        // E. Customer 2 attempting to update Customer 1 order status via customer endpoint
        const crossCustUpdateCustAttempt = await fetch(`${BASE_URL}/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token2}`
            },
            body: JSON.stringify({ status: 'Delivered' })
        });
        assert(crossCustUpdateCustAttempt.status === 404,
            'Customer cannot update another customer’s order status via customer route (HTTP 404 Not Found)');

        // F. Unauthenticated request to admin endpoint
        const unauthStatusAttempt = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Shipped' })
        });
        assert(unauthStatusAttempt.status === 401, 
            'Unauthenticated request to admin status endpoint rejected (HTTP 401 Unauthorized)');

        // 7. Admin Status Updates & State Transition Machine Tests
        // A. Invalid status string
        const invalidStatusRes = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: 'REFUNDED_UNKNOWN' })
        });
        assert(invalidStatusRes.status === 400, 
            'Admin status update rejects unsupported status values with HTTP 400 Bad Request');

        // B. Nonexistent order
        const nonExistentOrderRes = await fetch(`${BASE_URL}/api/admin/orders/9999999/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: 'Shipped' })
        });
        assert(nonExistentOrderRes.status === 404, 
            'Admin status update returns HTTP 404 for nonexistent order');

        // C. Valid Transition: Placed -> Shipped
        const validShippedRes = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: 'Shipped' })
        });
        const validShippedData = await validShippedRes.json();
        assert(validShippedRes.status === 200 && validShippedData.order.status === 'Shipped', 
            'Admin successfully transitions order from "Placed" to "Shipped"');

        // Verify customer view of updated tracking stepper
        const custOrderView = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token1}` }
        });
        const custOrderData = await custOrderView.json();
        const shippedStep = custOrderData.order.tracking.steps.find(s => s.key === 'shipped');
        assert(shippedStep && shippedStep.completed, 
            'Customer tracking stepper accurately shows "Shipped" milestone completed');

        // D. Valid Transition: Shipped -> Delivered
        const validDeliveredRes = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: 'Delivered' })
        });
        assert(validDeliveredRes.status === 200, 
            'Admin transitions order from "Shipped" to "Delivered"');

        // E. Terminal Transition Rejection: Delivered -> Placed
        const invalidRevertRes = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: 'Placed' })
        });
        assert(invalidRevertRes.status === 400, 
            'Cannot revert order from terminal state "Delivered" back to "Placed" (HTTP 400 Bad Request)');

    } catch (err) {
        console.error('Test execution error:', err);
        failed++;
    }

    console.log(`\n========================================`);
    console.log(`Tracking & Security Result: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);
    if (require.main === module) {
        process.exit(failed === 0 ? 0 : 1);
    }
    return { passed, failed };
}

if (require.main === module) {
    testTrackingAndPayments();
}

module.exports = testTrackingAndPayments;
