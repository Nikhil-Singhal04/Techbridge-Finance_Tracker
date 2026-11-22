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
  console.log('[Test] Running Phase 2 Auth & RBAC verification tests...\n');

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
    // 1. Register a new user
    const uniqueEmail = `testuser_${Date.now()}@test.com`;
    const regRes = await makeRequest(
      server,
      { path: '/api/auth/register', method: 'POST' },
      { name: '<b>Test User</b><script>alert(1)</script>', email: uniqueEmail, password: 'Password123' }
    );
    assert(regRes.status === 201, 'POST /api/auth/register returns 201 Created');
    assert(regRes.data.success === true, 'Registration response success is true');
    assert(regRes.data.data.user.role === 'user', 'New user role is forced to "user"');
    assert(!regRes.data.data.user.name.includes('<script>'), 'XSS in user name is stripped');

    // 2. Register with invalid password (<8 chars / missing numbers)
    const badReg = await makeRequest(
      server,
      { path: '/api/auth/register', method: 'POST' },
      { name: 'Bad Pass', email: 'badpass@test.com', password: 'short' }
    );
    assert(badReg.status === 400, 'POST /api/auth/register with invalid password returns 400');

    // 3. Login with wrong credentials
    const badLogin = await makeRequest(
      server,
      { path: '/api/auth/login', method: 'POST' },
      { email: uniqueEmail, password: 'WrongPassword999' }
    );
    assert(badLogin.status === 401, 'POST /api/auth/login with wrong password returns 401');
    assert(badLogin.data.error.message === 'Invalid credentials.', 'Does not leak whether email or password was wrong');

    // 4. Login with demo users
    const adminLogin = await makeRequest(
      server,
      { path: '/api/auth/login', method: 'POST' },
      { email: 'admin@demo.com', password: 'Demo@1234' }
    );
    assert(adminLogin.status === 200, 'Login as admin@demo.com returns 200');
    assert(adminLogin.data.data.user.role === 'admin', 'Admin user role is "admin"');
    const adminToken = adminLogin.data.data.token;

    const userLogin = await makeRequest(
      server,
      { path: '/api/auth/login', method: 'POST' },
      { email: 'user@demo.com', password: 'Demo@1234' }
    );
    assert(userLogin.status === 200, 'Login as user@demo.com returns 200');
    assert(userLogin.data.data.user.role === 'user', 'Normal user role is "user"');
    const userToken = userLogin.data.data.token;

    const readonlyLogin = await makeRequest(
      server,
      { path: '/api/auth/login', method: 'POST' },
      { email: 'readonly@demo.com', password: 'Demo@1234' }
    );
    assert(readonlyLogin.status === 200, 'Login as readonly@demo.com returns 200');
    assert(readonlyLogin.data.data.user.role === 'read-only', 'Readonly user role is "read-only"');

    // 5. GET /api/auth/me without token -> 401
    const unauthMe = await makeRequest(server, { path: '/api/auth/me' });
    assert(unauthMe.status === 401, 'GET /api/auth/me without token returns 401');

    // 6. GET /api/auth/me with user token -> 200
    const authMe = await makeRequest(server, {
      path: '/api/auth/me',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(authMe.status === 200, 'GET /api/auth/me with valid Bearer token returns 200');
    assert(authMe.data.data.user.email === 'user@demo.com', 'Returns current user profile');

    // 7. RBAC: GET /api/admin-test with user token -> 403 Forbidden
    const forbiddenTest = await makeRequest(server, {
      path: '/api/admin-test',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(forbiddenTest.status === 403, 'Normal user accessing admin route gets 403 Forbidden');

    // 8. RBAC: GET /api/admin-test with admin token -> 200 OK
    const allowedTest = await makeRequest(server, {
      path: '/api/admin-test',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(allowedTest.status === 200, 'Admin user accessing admin route gets 200 OK');

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
