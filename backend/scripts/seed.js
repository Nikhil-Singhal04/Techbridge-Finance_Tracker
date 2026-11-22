const bcrypt = require('bcryptjs');
const { pool } = require('../src/db/pool');

const categoriesData = [
  { name: 'Salary', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Investments', type: 'income' },
  { name: 'Food', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Bills', type: 'expense' },
  { name: 'Health', type: 'expense' },
  { name: 'Education', type: 'expense' },
  { name: 'Rent', type: 'expense' },
  { name: 'Other', type: 'expense' },
];

const demoUsers = [
  { name: 'Admin Demo', email: 'admin@demo.com', role: 'admin' },
  { name: 'Standard Demo User', email: 'user@demo.com', role: 'user' },
  { name: 'Read-Only Demo User', email: 'readonly@demo.com', role: 'read-only' },
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function generateTransactionsForUser(userId, categoryMap) {
  const transactions = [];
  const now = new Date();

  // Generate 12 months of realistic data
  for (let m = 11; m >= 0; m--) {
    const year = now.getFullYear();
    const month = now.getMonth() - m;
    const targetDate = new Date(year, month, 1);
    const y = targetDate.getFullYear();
    const mo = targetDate.getMonth() + 1;

    // 1. Monthly Salary (Income) on the 1st
    transactions.push({
      user_id: userId,
      category_id: categoryMap['Salary'],
      type: 'income',
      amount: getRandomFloat(4800, 5200),
      description: `Monthly Salary - ${targetDate.toLocaleString('default', { month: 'short' })} ${y}`,
      transaction_date: `${y}-${String(mo).padStart(2, '0')}-01`,
    });

    // 2. Freelance/Investment bonus occasionally
    if (m % 3 === 0) {
      transactions.push({
        user_id: userId,
        category_id: categoryMap['Freelance'],
        type: 'income',
        amount: getRandomFloat(600, 1500),
        description: 'Freelance Consulting Project',
        transaction_date: `${y}-${String(mo).padStart(2, '0')}-${String(getRandomInt(10, 20)).padStart(2, '0')}`,
      });
    }

    // 3. Rent (Expense) on the 2nd
    transactions.push({
      user_id: userId,
      category_id: categoryMap['Rent'],
      type: 'expense',
      amount: 1400.00,
      description: 'Apartment Monthly Rent',
      transaction_date: `${y}-${String(mo).padStart(2, '0')}-02`,
    });

    // 4. Utilities / Bills
    transactions.push({
      user_id: userId,
      category_id: categoryMap['Bills'],
      type: 'expense',
      amount: getRandomFloat(110, 220),
      description: 'Electricity & High-speed Internet',
      transaction_date: `${y}-${String(mo).padStart(2, '0')}-${String(getRandomInt(5, 10)).padStart(2, '0')}`,
    });

    // 5. Food & Groceries (3-4 times per month)
    const foodItems = ['Weekly Grocery Run', 'Supermarket & Produce', 'Dining with Friends', 'Local Bakery & Coffee'];
    foodItems.forEach((desc, idx) => {
      transactions.push({
        user_id: userId,
        category_id: categoryMap['Food'],
        type: 'expense',
        amount: getRandomFloat(35, 160),
        description: desc,
        transaction_date: `${y}-${String(mo).padStart(2, '0')}-${String(Math.min(28, 4 + idx * 7)).padStart(2, '0')}`,
      });
    });

    // 6. Transport (2-3 times per month)
    transactions.push({
      user_id: userId,
      category_id: categoryMap['Transport'],
      type: 'expense',
      amount: getRandomFloat(25, 75),
      description: 'Metro Transit Pass / Fuel',
      transaction_date: `${y}-${String(mo).padStart(2, '0')}-${String(getRandomInt(6, 15)).padStart(2, '0')}`,
    });

    // 7. Entertainment / Shopping / Health
    const misc = [
      { cat: 'Entertainment', desc: 'Streaming Services & Cinema', min: 20, max: 60 },
      { cat: 'Shopping', desc: 'Clothing & Home Essentials', min: 45, max: 180 },
      { cat: 'Health', desc: 'Pharmacy & Wellness Check', min: 30, max: 120 },
    ];
    const picked = misc[m % misc.length];
    transactions.push({
      user_id: userId,
      category_id: categoryMap[picked.cat],
      type: 'expense',
      amount: getRandomFloat(picked.min, picked.max),
      description: picked.desc,
      transaction_date: `${y}-${String(mo).padStart(2, '0')}-${String(getRandomInt(12, 26)).padStart(2, '0')}`,
    });
  }

  return transactions;
}

async function seedDatabase() {
  console.log('[Seed] Starting database seeding...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Seed categories
    console.log('[Seed] Inserting categories...');
    const categoryMap = {};
    for (const cat of categoriesData) {
      const res = await client.query(
        `INSERT INTO categories (name, type)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type
         RETURNING id, name`,
        [cat.name, cat.type]
      );
      categoryMap[res.rows[0].name] = res.rows[0].id;
    }

    // 2. Seed demo users
    console.log('[Seed] Inserting demo users...');
    const passwordHash = await bcrypt.hash('Demo@1234', 10);
    const userMap = {};

    for (const user of demoUsers) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE 
         SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
         RETURNING id, role, email`,
        [user.name, user.email, passwordHash, user.role]
      );
      userMap[res.rows[0].role] = res.rows[0].id;
    }

    // 3. Clear existing transactions for fresh deterministic seed
    console.log('[Seed] Cleaning old transactions...');
    await client.query('DELETE FROM transactions WHERE user_id = ANY($1)', [
      [userMap['user'], userMap['read-only']],
    ]);

    // 4. Generate & Insert ~150 transactions (~75 for 'user' and ~75 for 'read-only')
    console.log('[Seed] Inserting realistic transactions for user & read-only accounts...');
    const allTransactions = [
      ...generateTransactionsForUser(userMap['user'], categoryMap),
      ...generateTransactionsForUser(userMap['read-only'], categoryMap),
    ];

    for (const tx of allTransactions) {
      await client.query(
        `INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tx.user_id, tx.category_id, tx.type, tx.amount, tx.description, tx.transaction_date]
      );
    }

    await client.query('COMMIT');
    console.log(`[Seed] Seeded ${Object.keys(categoryMap).length} categories.`);
    console.log(`[Seed] Seeded ${demoUsers.length} users with password: Demo@1234`);
    console.log(`[Seed] Seeded ${allTransactions.length} realistic transactions over the last 12 months.`);
    console.log('[Seed] Database seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
