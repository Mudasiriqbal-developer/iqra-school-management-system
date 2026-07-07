const crypto = require('crypto');

/**
 * Hash a raw token using SHA-256.
 * @param {string} rawToken 
 * @returns {string} Hashed token
 */
const hashToken = (rawToken) => {
  return crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
};

/**
 * Generate a new secure activation token.
 * Returns the raw token, hashed token, and expiration timestamp.
 * @returns {Object} { rawToken, tokenHash, expiresAt }
 */
const generateActivationToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
};

module.exports = {
  hashToken,
  generateActivationToken,
};
