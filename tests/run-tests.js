// tests/run-tests.js
// Master test runner executing all ShopEasy test suites sequentially

const config = require('../server/config');
const runStageTests = require('./verify-stage-fixes');
const runTrackingTests = require('./verify-tracking-and-payments');
const runAudit = require('./pre-submission-audit');

async function testConfigValidation() {
    console.log('========================================================');
    console.log('🔒 UNIT TEST: Production Configuration Validation');
    console.log('========================================================\n');
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

    // 1. Verify development mode permits development defaults
    try {
        const devConfig = {
            env: 'development',
            jwt: { secret: 'dev_fallback_jwt_secret_key_change_in_production_12345' },
            admin: { email: 'admin@shopeasy.com', password: 'Admin@12345' },
            validate: config.validate
        };
        devConfig.validate();
        assert(true, 'Development mode successfully allows local fallback credentials');
    } catch (err) {
        assert(false, `Development mode threw unexpected error: ${err.message}`);
    }

    // 2. Verify production mode rejects missing JWT_SECRET
    try {
        const prodConfigMissingJwt = {
            env: 'production',
            jwt: { secret: '' },
            admin: { email: 'admin@prod.com', password: 'StrongProdPassword!123' },
            validate: config.validate
        };
        prodConfigMissingJwt.validate();
        assert(false, 'Production mode should reject missing JWT_SECRET');
    } catch (err) {
        assert(err.message.includes('JWT_SECRET'), 'Production mode correctly rejects missing JWT_SECRET');
    }

    // 3. Verify production mode rejects short / insecure JWT_SECRET (<32 chars)
    try {
        const prodConfigShortJwt = {
            env: 'production',
            jwt: { secret: 'short_secret' },
            admin: { email: 'admin@prod.com', password: 'StrongProdPassword!123' },
            validate: config.validate
        };
        prodConfigShortJwt.validate();
        assert(false, 'Production mode should reject short JWT_SECRET');
    } catch (err) {
        assert(err.message.includes('32 characters'), 'Production mode correctly rejects short JWT_SECRET (<32 chars)');
    }

    // 4. Verify production mode rejects default demo admin credentials
    try {
        const prodConfigDefaultAdmin = {
            env: 'production',
            jwt: { secret: 'a_very_long_cryptographically_secure_random_jwt_secret_key_2026' },
            admin: { email: 'admin@shopeasy.com', password: 'Admin@12345' },
            validate: config.validate
        };
        prodConfigDefaultAdmin.validate();
        assert(false, 'Production mode should reject default demo admin password');
    } catch (err) {
        assert(err.message.includes('known demo password'), 'Production mode correctly rejects known demo admin credentials');
    }

    // 5. Verify production mode succeeds with strong secrets
    try {
        const prodConfigValid = {
            env: 'production',
            jwt: { secret: 'a_very_long_cryptographically_secure_random_jwt_secret_key_2026' },
            admin: { email: 'admin@realprod.com', password: 'StrongProductionAdminPassword2026!#' },
            validate: config.validate
        };
        prodConfigValid.validate();
        assert(true, 'Production mode succeeds when strong custom secrets are provided');
    } catch (err) {
        assert(false, `Production mode failed unexpectedly: ${err.message}`);
    }

    return { passed, failed };
}

async function isServerRunning(url) {
    try {
        const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) });
        return res.ok;
    } catch {
        return false;
    }
}

async function runAllSuites() {
    console.log('========================================================');
    console.log('🚀 SHOPEASY UNIFIED AUTOMATED TEST RUNNER');
    console.log('========================================================\n');

    let totalPassed = 0;
    let totalFailed = 0;

    // Suite 1: Config & Security Unit Tests
    const configResult = await testConfigValidation();
    totalPassed += configResult.passed;
    totalFailed += configResult.failed;

    const baseUrl = `http://localhost:${config.port}`;
    let temporaryServer = null;

    // Check if server is already running, otherwise launch it
    const running = await isServerRunning(baseUrl);
    if (!running) {
        console.log(`\n[Test Runner] Server not detected at ${baseUrl}. Initializing database and starting test server...`);
        const initDatabase = require('../server/database/init');
        initDatabase();

        const app = require('../server/app');
        await new Promise((resolve, reject) => {
            temporaryServer = app.listen(config.port, () => {
                console.log(`[Test Runner] Test server listening on ${baseUrl}\n`);
                resolve();
            });
            temporaryServer.on('error', reject);
        });
    } else {
        console.log(`\n[Test Runner] Connected to existing server at ${baseUrl}\n`);
    }

    try {
        // Suite 2: Core Storefront & Cart Verification
        console.log('\n');
        const stageResult = await runStageTests();
        totalPassed += stageResult.passed;
        totalFailed += stageResult.failed;

        // Suite 3: Tracking, Payment Methods & Authorization Regression
        console.log('\n');
        const trackingResult = await runTrackingTests();
        totalPassed += trackingResult.passed;
        totalFailed += trackingResult.failed;

        // Suite 4: Pre-Submission Audit
        console.log('\n');
        const auditResult = await runAudit();
        totalPassed += auditResult.passed;
        totalFailed += auditResult.failed;
    } finally {
        if (temporaryServer) {
            await new Promise((resolve) => temporaryServer.close(resolve));
            console.log('\n[Test Runner] Temporary test server closed cleanly.');
        }
    }

    console.log('\n========================================================');
    console.log(`TOTAL TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`);
    console.log('========================================================');

    if (totalFailed > 0) {
        console.error(`❌ One or more tests failed. Exiting with status code 1.`);
        process.exit(1);
    } else {
        console.log(`✅ All test suites executed and passed successfully!`);
        process.exit(0);
    }
}

runAllSuites();

