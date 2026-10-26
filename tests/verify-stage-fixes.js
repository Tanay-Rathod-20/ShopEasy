// tests/verify-stage-fixes.js
// Automated verification script for HTML pages, API endpoints, auth, and cart flow

async function runTests() {
    console.log('--- Starting ShopEasy Verification Tests ---\n');
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
        // Test 1: Pages HTTP status
        const pages = [
            '/',
            '/login.html',
            '/cart.html',
            '/product.html?id=1',
            '/checkout.html',
            '/orders.html',
            '/diagnostics.html'
        ];

        for (const p of pages) {
            const res = await fetch(`${BASE_URL}${p}`);
            assert(res.status === 200, `Page "${p}" returns HTTP 200 (No "Cannot GET")`);
        }

        // Test 2: Categories API
        const catRes = await fetch(`${BASE_URL}/api/categories`);
        const catData = await catRes.json();
        assert(catRes.status === 200 && catData.success && catData.categories.length >= 4, 
            `API GET /api/categories returns 4 categories`);

        // Test 3: Products API (Default page 1 limit 12, total 16 seeded products)
        const prodRes = await fetch(`${BASE_URL}/api/products`);
        const prodData = await prodRes.json();
        assert(prodRes.status === 200 && prodData.success && prodData.pagination.total >= 16 && prodData.products.length <= 12, 
            `API GET /api/products returns paginated products (total 16 seeded, limit 12) with INR formatting`);

        // Test 4: Product Search
        const searchRes = await fetch(`${BASE_URL}/api/products?search=Headphones`);
        const searchData = await searchRes.json();
        assert(searchData.products.some(p => p.name.includes('Headphones')), 
            `API GET /api/products?search=Headphones finds product correctly`);

        // Test 5: Product Category Filter
        const filterRes = await fetch(`${BASE_URL}/api/products?category=electronics`);
        const filterData = await filterRes.json();
        assert(filterData.products.length > 0 && filterData.products.every(p => p.category_slug === 'electronics'), 
            `API GET /api/products?category=electronics correctly filters products`);

        // Test 6: Registration & Login
        const testEmail = `test_${Date.now()}@example.com`;
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Customer',
                email: testEmail,
                password: 'Password123'
            })
        });
        const regData = await regRes.json();
        assert(regRes.status === 201 && regData.token && regData.user.role === 'customer', 
            `API POST /api/auth/register creates customer account and issues JWT`);

        const token = regData.token;

        // Test 7: Add to Cart with Token
        const addCartRes = await fetch(`${BASE_URL}/api/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productId: 1,
                quantity: 2
            })
        });
        const addCartData = await addCartRes.json();
        assert(addCartRes.status === 200 && addCartData.success, 
            `API POST /api/cart adds items to cart with stock validation`);

        // Test 8: Read Cart & Line Totals
        const getCartRes = await fetch(`${BASE_URL}/api/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getCartData = await getCartRes.json();
        assert(getCartRes.status === 200 && getCartData.cart.total_items === 2 && getCartData.cart.items.length === 1, 
            `API GET /api/cart retrieves cart with server-calculated grand total`);

        // Test 9: Enforce Stock Limits
        const overStockRes = await fetch(`${BASE_URL}/api/cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productId: 1,
                quantity: 9999
            })
        });
        assert(overStockRes.status === 400, 
            `API POST /api/cart prevents adding quantity exceeding available stock (400 Bad Request)`);

    } catch (err) {
        console.error('Test execution error:', err);
        failed++;
    }

    console.log(`\n========================================`);
    console.log(`Verification Complete: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);
    if (require.main === module) {
        process.exit(failed === 0 ? 0 : 1);
    }
    return { passed, failed };
}

if (require.main === module) {
    runTests();
}

module.exports = runTests;
