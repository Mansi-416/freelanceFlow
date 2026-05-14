const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, plan: user.plan || 'FREE' }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
}

function formatDate(date) {
  return date ? new Date(date).toISOString().split('T')[0] : null;
}

module.exports = { createToken, formatDate };
