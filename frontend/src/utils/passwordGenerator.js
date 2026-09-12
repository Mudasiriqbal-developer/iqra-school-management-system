/**
 * Generates a random secure password.
 * Length: 10-12 characters.
 * Guarantees: at least one uppercase letter, one lowercase letter, one digit, and one special symbol.
 * Does NOT hardcode or return any static fallback password.
 */
export const generateSecurePassword = () => {
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const allChars = lowercase + uppercase + digits + symbols;

  // Guarantee mixed case + at least one digit + one symbol
  const guaranteed = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  // Random length between 10 and 12
  const targetLength = 10 + Math.floor(Math.random() * 3); // 10, 11, or 12

  for (let i = guaranteed.length; i < targetLength; i++) {
    guaranteed.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle thoroughly using Fisher-Yates
  for (let i = guaranteed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [guaranteed[i], guaranteed[j]] = [guaranteed[j], guaranteed[i]];
  }

  return guaranteed.join('');
};
