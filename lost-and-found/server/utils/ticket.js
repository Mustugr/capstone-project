const crypto = require('crypto');

// Confusion-free alphabet: no I, O, 0, 1
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TICKET_LENGTH = 6;

function generateTicket() {
  const bytes = crypto.randomBytes(TICKET_LENGTH);
  let out = '';
  for (let i = 0; i < TICKET_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `LF-${out}`;
}

module.exports = { generateTicket };
