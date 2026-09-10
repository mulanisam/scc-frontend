import {
  MOBILE_STATUS,
  classifyMobile,
  formatMobile,
  isValidMobile,
  normaliseMobile,
  validateWhileTyping
} from './mobileRules';

/**
 * These cases are the production data. Out of 488 customers: 118 have nothing
 * recorded, 1234567890 is on four different customers, 0000000000 on two, three
 * are nine digits, and three are "0" or "00". Each appears below, because the
 * point of the rules is to catch exactly these.
 *
 * The same cases are asserted against MobileNumberRules on the server, which is
 * the authority - a statement is only sent if the server agrees.
 */
describe('classifyMobile', () => {
  it('accepts the four Indian mobile prefixes', () => {
    ['6012345678', '7012345678', '8012345678', '9012345678'].forEach((number) => {
      expect(classifyMobile(number)).toBe(MOBILE_STATUS.VALID);
    });
  });

  it('rejects what is actually in the customer table', () => {
    expect(classifyMobile('')).toBe(MOBILE_STATUS.MISSING);
    expect(classifyMobile(null)).toBe(MOBILE_STATUS.MISSING);
    expect(classifyMobile('0')).toBe(MOBILE_STATUS.TOO_SHORT);
    expect(classifyMobile('00')).toBe(MOBILE_STATUS.TOO_SHORT);
    expect(classifyMobile('909697601')).toBe(MOBILE_STATUS.TOO_SHORT);
    expect(classifyMobile('1234567890')).toBe(MOBILE_STATUS.PLACEHOLDER);
    expect(classifyMobile('0000000000')).toBe(MOBILE_STATUS.PLACEHOLDER);
  });

  it('rejects a prefix no Indian mobile uses', () => {
    // Ten digits and not on the placeholder list, but 2 is a landline prefix.
    expect(classifyMobile('2012345678')).toBe(MOBILE_STATUS.BAD_PREFIX);
    expect(classifyMobile('5555555555')).toBe(MOBILE_STATUS.BAD_PREFIX);
  });

  it('rejects too many digits', () => {
    expect(classifyMobile('98765432109')).toBe(MOBILE_STATUS.TOO_LONG);
  });

  it('does not reject 9999999999 as a repeated digit', () => {
    // It is on the placeholder list because it is filler in practice, but the
    // rule must be an explicit list - a "all digits the same" heuristic would
    // also throw away real numbers in other ranges.
    expect(classifyMobile('9999999999')).toBe(MOBILE_STATUS.PLACEHOLDER);
    expect(classifyMobile('9888888888')).toBe(MOBILE_STATUS.VALID);
  });
});

describe('normaliseMobile', () => {
  it('strips separators so a number typed with spaces is still accepted', () => {
    expect(normaliseMobile('98765 43210')).toBe('9876543210');
    expect(normaliseMobile('98765-43210')).toBe('9876543210');
    expect(normaliseMobile('  9876543210  ')).toBe('9876543210');
  });

  it('strips a country code or a trunk zero', () => {
    expect(normaliseMobile('+91 98765 43210')).toBe('9876543210');
    expect(normaliseMobile('919876543210')).toBe('9876543210');
    expect(normaliseMobile('09876543210')).toBe('9876543210');
  });

  it('leaves a number it cannot make sense of alone', () => {
    expect(normaliseMobile('909697601')).toBe('909697601');
    expect(normaliseMobile('12345')).toBe('12345');
  });

  it('treats a normalised and a raw form of the same phone as equal', () => {
    // This is what makes shared-number detection work: two customers recorded as
    // "98765 43210" and "9876543210" are on the same phone.
    expect(normaliseMobile('98765 43210')).toBe(normaliseMobile('+919876543210'));
  });
});

describe('validateWhileTyping', () => {
  it('counts up without scolding a half-typed number', () => {
    expect(validateWhileTyping('98')).toEqual({ tone: 'none', message: '2 of 10 digits' });
    expect(validateWhileTyping('987654321')).toEqual({ tone: 'none', message: '9 of 10 digits' });
    expect(validateWhileTyping('')).toEqual({ tone: 'none', message: '' });
  });

  it('confirms a complete number and shows it grouped', () => {
    expect(validateWhileTyping('9876543211')).toEqual({ tone: 'success', message: '98765 43211' });
  });

  it('objects only once the number is complete', () => {
    const result = validateWhileTyping('1234567890');
    expect(result.tone).toBe('error');
    expect(result.message).toMatch(/placeholder/i);
  });
});

describe('formatMobile', () => {
  it('groups a valid number for reading', () => {
    expect(formatMobile('9876543211')).toBe('98765 43211');
  });

  it('shows bad data exactly as recorded, rather than dressing it up', () => {
    expect(formatMobile('909697601')).toBe('909697601');
    expect(formatMobile('00')).toBe('00');
    expect(formatMobile(null)).toBe('');
  });
});

describe('isValidMobile', () => {
  it('is the single question the send path asks', () => {
    expect(isValidMobile('9876543211')).toBe(true);
    expect(isValidMobile('1234567890')).toBe(false);
    expect(isValidMobile('')).toBe(false);
  });
});
