const { query } = require('../db/pool');
const AppError = require('../utils/AppError');

/**
 * Determine effective target user ID (admin can inspect any user; standard/read-only strictly their own)
 */
const resolveTargetUserId = (currentUser, requestedUserId) => {
  if (currentUser.role === 'admin' && requestedUserId) {
    return parseInt(requestedUserId, 10);
  }
  return currentUser.id;
};

/**
 * GET /api/analytics/summary?year=&month=
 * Computes totalIncome, totalExpense, balance, savingsRate, transactionCount, averageExpense
 */
const getSummary = async (currentUser, { year, month, userId }) => {
  const targetUserId = resolveTargetUserId(currentUser, userId);

  const conditions = ['user_id = $1'];
  const params = [targetUserId];
  let paramIndex = 2;

  if (year) {
    conditions.push(`EXTRACT(YEAR FROM transaction_date) = $${paramIndex++}`);
    params.push(parseInt(year, 10));
  }

  if (month) {
    conditions.push(`EXTRACT(MONTH FROM transaction_date) = $${paramIndex++}`);
    params.push(parseInt(month, 10));
  }

  const whereClause = conditions.join(' AND ');

  const sql = `
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::numeric::float AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::numeric::float AS total_expense,
      COUNT(*)::int AS transaction_count,
      COUNT(CASE WHEN type = 'expense' THEN 1 END)::int AS expense_count
    FROM transactions
    WHERE ${whereClause}
  `;

  const result = await query(sql, params);
  const row = result.rows[0];

  const totalIncome = parseFloat(row.total_income || 0);
  const totalExpense = parseFloat(row.total_expense || 0);
  const balance = parseFloat((totalIncome - totalExpense).toFixed(2));
  const transactionCount = parseInt(row.transaction_count || 0, 10);
  const expenseCount = parseInt(row.expense_count || 0, 10);

  const savingsRate =
    totalIncome > 0
      ? parseFloat((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(2))
      : 0;

  const averageExpense =
    expenseCount > 0 ? parseFloat((totalExpense / expenseCount).toFixed(2)) : 0;

  return {
    totalIncome,
    totalExpense,
    balance,
    savingsRate,
    transactionCount,
    averageExpense,
  };
};

/**
 * GET /api/analytics/monthly?year=
 * Returns 12-month array { month, monthName, income, expense, net }
 * Fills missing months with 0
 */
const getMonthly = async (currentUser, { year, userId }) => {
  const targetUserId = resolveTargetUserId(currentUser, userId);
  const targetYear = parseInt(year || new Date().getFullYear(), 10);

  const sql = `
    SELECT 
      EXTRACT(MONTH FROM transaction_date)::int AS month_num,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::numeric::float AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::numeric::float AS expense
    FROM transactions
    WHERE user_id = $1 AND EXTRACT(YEAR FROM transaction_date) = $2
    GROUP BY EXTRACT(MONTH FROM transaction_date)
    ORDER BY month_num ASC
  `;

  const result = await query(sql, [targetUserId, targetYear]);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const monthMap = {};
  result.rows.forEach((r) => {
    monthMap[r.month_num] = {
      income: parseFloat(r.income || 0),
      expense: parseFloat(r.expense || 0),
    };
  });

  const full12Months = [];
  for (let m = 1; m <= 12; m++) {
    const data = monthMap[m] || { income: 0, expense: 0 };
    full12Months.push({
      month: m,
      monthName: monthNames[m - 1],
      income: data.income,
      expense: data.expense,
      net: parseFloat((data.income - data.expense).toFixed(2)),
    });
  }

  return full12Months;
};

/**
 * GET /api/analytics/yearly
 * Returns per-year income/expense totals
 */
const getYearly = async (currentUser, { userId }) => {
  const targetUserId = resolveTargetUserId(currentUser, userId);

  const sql = `
    SELECT 
      EXTRACT(YEAR FROM transaction_date)::int AS year,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::numeric::float AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::numeric::float AS expense
    FROM transactions
    WHERE user_id = $1
    GROUP BY EXTRACT(YEAR FROM transaction_date)
    ORDER BY year ASC
  `;

  const result = await query(sql, [targetUserId]);

  return result.rows.map((r) => ({
    year: r.year,
    income: parseFloat(r.income || 0),
    expense: parseFloat(r.expense || 0),
    net: parseFloat((r.income - r.expense).toFixed(2)),
  }));
};

/**
 * GET /api/analytics/category-breakdown?type=expense&year=&month=
 * Returns [{ category, categoryId, total, percentage }]
 */
const getCategoryBreakdown = async (currentUser, { type = 'expense', year, month, userId }) => {
  const targetUserId = resolveTargetUserId(currentUser, userId);
  const targetType = type === 'income' ? 'income' : 'expense';

  const conditions = ['t.user_id = $1', 't.type = $2'];
  const params = [targetUserId, targetType];
  let paramIndex = 3;

  if (year) {
    conditions.push(`EXTRACT(YEAR FROM t.transaction_date) = $${paramIndex++}`);
    params.push(parseInt(year, 10));
  }

  if (month) {
    conditions.push(`EXTRACT(MONTH FROM t.transaction_date) = $${paramIndex++}`);
    params.push(parseInt(month, 10));
  }

  const whereClause = conditions.join(' AND ');

  const sql = `
    SELECT 
      COALESCE(c.name, 'Uncategorized') AS category,
      t.category_id,
      SUM(t.amount)::numeric::float AS total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE ${whereClause}
    GROUP BY c.name, t.category_id
    ORDER BY total DESC
  `;

  const result = await query(sql, params);
  const rows = result.rows;

  const grandTotal = rows.reduce((acc, r) => acc + parseFloat(r.total || 0), 0);

  return rows.map((r) => {
    const catTotal = parseFloat(r.total || 0);
    const percentage =
      grandTotal > 0 ? parseFloat(((catTotal / grandTotal) * 100).toFixed(2)) : 0;
    return {
      category: r.category,
      categoryId: r.category_id,
      total: catTotal,
      percentage,
    };
  });
};

/**
 * GET /api/analytics/trends?months=12
 * Income vs expense per month for line/bar charts
 */
const getTrends = async (currentUser, { months = 12, userId }) => {
  const targetUserId = resolveTargetUserId(currentUser, userId);
  const numMonths = Math.min(36, Math.max(1, parseInt(months, 10)));

  const sql = `
    SELECT 
      TO_CHAR(date_trunc('month', transaction_date), 'YYYY-MM') AS month_key,
      TO_CHAR(date_trunc('month', transaction_date), 'Mon YYYY') AS month_name,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::numeric::float AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::numeric::float AS expense
    FROM transactions
    WHERE user_id = $1 
      AND transaction_date >= date_trunc('month', CURRENT_DATE) - ($2 || ' month')::interval
    GROUP BY date_trunc('month', transaction_date)
    ORDER BY date_trunc('month', transaction_date) ASC
  `;

  const result = await query(sql, [targetUserId, numMonths - 1]);

  return result.rows.map((r) => ({
    month: r.month_key,
    monthName: r.month_name,
    income: parseFloat(r.income || 0),
    expense: parseFloat(r.expense || 0),
    net: parseFloat((r.income - r.expense).toFixed(2)),
  }));
};

module.exports = {
  getSummary,
  getMonthly,
  getYearly,
  getCategoryBreakdown,
  getTrends,
};
