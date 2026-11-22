const http = require('http');
const app = require('../src/app');

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
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
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
  console.log('[Test] Running Phase 3 Transactions & Categories verification tests...\n');

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
    // Helper to login
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

    // --- 1. Categories API ---
    const allCats = await makeRequest(server, { path: '/api/categories', headers: userHeaders });
    assert(allCats.status === 200, 'GET /api/categories returns 200');
    assert(Array.isArray(allCats.data.data) && allCats.data.data.length >= 10, 'Returns list of categories');

    const incomeCats = await makeRequest(server, { path: '/api/categories?type=income', headers: userHeaders });
    assert(
      incomeCats.status === 200 && incomeCats.data.data.every((c) => c.type === 'income'),
      'GET /api/categories?type=income filters only income categories'
    );

    const expenseCats = await makeRequest(server, { path: '/api/categories?type=expense', headers: userHeaders });
    assert(
      expenseCats.status === 200 && expenseCats.data.data.every((c) => c.type === 'expense'),
      'GET /api/categories?type=expense filters only expense categories'
    );

    const salaryCat = allCats.data.data.find((c) => c.name === 'Salary');
    const foodCat = allCats.data.data.find((c) => c.name === 'Food');

    // --- 2. Transactions Listing & Pagination ---
    const txList = await makeRequest(server, { path: '/api/transactions?page=1&limit=5', headers: userHeaders });
    assert(txList.status === 200, 'GET /api/transactions returns 200');
    assert(txList.data.data.length === 5, 'Pagination limit=5 returns 5 rows');
    assert(txList.data.pagination.total > 10, 'Pagination total reflects seeded count');
    assert(txList.data.data[0].category_name !== undefined, 'Row includes joined category_name');
    assert(
      txList.data.data.every((t) => t.user_id === user.user.id),
      'User only sees their own transactions'
    );

    // --- 3. Filtering & Search ---
    const searchRes = await makeRequest(server, { path: '/api/transactions?search=Salary', headers: userHeaders });
    assert(
      searchRes.status === 200 &&
        searchRes.data.data.every(
          (t) => t.description.toLowerCase().includes('salary') || t.category_name.toLowerCase().includes('salary')
        ),
      'Search ILIKE on description and category works'
    );

    const sortRes = await makeRequest(server, {
      path: '/api/transactions?sortBy=amount&sortOrder=desc&limit=5',
      headers: userHeaders,
    });
    const amounts = sortRes.data.data.map((t) => t.amount);
    const isSortedDesc = amounts.every((val, idx) => idx === 0 || amounts[idx - 1] >= val);
    assert(isSortedDesc, 'Sorting by amount DESC works');

    // --- 4. Create Transaction ---
    // Test Category type mismatch rejection
    const badCatRes = await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST', headers: userHeaders },
      {
        type: 'income',
        amount: 500,
        categoryId: foodCat.id, // food is expense!
        description: 'Mismatched Category test',
        transactionDate: '2026-11-01',
      }
    );
    assert(badCatRes.status === 400, 'POST /api/transactions with category type mismatch returns 400');

    // Valid create
    const createRes = await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST', headers: userHeaders },
      {
        type: 'expense',
        amount: 85.5,
        categoryId: foodCat.id,
        description: 'Team Dinner',
        transactionDate: '2026-11-20',
      }
    );
    assert(createRes.status === 201, 'POST /api/transactions returns 201 Created');
    assert(createRes.data.data.amount === 85.5, 'Created transaction has correct amount');
    assert(createRes.data.data.category_name === 'Food', 'Created transaction has category_name attached');
    const createdId = createRes.data.data.id;

    // --- 5. GET Single Transaction ---
    const getSingle = await makeRequest(server, {
      path: `/api/transactions/${createdId}`,
      headers: userHeaders,
    });
    assert(getSingle.status === 200, 'GET /api/transactions/:id returns 200 for owner');
    assert(getSingle.data.data.description === 'Team Dinner', 'Single transaction data is correct');

    // --- 6. PUT Update Transaction ---
    const updateRes = await makeRequest(
      server,
      { path: `/api/transactions/${createdId}`, method: 'PUT', headers: userHeaders },
      {
        amount: 99.0,
        description: 'Team Dinner (Updated)',
      }
    );
    assert(updateRes.status === 200, 'PUT /api/transactions/:id returns 200');
    assert(updateRes.data.data.amount === 99.0, 'Updated transaction amount changed');
    assert(updateRes.data.data.description === 'Team Dinner (Updated)', 'Updated description changed');

    // --- 7. DELETE Transaction ---
    const deleteRes = await makeRequest(server, {
      path: `/api/transactions/${createdId}`,
      method: 'DELETE',
      headers: userHeaders,
    });
    assert(deleteRes.status === 200, 'DELETE /api/transactions/:id returns 200');

    // Confirm it is gone
    const checkDeleted = await makeRequest(server, {
      path: `/api/transactions/${createdId}`,
      headers: userHeaders,
    });
    assert(checkDeleted.status === 404, 'Deleted transaction returns 404');

    // --- 8. RBAC: Read-Only Role Restrictions ---
    // Read-only can view list
    const roList = await makeRequest(server, { path: '/api/transactions', headers: readonlyHeaders });
    assert(roList.status === 200, 'Read-only user CAN GET /api/transactions (200)');

    // Read-only BLOCKED from create
    const roCreate = await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST', headers: readonlyHeaders },
      {
        type: 'income',
        amount: 100,
        categoryId: salaryCat.id,
        description: 'Blocked Create',
        transactionDate: '2026-11-20',
      }
    );
    assert(roCreate.status === 403, 'Read-only user gets 403 Forbidden on POST /api/transactions');

    // Read-only BLOCKED from update
    const roUpdate = await makeRequest(
      server,
      { path: '/api/transactions/1', method: 'PUT', headers: readonlyHeaders },
      { amount: 200 }
    );
    assert(roUpdate.status === 403, 'Read-only user gets 403 Forbidden on PUT /api/transactions/:id');

    // Read-only BLOCKED from delete
    const roDelete = await makeRequest(server, {
      path: '/api/transactions/1',
      method: 'DELETE',
      headers: readonlyHeaders,
    });
    assert(roDelete.status === 403, 'Read-only user gets 403 Forbidden on DELETE /api/transactions/:id');

    // --- 9. Data Isolation: User A cannot touch User B's transactions ---
    // Fetch a transaction owned by read-only user
    const roOwnTx = roList.data.data[0];
    assert(roOwnTx !== undefined, 'Found a transaction belonging to read-only user');

    // User attempts to view read-only user's transaction
    const breachView = await makeRequest(server, {
      path: `/api/transactions/${roOwnTx.id}`,
      headers: userHeaders,
    });
    assert(breachView.status === 404, 'User viewing another user transaction returns 404 (isolated)');

    // User attempts to update read-only user's transaction
    const breachUpdate = await makeRequest(
      server,
      { path: `/api/transactions/${roOwnTx.id}`, method: 'PUT', headers: userHeaders },
      { amount: 9999 }
    );
    assert(
      breachUpdate.status === 403 || breachUpdate.status === 404,
      'User updating another user transaction is rejected (403/404)'
    );

    // --- 10. Admin Access Privileges ---
    // Admin can view with ?all=true
    const adminAll = await makeRequest(server, {
      path: '/api/transactions?all=true&limit=10',
      headers: adminHeaders,
    });
    assert(adminAll.status === 200, 'Admin can query ?all=true');

    // Admin can view specific transaction belonging to read-only user
    const adminViewRo = await makeRequest(server, {
      path: `/api/transactions/${roOwnTx.id}`,
      headers: adminHeaders,
    });
    assert(adminViewRo.status === 200, 'Admin CAN view any user transaction');

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
