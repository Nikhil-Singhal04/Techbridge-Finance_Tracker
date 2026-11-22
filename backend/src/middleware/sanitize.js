const xss = require('xss');

const xssOptions = {
  whiteList: {}, // empty object means no tags allowed -> strip all HTML tags
  stripIgnoreTag: true, // filter out all tags not in the whitelist
  stripIgnoreTagBody: ['script', 'style'], // remove script and style content
};

/**
 * Recursively sanitize string values in an object to prevent XSS attacks
 */
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return xss(value.trim(), xssOptions).trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj = {};
    for (const [key, val] of Object.entries(value)) {
      sanitizedObj[key] = sanitizeValue(val);
    }
    return sanitizedObj;
  }
  return value;
}

/**
 * Middleware that strips HTML/script tags from req.body, req.query, and req.params
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
};

module.exports = sanitizeInput;
