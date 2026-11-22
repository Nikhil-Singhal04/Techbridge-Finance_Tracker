const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Personal Finance Tracker API',
    version: '1.0.0',
    description: `
**Personal Finance Tracker RESTful API Documentation**

Role-Based Access Control (RBAC):
- **admin**: Full system access (transactions, analytics, user management, cache metrics).
- **user**: Read/write access to own transactions, view own analytics.
- **read-only**: View-only access to own transactions and analytics; writes are forbidden (403).

Features:
- JWT Bearer Authentication
- Redis Caching with automatic invalidation and \`X-Cache: HIT/MISS\` headers
- Rate Limiting (\`auth\`: 5 req/15min, \`transactions\`: 100 req/hr, \`analytics\`: 50 req/hr)
- XSS Input Sanitization and SQL Injection Prevention
    `,
  },
  servers: [
    {
      url: '/api',
      description: 'API base path',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT Bearer token in the format: Bearer <token>',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid input data' },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'user@demo.com' },
          role: { type: 'string', enum: ['admin', 'user', 'read-only'], example: 'user' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Salary' },
          type: { type: 'string', enum: ['income', 'expense'], example: 'income' },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 101 },
          user_id: { type: 'integer', example: 2 },
          category_id: { type: 'integer', example: 4 },
          category_name: { type: 'string', example: 'Food' },
          type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
          amount: { type: 'number', example: 45.5 },
          description: { type: 'string', example: 'Groceries' },
          transaction_date: { type: 'string', format: 'date', example: '2026-11-20' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 112 },
          totalPages: { type: 'integer', example: 12 },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'System health check',
        description: 'Checks connectivity to PostgreSQL and Redis. Accessible without authentication.',
        responses: {
          200: {
            description: 'System healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'OK' },
                        db: { type: 'string', example: 'connected' },
                        redis: { type: 'string', example: 'connected' },
                        timestamp: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          503: { description: 'One or more data stores are unhealthy' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user account',
        description: 'Creates a standard user with role forced to user. Rate limit: 5 requests / 15 min.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alex Smith' },
                  email: { type: 'string', example: 'alex@example.com' },
                  password: { type: 'string', example: 'SecurePass123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Validation error' },
          409: { description: 'Email already registered' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive JWT token',
        description: 'Validates credentials and returns JWT bearer token with claims. Rate limit: 5 req / 15 min.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'user@demo.com' },
                  password: { type: 'string', example: 'Demo@1234' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Profile retrieved' },
          401: { description: 'Unauthorized / Missing token' },
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories',
        description: 'Cached for 1 hour in Redis (categories:all or categories:type). Accessible to all roles.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['income', 'expense'] },
            description: 'Optional filter by category type',
          },
        ],
        responses: {
          200: { description: 'Categories list' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'List transactions with search, filters, and pagination',
        description: 'Returns only current user transactions (admin can pass ?userId= or ?all=true). Allowed roles: all.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
          { name: 'categoryId', in: 'query', schema: { type: 'integer' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'minAmount', in: 'query', schema: { type: 'number' } },
          { name: 'maxAmount', in: 'query', schema: { type: 'number' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['date', 'amount', 'created_at'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: { description: 'Paginated transactions' },
          401: { description: 'Unauthorized' },
          429: { description: 'Rate limit exceeded' },
        },
      },
      post: {
        tags: ['Transactions'],
        summary: 'Create a transaction',
        description: 'Allowed roles: admin, user (read-only gets 403). Invalidates user analytics cache.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'amount', 'categoryId', 'transactionDate'],
                properties: {
                  type: { type: 'string', enum: ['income', 'expense'] },
                  amount: { type: 'number', example: 85.0 },
                  categoryId: { type: 'integer', example: 4 },
                  description: { type: 'string', example: 'Grocery shopping' },
                  transactionDate: { type: 'string', format: 'date', example: '2026-11-20' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Transaction created' },
          400: { description: 'Validation error / category mismatch' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden (read-only blocked)' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/transactions/{id}': {
      get: {
        tags: ['Transactions'],
        summary: 'Get transaction details',
        description: 'Allowed roles: all (owner or admin only).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Transaction details' },
          401: { description: 'Unauthorized' },
          404: { description: 'Transaction not found' },
        },
      },
      put: {
        tags: ['Transactions'],
        summary: 'Update a transaction',
        description: 'Allowed roles: admin, user (owner or admin only; read-only gets 403). Invalidates analytics cache.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['income', 'expense'] },
                  amount: { type: 'number' },
                  categoryId: { type: 'integer' },
                  description: { type: 'string' },
                  transactionDate: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Transaction updated' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Transactions'],
        summary: 'Delete a transaction',
        description: 'Allowed roles: admin, user (owner or admin only; read-only gets 403). Invalidates analytics cache.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Transaction deleted' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
    },
    '/analytics/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Financial summary KPI metrics',
        description: 'Returns totalIncome, totalExpense, balance, savingsRate, transactionCount, averageExpense. Cached 15 min. Allowed roles: all.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'year', in: 'query', schema: { type: 'integer' } },
          { name: 'month', in: 'query', schema: { type: 'integer' } },
          { name: 'userId', in: 'query', schema: { type: 'integer' }, description: 'Admin only' },
        ],
        responses: {
          200: { description: 'Summary KPI data' },
          401: { description: 'Unauthorized' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/analytics/monthly': {
      get: {
        tags: ['Analytics'],
        summary: '12-month overview',
        description: 'Returns 12 months array for current or specified year with income, expense, and net balance. Allowed roles: all.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'year', in: 'query', schema: { type: 'integer' } }],
        responses: { 200: { description: 'Monthly analytics array' } },
      },
    },
    '/analytics/yearly': {
      get: {
        tags: ['Analytics'],
        summary: 'Yearly trends',
        description: 'Income, expense, and net totals per year. Allowed roles: all.',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Yearly analytics array' } },
      },
    },
    '/analytics/category-breakdown': {
      get: {
        tags: ['Analytics'],
        summary: 'Category-wise spending breakdown',
        description: 'Aggregates totals and percentages by category for pie charts. Allowed roles: all.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'], default: 'expense' } },
          { name: 'year', in: 'query', schema: { type: 'integer' } },
          { name: 'month', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Category breakdown array' } },
      },
    },
    '/analytics/trends': {
      get: {
        tags: ['Analytics'],
        summary: 'Income vs expense trends for line and bar charts',
        description: 'Returns monthly trends for the last N months. Allowed roles: all.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'months', in: 'query', schema: { type: 'integer', default: 12 } }],
        responses: { 200: { description: 'Trends series' } },
      },
    },
    '/users': {
      get: {
        tags: ['Admin Users'],
        summary: 'List users (Admin only)',
        description: 'Paginated user list with optional search. Allowed roles: admin only.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Paginated users' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden (non-admin)' },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Admin Users'],
        summary: 'Get user details by ID (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'User details' },
          403: { description: 'Forbidden' },
          404: { description: 'User not found' },
        },
      },
      delete: {
        tags: ['Admin Users'],
        summary: 'Delete user account (Admin only)',
        description: 'Admin cannot delete their own account. Cascades transactions and clears cache.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'User deleted' },
          400: { description: 'Cannot delete own account' },
          403: { description: 'Forbidden' },
          404: { description: 'User not found' },
        },
      },
    },
    '/users/{id}/role': {
      patch: {
        tags: ['Admin Users'],
        summary: 'Change user role (Admin only)',
        description: 'Admin cannot demote their own account. Invalidates user analytics cache.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['admin', 'user', 'read-only'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Role updated' },
          400: { description: 'Cannot demote own account' },
          403: { description: 'Forbidden' },
          404: { description: 'User not found' },
        },
      },
    },
    '/metrics/cache': {
      get: {
        tags: ['Admin Metrics'],
        summary: 'Get Redis cache metrics (Admin only)',
        description: 'Returns hits, misses, and hit rate calculated from Redis counters.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cache metrics' },
          403: { description: 'Forbidden (non-admin)' },
        },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({
  swaggerDefinition,
  apis: [], // Defined cleanly above in definition
});

module.exports = {
  swaggerUi,
  swaggerSpec,
};
