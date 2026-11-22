const http = require('http');
const app = require('../src/app');
const { getCache, setCache, getAnalyticsCacheKey, delByPattern, delCache } = require('../src/services/cache');
const redisClient = require('../src/db/redis');

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
  console.log('[Test] Running Phase 4 Redis Caching & Rate Limiting verification tests...\n');

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
    // Login to get token for categories
    const loginRes = await makeRequest(
      server,
      { path: '/api/auth/login', method: 'POST' },
      { email: 'user@demo.com', password: 'Demo@1234' }
    );
    const token = loginRes.data.data.token;
    const userHeaders = { Authorization: `Bearer ${token}` };

    // Flush categories cache in Redis before test
    await delByPattern('categories:*');

    // --- 1. Cache MISS on first request ---
    const req1 = await makeRequest(server, { path: '/api/categories', headers: userHeaders });
    assert(req1.status === 200, 'First GET /api/categories returns 200');
    assert(req1.headers['x-cache'] === 'MISS', 'First GET /api/categories returns X-Cache: MISS');

    // --- 2. Cache HIT on second request ---
    const req2 = await makeRequest(server, { path: '/api/categories', headers: userHeaders });
    assert(req2.status === 200, 'Second GET /api/categories returns 200');
    assert(req2.headers['x-cache'] === 'HIT', 'Second GET /api/categories returns X-Cache: HIT');
    assert(
      JSON.stringify(req1.data.data) === JSON.stringify(req2.data.data),
      'Cached categories data matches fresh database response'
    );

    // --- 3. Cache Metrics Counters in Redis ---
    const [hits, misses] = await Promise.all([
      redisClient.get('metrics:cache:hits'),
      redisClient.get('metrics:cache:misses'),
    ]);
    assert(parseInt(hits || '0', 10) >= 1, 'metrics:cache:hits incremented in Redis');
    assert(parseInt(misses || '0', 10) >= 1, 'metrics:cache:misses incremented in Redis');

    // --- 4. Analytics Cache Key Helper & Invalidation on Transaction Mutate ---
    const testUserId = 2; // user@demo.com
    const mockAnalyticsKey = getAnalyticsCacheKey(testUserId, 'summary', { year: 2026, month: 11 });
    await setCache(mockAnalyticsKey, { totalIncome: 5000, totalExpense: 2000 }, 900);
    const checkCachedBefore = await getCache(mockAnalyticsKey);
    assert(checkCachedBefore !== null, 'Mock analytics key successfully cached in Redis');

    // Create a transaction as user -> should invalidate analytics:{userId}:*
    const createTx = await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST', headers: userHeaders },
      {
        type: 'expense',
        amount: 45.0,
        categoryId: 4, // Food
        description: 'Cache Invalidation Probe',
        transactionDate: '2026-11-21',
      }
    );
    assert(createTx.status === 201, 'Created transaction successfully');

    // Check if mock analytics key was invalidated
    const checkCachedAfter = await getCache(mockAnalyticsKey);
    assert(checkCachedAfter === null, 'Cache invalidation: analytics cache for user was automatically cleared');

    // Clean up created transaction
    if (createTx.data && createTx.data.data && createTx.data.data.id) {
      await makeRequest(server, {
        path: `/api/transactions/${createTx.data.data.id}`,
        method: 'DELETE',
        headers: userHeaders,
      });
    }

    // --- 5. Rate Limiting on Auth Endpoints ---
    console.log('\n  [Rate Limiting Tests]');
    // Reset rate limit key in redis if any or test fresh email to simulate attempts
    let lastStatus = null;
    let got429 = false;

    // Send 6 rapid login requests
    for (let i = 1; i <= 6; i++) {
      const res = await makeRequest(
        server,
        { path: '/api/auth/login', method: 'POST' },
        { email: 'ratelimit@demo.com', password: 'WrongPassword' }
      );
      lastStatus = res.status;
      if (res.status === 429) {
        got429 = true;
        assert(res.data.error.code === 'TOO_MANY_REQUESTS', '429 error code is TOO_MANY_REQUESTS');
        assert(res.headers['ratelimit-remaining'] === '0' || res.headers['retry-after'] !== undefined, 'RateLimit headers present');
        break;
      }
    }
    assert(got429 === true, '6th request to /api/auth/login triggers HTTP 429 Too Many Requests');

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
