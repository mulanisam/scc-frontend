import {
  renderTemplate,
  placeholderCount,
  fieldsForTemplate,
  statusLabel,
  prettyMobile,
} from './messagingFormat';

/**
 * The custom-send preview claims to show what the customer will read.
 *
 * That claim is only worth making if this substitution matches the server's, which
 * renders the same approved body from the same pipe-separated values. The earlier bug
 * this guards against was the reverse: the outbox stored the application's own wording
 * while the customer received the approved template's, and for template 12082 those
 * were entirely different sentences.
 */

// The approved daily_sale_summary body, verbatim from the provider.
const DAILY = 'नमस्कार {{1}},\n\nदिनांक {{2}} चा व्यवहार:\nपक्षी: {{3}}\n'
  + 'वजन: {{4}} किलो\nदर: ₹{{5}} प्रति किलो\nरक्कम: ₹{{6}}\nजमा: ₹{{7}}\n\n'
  + 'एकूण शिल्लक: ₹{{8}}\n\n-सोहेल चिकन,माढा';

describe('renderTemplate', () => {
  it('substitutes every value in template order', () => {
    const rendered = renderTemplate(DAILY, [
      'Javed Kureshi', '09-09-2026', '24', '61.5', '88.46', '5440', '4000', '307940',
    ]);

    expect(rendered).toContain('नमस्कार Javed Kureshi,');
    expect(rendered).toContain('पक्षी: 24');
    expect(rendered).toContain('दर: ₹88.46 प्रति किलो');
    expect(rendered).toContain('एकूण शिल्लक: ₹307940');
    expect(rendered).not.toMatch(/\{\{\d+\}\}/);
  });

  it('leaves an unfilled placeholder visible rather than blanking it', () => {
    // A half-filled form should look half-filled. Silently rendering an empty space
    // would let somebody send "रक्कम: ₹" to a customer.
    const rendered = renderTemplate(DAILY, ['Javed', '09-09-2026', '24']);

    expect(rendered).toContain('नमस्कार Javed,');
    expect(rendered).toContain('{{4}}');
    expect(rendered).toContain('{{8}}');
  });

  it('keeps a zero, which is a real value', () => {
    const rendered = renderTemplate('जमा: ₹{{1}}', ['0']);
    expect(rendered).toBe('जमा: ₹0');
  });

  it('returns an empty string when there is no template yet', () => {
    expect(renderTemplate(undefined, ['a'])).toBe('');
    expect(renderTemplate(null)).toBe('');
  });
});

describe('placeholderCount', () => {
  it('reads the highest placeholder, not the number of occurrences', () => {
    expect(placeholderCount(DAILY)).toBe(8);
    // A name repeated top and bottom is still one variable.
    expect(placeholderCount('नमस्कार {{1}}, धन्यवाद {{1}}')).toBe(1);
  });

  it('is zero for a template with no variables', () => {
    expect(placeholderCount('धन्यवाद!')).toBe(0);
    expect(placeholderCount(null)).toBe(0);
  });
});

describe('fieldsForTemplate', () => {
  it('names the daily summary fields, so nobody types the rate into the amount', () => {
    const fields = fieldsForTemplate({
      templateName: 'daily_sale_summary', varCount: 8, bodyText: DAILY,
    });

    expect(fields).toHaveLength(8);
    expect(fields[4].label).toBe('Rate per kg');
    expect(fields[7].label).toBe('Total balance');
  });

  it('falls back to numbered fields for a template it does not know', () => {
    const fields = fieldsForTemplate({
      templateName: 'some_new_template', varCount: 2, bodyText: 'Hi {{1}}, {{2}}',
    });

    expect(fields.map((field) => field.label)).toEqual(['Variable 1', 'Variable 2']);
  });

  it('counts the body when the provider gives no varCount', () => {
    expect(fieldsForTemplate({ bodyText: 'Hi {{1}} and {{2}} and {{3}}' })).toHaveLength(3);
  });

  it('is empty with no template selected', () => {
    expect(fieldsForTemplate(null)).toEqual([]);
  });
});

describe('status wording', () => {
  it('calls SENT "Accepted", because that is all it means', () => {
    // The whole point of the DELIVERED status: a row the provider took is not a row
    // that arrived, and the screen must not imply otherwise.
    expect(statusLabel('SENT')).toBe('Accepted');
    expect(statusLabel('DELIVERED')).toBe('Delivered');
  });
});

describe('prettyMobile', () => {
  it('groups ten digits the way a number is read out', () => {
    expect(prettyMobile('7798112855')).toBe('77981 12855');
    expect(prettyMobile('+917798112855')).toBe('77981 12855');
  });

  it('shows a bad number as it is, rather than pretending it is formatted', () => {
    expect(prettyMobile('12345')).toBe('12345');
    expect(prettyMobile('')).toBe('—');
  });
});
