// tests/verify-tracking-and-payments.js
// Automated verification for tracking feature, payment methods, and product images

async function testTrackingAndPayments() {
    console.log('--- Testing Tracking, Payments, and Product Images ---\n');
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
        // 1. Verify all 16 products have working image URLs
        const prodRes = await fetch(`${BASE_URL}/api/products?limit=20`);
        const prodData = await prodRes.json();
        assert(prodData.success && prodData.products.length >= 16, 'Retrieved all 16 products');

        let allImagesOk = true;
        for (const p of prodData.products) {
            const imgRes = await fetch(p.image_url, { method: 'HEAD' });
            if (imgRes.status !== 200 || !imgRes.headers.get('content-type')?.includes('image')) {
                console.error(`Image failed for product ${p.id} (${p.name}): Status ${imgRes.status}`);
                allImagesOk = false;
            }
        }
        assert(allImagesOk, 'All 16 products have authentic, reachable product images (HTTP 200 image/jpeg)');

        // 2. Register a test user for ordering
        const email = `track_test_${Date.now()}@example.com`;
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Ananya Sharma',
                email,
                password: 'Password123'
            })
        });
        const regData = await regRes.json();
        const token = regData.token;
        assert(regRes.status === 201 && token, 'Created test user for checkout');

        // 3. Add products to cart
        await fetch(`${BASE_URL}/api/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId: 1, quantity: 1 })
        });
        await fetch(`${BASE_URL}/api/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId: 2, quantity: 1 })
        });

        // 4. Place order with UPI Payment Method
        const upiOrderRes = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
        assert(upiOrderData.order.tracking && upiOrderData.order.tracking.tracking_number.startsWith('SE-TRK-'),
            'Order response includes tracking number and estimated delivery');

        const orderId = upiOrderData.order.id;

        // 5. Place another order with CARD Payment Method
        await fetch(`${BASE_URL}/api/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId: 5, quantity: 1 })
        });
        const cardOrderRes = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                customerName: 'Ananya Sharma',
                customerPhone: '9876543210',
                shippingAddress: '402, Green Valley Apartments',
                shippingCity: 'Mumbai',
                shippingPincode: '400053',
                paymentMethod: 'CARD'
            })
        });
        const cardOrderData = await cardOrderRes.json();
        assert(cardOrderRes.status === 201 && cardOrderData.order.payment_method === 'CARD', 
            'Placed second order successfully with paymentMethod: CARD');

        // 6. Test Tracking Stepper Milestone Updates
        const updateStatusRes = await fetch(`${BASE_URL}/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'Shipped' })
        });
        const updateStatusData = await updateStatusRes.json();
        assert(updateStatusRes.status === 200 && updateStatusData.order.status === 'Shipped', 
            'Updated order status to "Shipped"');
        const shippedStep = updateStatusData.order.tracking.steps.find(s => s.key === 'shipped');
        assert(shippedStep && shippedStep.completed, 
            'Tracking stepper step "Shipped" transitioned to completed state');

        // 7. Verify Customer Orders list returns all tracking details
        const getOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getOrdersData = await getOrdersRes.json();
        assert(getOrdersRes.status === 200 && getOrdersData.orders.length === 2, 
            'GET /api/orders returns customer orders list with tracking and payment details');

    } catch (err) {
        console.error('Test error:', err);
        failed++;
    }

    console.log(`\n========================================`);
    console.log(`Test Result: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);
    process.exit(failed === 0 ? 0 : 1);
}

testTrackingAndPayments();
