/**
 * What counts as a mobile number the business is willing to send to.
 *
 * Mirrors com.app.utility.MobileNumberRules on the server, which is the authority.
 * This copy exists only so the contact screen can say "that is nine digits" while
 * someone is still typing, instead of after a round trip.
 *
 * The rules are strict because of what is about to be sent over them: a ledger
 * statement carries a balance, so a number that turns out to belong to somebody
 * else discloses a customer's financial position to a stranger. In production
 * today 118 customers have no number, 6 hold placeholders - 1234567890 is on four
 * different customers - and 11 numbers are shared, one of them by seven customers.
 */

/**
 * Syntactically valid, semantically meaningless. An explicit list rather than a
 * repeated-digit rule, because 9999999999 is a real allocatable number.
 */
const PLACEHOLDERS = new Set([
  '1234567890',
  '0123456789',
  '9876543210',
  '0000000000',
  '1111111111',
  '9999999999'
]);

export const MOBILE_STATUS = {
  VALID: 'VALID',
  MISSING: 'MISSING',
  TOO_SHORT: 'TOO_SHORT',
  TOO_LONG: 'TOO_LONG',
  BAD_PREFIX: 'BAD_PREFIX',
  PLACEHOLDER: 'PLACEHOLDER',
  /** Valid, but recorded against more than one customer. Server-side only. */
  SHARED: 'SHARED'
};

/**
 * Strips separators and a country code, leaving the ten national digits.
 * Does not validate.
 */
export const normaliseMobile = (raw) => {
  if (raw === null || raw === undefined) return '';
  let digits = String(raw).replace(/[^0-9]/g, '');

  // +91 98765 43210 and 0 98765 43210 are the same ten digits.
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
};

export const classifyMobile = (raw) => {
  const digits = normaliseMobile(raw);

  if (digits.length === 0) return MOBILE_STATUS.MISSING;
  if (digits.length < 10) return MOBILE_STATUS.TOO_SHORT;
  if (digits.length > 10) return MOBILE_STATUS.TOO_LONG;
  if (PLACEHOLDERS.has(digits)) return MOBILE_STATUS.PLACEHOLDER;

  const first = digits[0];
  if (first < '6' || first > '9') return MOBILE_STATUS.BAD_PREFIX;

  return MOBILE_STATUS.VALID;
};

export const isValidMobile = (raw) => classifyMobile(raw) === MOBILE_STATUS.VALID;

/** Why a number was rejected, in words an operator can act on. */
export const describeMobileStatus = (status) => {
  switch (status) {
    case MOBILE_STATUS.VALID:       return 'Valid';
    case MOBILE_STATUS.MISSING:     return 'No mobile number recorded';
    case MOBILE_STATUS.TOO_SHORT:   return 'Too short - an Indian mobile number is 10 digits';
    case MOBILE_STATUS.TOO_LONG:    return 'Too long - more than 10 digits';
    case MOBILE_STATUS.BAD_PREFIX:  return 'Indian mobiles begin 6, 7, 8 or 9';
    case MOBILE_STATUS.PLACEHOLDER: return 'A placeholder, not a real number';
    case MOBILE_STATUS.SHARED:      return 'Recorded against more than one customer';
    default:                        return 'Not usable';
  }
};

/** 98765 43210. Anything not ten digits is returned as recorded. */
export const formatMobile = (raw) => {
  const digits = normaliseMobile(raw);
  if (digits.length !== 10) return raw === null || raw === undefined ? '' : String(raw).trim();
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};

/**
 * Live feedback while typing: nothing is wrong until there are ten digits, so a
 * half-typed number is not scolded for being short.
 *
 * @returns {{ tone: 'none'|'error'|'success', message: string }}
 */
export const validateWhileTyping = (raw) => {
  const digits = normaliseMobile(raw);
  if (digits.length === 0) return { tone: 'none', message: '' };
  if (digits.length < 10) return { tone: 'none', message: `${digits.length} of 10 digits` };

  const status = classifyMobile(digits);
  return status === MOBILE_STATUS.VALID
    ? { tone: 'success', message: formatMobile(digits) }
    : { tone: 'error', message: describeMobileStatus(status) };
};
