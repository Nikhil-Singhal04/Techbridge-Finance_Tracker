/**
 * Backend Smoke Test Suite
 * Built with native Node.js fetch (no testing framework required).
 */

const app = require('../src/app');
const { delByPattern } = require('../src/services/cache');

async function runSmokeTests() {
  const server = app.listen(0);
  const { port } = server.address();
  const BASE_URL = `http://localhost:${port}/api`;

  console.log('='.repeat(65));
  console.log('       PERSONAL FINANCE TRACKER — BACKEND SMOKE TESTS');
  console.log('='.repeat(65));
  console.log(`Server listening on port ${port}\n`);

  let passed = 0;
  let total = 0;

  function report(passedCheck, testName, extra = '') {
    total++;
    if (passedCheck) {
      passed++;
      console.log(`  [PASS] ${testName}${extra ? ` — ${extra}` : ''}`);
    } else {
      console.log(`  [FAIL] ${testName}${extra ? ` — ${extra}` : ''}`);
    }
  }

  try {
    // 1. Health Check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    report(
      healthRes.status === 200 && healthJson.data?.db === 'connected' && healthJson.data?.redis === 'connected',
      'Health check endpoint (/api/health)',
      `DB: ${healthJson.data?.db}, Redis: ${healthJson.data?.redis}`
    );

    // 2. Swagger Docs Check
    const docsUiRes = await fetch(`${BASE_URL}/docs/`);
    report(docsUiRes.status === 200, 'Swagger UI available at /api/docs');

    const docsJsonRes = await fetch(`${BASE_URL}/docs.json`);
    const docsJson = await docsJsonRes.json();
    report(
      docsJsonRes.status === 200 && docsJson.openapi?.startsWith('3.'),
      'Swagger raw OpenAPI 3 spec available at /api/docs.json',
      `Title: "${docsJson.info?.title}" v${docsJson.info?.version}`
    );

    // 3. Login as Each Demo Role
    const roles = [
      { email: 'admin@demo.com', role: 'admin' },
      { email: 'user@demo.com', role: 'user' },
      { email: 'readonly@demo.com', role: 'read-only' },
    ];

    const tokens = {};

    for (const r of roles) {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: r.email, password: 'Demo@1234' }),
      });
      const data = await res.json();
      const ok = res.status === 200 && data.data?.user?.role === r.role && Boolean(data.data?.token);
      report(ok, `Demo user authentication (${r.email})`, `Role: ${data.data?.user?.role}`);
      if (ok) {
        tokens[r.role] = data.data.token;
      }
    }

    const adminHeaders = { Authorization: `Bearer ${tokens['admin']}` };
    const userHeaders = { Authorization: `Bearer ${tokens['user']}` };
    const readonlyHeaders = { Authorization: `Bearer ${tokens['read-only']}` };

    // 4. RBAC Check: Read-only blocked from writes (POST /api/transactions)
    const roWriteRes = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { ...readonlyHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'income',
        amount: 50,
        categoryId: 1,
        transactionDate: '2026-11-20',
      }),
    });
    report(
      roWriteRes.status === 403,
      'RBAC: Read-only user blocked from POST /api/transactions (403 Forbidden)',
      `Status: ${roWriteRes.status}`
    );

    // 5. RBAC Check: Standard user blocked from admin endpoints (GET /api/users)
    const userAdminRes = await fetch(`${BASE_URL}/users`, { headers: userHeaders });
    report(
      userAdminRes.status === 403,
      'RBAC: Standard user blocked from GET /api/users (403 Forbidden)',
      `Status: ${userAdminRes.status}`
    );

    // 6. RBAC Check: Admin allowed access to GET /api/users
    const adminUsersRes = await fetch(`${BASE_URL}/users`, { headers: adminHeaders });
    const adminUsersJson = await adminUsersRes.json();
    report(
      adminUsersRes.status === 200 && Array.isArray(adminUsersJson.data),
      'RBAC: Admin granted access to GET /api/users (200 OK)',
      `Returned ${adminUsersJson.data?.length} users`
    );

    // 7. Pagination & Joined Category on Transactions
    const txRes = await fetch(`${BASE_URL}/transactions?page=1&limit=5`, { headers: userHeaders });
    const txJson = await txRes.json();
    const hasPagination =
      txRes.status === 200 &&
      txJson.pagination?.page === 1 &&
      txJson.pagination?.limit === 5 &&
      txJson.pagination?.total > 0 &&
      txJson.data?.length === 5 &&
      Boolean(txJson.data[0]?.category_name);

    report(
      hasPagination,
      'Transactions pagination & category join (/api/transactions?page=1&limit=5)',
      `Limit: 5, Total: ${txJson.pagination?.total}, Category: "${txJson.data?.[0]?.category_name}"`
    );

    // 8. Redis Caching: X-Cache MISS -> HIT on /api/categories
    await delByPattern('categories:*');

    const cache1 = await fetch(`${BASE_URL}/categories`, { headers: userHeaders });
    const cacheHeader1 = cache1.headers.get('x-cache');

    const cache2 = await fetch(`${BASE_URL}/categories`, { headers: userHeaders });
    const cacheHeader2 = cache2.headers.get('x-cache');

    report(
      cacheHeader1 === 'MISS' && cacheHeader2 === 'HIT',
      'Redis Caching: First request MISS -> Second request HIT (/api/categories)',
      `1st: X-Cache: ${cacheHeader1}, 2nd: X-Cache: ${cacheHeader2}`
    );

    // 9. Analytics Access (Read-Only User)
    const analyticsRes = await fetch(`${BASE_URL}/analytics/summary`, { headers: readonlyHeaders });
    const analyticsJson = await analyticsRes.json();
    report(
      analyticsRes.status === 200 && analyticsJson.data?.totalIncome !== undefined,
      'Analytics access for Read-Only role (/api/analytics/summary)',
      `Total Income: $${analyticsJson.data?.totalIncome}, Total Expense: $${analyticsJson.data?.totalExpense}`
    );

    console.log('\n' + '-'.repeat(65));
    console.log(`SMOKE TEST RESULTS: ${passed}/${total} CHECKS PASSED (${((passed / total) * 100).toFixed(0)}%)`);
    console.log('-'.repeat(65) + '\n');

    if (passed !== total) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[Smoke Test Error]:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runSmokeTests();
