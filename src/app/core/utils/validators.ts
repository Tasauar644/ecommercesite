// Bangladeshi mobile numbers: 01[3-9]XXXXXXXX (11 digits), optionally prefixed with +880 or 880.
const BD_PHONE_PATTERN = /^(?:\+?880|0)1[3-9]\d{8}$/;

export function isValidBangladeshPhone(phone: string): boolean {
  return BD_PHONE_PATTERN.test(phone.trim());
}

// Heuristic "does this look like a real address" check — requires a house/road
// number alongside area text, since we don't have a geocoding service wired up.
export function isValidAddress(address: string): boolean {
  const trimmed = address.trim();
  return trimmed.length >= 10 && /[A-Za-z]/.test(trimmed) && /\d/.test(trimmed);
}
