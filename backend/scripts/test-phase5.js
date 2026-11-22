const http = require('http');
const app = require('../src/app');
const { delByPattern } = require('../src/services/cache');

function makeRequest(server, options, postData) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const reqOptions = {
      hostname: 'localhost',
      port: address.port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = null;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data,
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  const server = app.listen(0);
  console.log('[Test] Running Phase 5 Analytics & Admin Users verification tests...\n');

  let passed = 0;
  let total = 0;

  function assert(condition, description) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
    }
  }

  try {
    async function login(email, password) {
      const res = await makeRequest(server, { path: '/api/auth/login', method: 'POST' }, { email, password });
      return { token: res.data.data.token, user: res.data.data.user };
    }

    const admin = await login('admin@demo.com', 'Demo@1234');
    const user = await login('user@demo.com', 'Demo@1234');
    const readonly = await login('readonly@demo.com', 'Demo@1234');

    const adminHeaders = { Authorization: `Bearer ${admin.token}` };
    const userHeaders = { Authorization: `Bearer ${user.token}` };
    const readonlyHeaders = { Authorization: `Bearer ${readonly.token}` };

    // --- 1. Analytics Endpoints for User ---
    await delByPattern('analytics:*');

    // GET summary
    const summary1 = await makeRequest(server, { path: '/api/analytics/summary', headers: userHeaders });
    assert(summary1.status === 200, 'GET /api/analytics/summary returns 200');
    assert(summary1.headers['x-cache'] === 'MISS', 'First summary request returns X-Cache: MISS');
    assert(typeof summary1.data.data.totalIncome === 'number', 'Summary contains totalIncome');
    assert(typeof summary1.data.data.totalExpense === 'number', 'Summary contains totalExpense');
    assert(typeof summary1.data.data.balance === 'number', 'Summary contains balance');
    assert(typeof summary1.data.data.savingsRate === 'number', 'Summary contains savingsRate');
    assert(typeof summary1.data.data.transactionCount === 'number', 'Summary contains transactionCount');
    assert(typeof summary1.data.data.averageExpense === 'number', 'Summary contains averageExpense');

    // GET summary cached hit
    const summary2 = await makeRequest(server, { path: '/api/analytics/summary', headers: userHeaders });
    assert(summary2.status === 200, 'Second summary request returns 200');
    assert(summary2.headers['x-cache'] === 'HIT', 'Second summary request returns X-Cache: HIT (cached 15 min)');

    // GET monthly
    const monthly = await makeRequest(server, { path: '/api/analytics/monthly', headers: userHeaders });
    assert(monthly.status === 200, 'GET /api/analytics/monthly returns 200');
    assert(Array.isArray(monthly.data.data) && monthly.data.data.length === 12, 'Monthly returns full 12 months array');
    assert(monthly.data.data[0].monthName !== undefined, 'Monthly data contains monthName');

    // GET yearly
    const yearly = await makeRequest(server, { path: '/api/analytics/yearly', headers: userHeaders });
    assert(yearly.status === 200, 'GET /api/analytics/yearly returns 200');
    assert(Array.isArray(yearly.data.data) && yearly.data.data.length >= 1, 'Yearly returns array of years');

    // GET category-breakdown
    const breakdown = await makeRequest(server, {
      path: '/api/analytics/category-breakdown?type=expense',
      headers: userHeaders,
    });
    assert(breakdown.status === 200, 'GET /api/analytics/category-breakdown returns 200');
    assert(Array.isArray(breakdown.data.data) && breakdown.data.data.length > 0, 'Breakdown returns category slices');
    assert(breakdown.data.data[0].percentage !== undefined, 'Breakdown items have calculated percentage');

    // GET trends
    const trends = await makeRequest(server, { path: '/api/analytics/trends?months=12', headers: userHeaders });
    assert(trends.status === 200, 'GET /api/analytics/trends returns 200');
    assert(Array.isArray(trends.data.data), 'Trends returns array for charts');

    // --- 2. Read-Only Role CAN use Analytics ---
    const roSummary = await makeRequest(server, { path: '/api/analytics/summary', headers: readonlyHeaders });
    assert(roSummary.status === 200, 'Read-only role CAN access GET /api/analytics/summary (200)');

    const roBreakdown = await makeRequest(server, {
      path: '/api/analytics/category-breakdown',
      headers: readonlyHeaders,
    });
    assert(roBreakdown.status === 200, 'Read-only role CAN access category-breakdown (200)');

    // --- 3. Admin Users API (RBAC & Management) ---
    // User getting /api/users -> 403 Forbidden
    const userAccessUsers = await makeRequest(server, { path: '/api/users', headers: userHeaders });
    assert(userAccessUsers.status === 403, 'Normal user accessing GET /api/users returns 403 Forbidden');

    // Read-only getting /api/users -> 403 Forbidden
    const roAccessUsers = await makeRequest(server, { path: '/api/users', headers: readonlyHeaders });
    assert(roAccessUsers.status === 403, 'Read-only accessing GET /api/users returns 403 Forbidden');

    // Admin getting /api/users -> 200 OK
    const adminUsers = await makeRequest(server, { path: '/api/users', headers: adminHeaders });
    assert(adminUsers.status === 200, 'Admin accessing GET /api/users returns 200 OK');
    assert(Array.isArray(adminUsers.data.data), 'Returns users array');
    assert(adminUsers.data.data[0].password_hash === undefined, 'Does NOT leak password_hash');
    assert(adminUsers.data.pagination.total >= 3, 'Pagination total returned correctly');

    // Admin GET /api/users/:id
    const targetUserId = user.user.id;
    const adminGetUser = await makeRequest(server, {
      path: `/api/users/${targetUserId}`,
      headers: adminHeaders,
    });
    assert(adminGetUser.status === 200, 'Admin can view user by ID');
    assert(adminGetUser.data.data.email === 'user@demo.com', 'Fetched user email matches');

    // Admin cannot demote self
    const demoteSelf = await makeRequest(
      server,
      { path: `/api/users/${admin.user.id}/role`, method: 'PATCH', headers: adminHeaders },
      { role: 'user' }
    );
    assert(demoteSelf.status === 400, 'Admin cannot demote own account (400 CANNOT_DEMOTE_SELF)');

    // Admin cannot delete self
    const deleteSelf = await makeRequest(
      server,
      { path: `/api/users/${admin.user.id}`, method: 'DELETE', headers: adminHeaders }
    );
    assert(deleteSelf.status === 400, 'Admin cannot delete own account (400 CANNOT_DELETE_SELF)');

    // Create a temporary user to test PATCH role and DELETE
    const tempEmail = `temp_${Date.now()}@test.com`;
    const regRes = await makeRequest(
      server,
      { path: '/api/auth/register', method: 'POST' },
      { name: 'Temp User', email: tempEmail, password: 'Password123' }
    );
    const tempUserId = regRes.data.data.user.id;

    // PATCH role of temp user
    const patchRole = await makeRequest(
      server,
      { path: `/api/users/${tempUserId}/role`, method: 'PATCH', headers: adminHeaders },
      { role: 'read-only' }
    );
    assert(patchRole.status === 200, 'Admin PATCH /api/users/:id/role returns 200');
    assert(patchRole.data.data.role === 'read-only', 'Role successfully updated to read-only');

    // DELETE temp user
    const delTemp = await makeRequest(
      server,
      { path: `/api/users/${tempUserId}`, method: 'DELETE', headers: adminHeaders }
    );
    assert(delTemp.status === 200, 'Admin DELETE /api/users/:id returns 200');

    // Verify temp user is deleted
    const checkDeletedUser = await makeRequest(server, {
      path: `/api/users/${tempUserId}`,
      headers: adminHeaders,
    });
    assert(checkDeletedUser.status === 404, 'Deleted user returns 404');

    // --- 4. Cache Metrics API ---
    // User accessing /api/metrics/cache -> 403
    const userMetrics = await makeRequest(server, { path: '/api/metrics/cache', headers: userHeaders });
    assert(userMetrics.status === 403, 'Normal user accessing GET /api/metrics/cache returns 403');

    // Admin accessing /api/metrics/cache -> 200
    const adminMetrics = await makeRequest(server, { path: '/api/metrics/cache', headers: adminHeaders });
    assert(adminMetrics.status === 200, 'Admin accessing GET /api/metrics/cache returns 200');
    assert(adminMetrics.data.data.hits !== undefined, 'Cache metrics contains hits');
    assert(adminMetrics.data.data.misses !== undefined, 'Cache metrics contains misses');
    assert(adminMetrics.data.data.hitRate !== undefined, 'Cache metrics contains hitRate');

    console.log(`\n[Test Summary]: ${passed}/${total} tests passed.\n`);

    if (passed !== total) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[Test Error]:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
