/**
 * Escapes special regular expression characters in user search input
 * to prevent ReDoS, pattern syntax crashes, or unintended query manipulation.
 *
 * @param {string} str - User-supplied search string
 * @returns {string} Safe string with regex metacharacters escaped
 */
const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  escapeRegex,
};
