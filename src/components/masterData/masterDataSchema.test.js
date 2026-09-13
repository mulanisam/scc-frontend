import {
  SCHEMA,
  TAB_ORDER,
  ADMIN_TABS,
  toRow,
  toForm,
  toPayload,
  missingRequired,
  expiryState,
  FORMATTERS
} from './masterDataSchema';

/**
 * The shape differences between reading a master-data row and writing one back.
 *
 * Every bug this module was written to fix lives in that gap. The screen used to read a
 * row, show `route` as a name, and post the name straight back into a field the API
 * declares as a Long - so editing a city returned 400 and surfaced as "Error updating
 * cities". Party vehicles were worse: the endpoint binds the entity, so `party` has to
 * be an object, and sending the id alone meant adding one was simply impossible.
 */

describe('toRow', () => {
  it('flattens a customer for display but keeps the ids for the form', () => {
    const row = toRow('customers', {
      id: 67,
      name: 'Javed Kureshi',
      city: { id: 9, name: 'Madha', route: { id: 6, name: 'Route 6' } }
    });

    expect(row.city).toBe('Madha');
    expect(row.route).toBe('Route 6');
    // Kept so the form preselects by id. Looking the name up instead would pick the
    // wrong record whenever two routes share a name.
    expect(row.cityId).toBe(9);
    expect(row.routeId).toBe(6);
  });

  it('drops a city\'s customer list, which is a whole second table', () => {
    const row = toRow('cities', {
      id: 1, name: 'Bavi', route: { id: 1, name: 'Route 1' },
      customers: [{ id: 1 }, { id: 2 }]
    });

    expect(row.customers).toBeUndefined();
    expect(row.route).toBe('Route 1');
    expect(row.routeId).toBe(1);
  });

  it('joins the list-valued columns', () => {
    expect(toRow('routes', { id: 1, name: 'Route 1', cities: [{ name: 'Bavi' }, { name: 'Madha' }] }).cities)
      .toBe('Bavi, Madha');
    // A party's vehicles read as one string in the column and stay an array for the form.
    const party = toRow('parties', { id: 1, vehicleNumbers: ['MH13CU4916', 'MH13AB1234'] });
    expect(party.vehicleNumbers).toBe('MH13CU4916, MH13AB1234');
    expect(party.vehicleNumberList).toEqual(['MH13CU4916', 'MH13AB1234']);
  });

  it('survives a missing association rather than throwing', () => {
    // A customer with no city would otherwise crash the whole table on render.
    expect(toRow('customers', { id: 1, name: 'No city' }).city).toBe('');
    expect(toRow('routes', { id: 1, name: 'Empty' }).cities).toBe('');
  });
});

describe('toForm', () => {
  it('preselects the dropdowns by id, not by the displayed name', () => {
    const row = toRow('cities', { id: 5, name: 'Bavi', route: { id: 1, name: 'Route 1' } });
    const form = toForm('cities', row);

    // The bug: this used to be "Route 1", which matched no option so the Select showed
    // blank, and saving sent the name to a Long field.
    expect(form.route).toBe(1);
    expect(form.name).toBe('Bavi');
    expect(form.id).toBe(5);
  });

  it('preselects both route and city for a customer', () => {
    const row = toRow('customers', {
      id: 67, name: 'Javed', city: { id: 9, name: 'Madha', route: { id: 6, name: 'Route 6' } }
    });
    const form = toForm('customers', row);

    expect(form.route).toBe(6);
    expect(form.city).toBe(9);
  });

  it('opens empty for a new record, with every field present', () => {
    const form = toForm('customers', null);

    expect(form.id).toBeUndefined();
    SCHEMA.customers.fields.forEach((field) => {
      expect(form[field.key]).toBe('');
    });
  });

  it('gives a list field an array, empty or not, never a joined string', () => {
    // The editor pushes onto it, so '' would throw and the joined column value would
    // turn "MH13CU4916, MH13AB1234" into a single bogus registration number.
    expect(toForm('parties', null).vehicleNumbers).toEqual([]);

    const row = toRow('parties', { id: 1, name: 'Naushad', vehicleNumbers: ['MH13CU4916'] });
    expect(toForm('parties', row).vehicleNumbers).toEqual(['MH13CU4916']);
  });
});

describe('toPayload', () => {
  it('sends a customer\'s route and city as numbers', () => {
    const payload = toPayload('customers', {
      name: 'Javed', shopName: 'Lucky', mobileNo: '9975080207', alternateMobileNo: '',
      route: 6, city: 9, address: 'Madha', balanceAmount: ''
    });

    expect(payload.route).toBe(6);
    expect(payload.city).toBe(9);
    expect(typeof payload.route).toBe('number');
  });

  it('always sends a balance, because the DTO parses it without a null check', () => {
    // CustomerDTO.balanceAmount is a String fed straight to new BigDecimal(...), so a
    // blank or absent value is a 500 rather than a validation message.
    expect(toPayload('customers', { name: 'A', balanceAmount: '' }).balanceAmount).toBe('0');
    expect(toPayload('customers', { name: 'A', balanceAmount: null }).balanceAmount).toBe('0');
    expect(toPayload('customers', { name: 'A', balanceAmount: 15500 }).balanceAmount).toBe('15500');
  });

  it('sends a party\'s vehicles as an array of numbers', () => {
    // They used to be their own entity behind six endpoints and a tab, one of which -
    // the create - bound the entity and so rejected the screen's bare party id as a 400
    // every time. They are a field on the party now.
    const payload = toPayload('parties', {
      name: 'Naushad Trading', vehicleNumbers: ['MH13CU4916', ' MH13AB1234 ', '']
    });

    expect(payload.vehicleNumbers).toEqual(['MH13CU4916', 'MH13AB1234']);
    expect(payload.isObsolete).toBe(false);
  });

  it('sends an empty list rather than nothing when a party has no vehicles', () => {
    // Absent would leave the server's existing list untouched on an update, so removing
    // the last vehicle would silently fail.
    expect(toPayload('parties', { name: 'Naushad' }).vehicleNumbers).toEqual([]);
  });

  it('sends blank vehicle dates as null, not as empty strings', () => {
    // Jackson cannot read "" as a LocalDate.
    const payload = toPayload('vehicles', {
      vehicleNo: 'MH13AB1234', model: '', passingDate: '',
      insuranceDate: '2026-12-31', fitnessDate: '', pucdate: ''
    });

    expect(payload.passingDate).toBeNull();
    expect(payload.fitnessDate).toBeNull();
    expect(payload.pucdate).toBeNull();
    expect(payload.insuranceDate).toBe('2026-12-31');
  });

  it('uses isObsolete for parties and obsolete for everything else', () => {
    expect(toPayload('parties', { name: 'Naushad' }).isObsolete).toBe(false);
    expect(toPayload('parties', { name: 'Naushad' }).obsolete).toBeUndefined();
    expect(toPayload('drivers', { name: 'Imran' }).obsolete).toBe(false);
  });

  it('sends numeric fields as numbers', () => {
    expect(toPayload('suppliers', { name: 'S', pendingPayment: '' }).pendingPayment).toBe(0);
    expect(toPayload('suppliers', { name: 'S', pendingPayment: '1500' }).pendingPayment).toBe(1500);
  });

  it('never includes fields the endpoint does not accept', () => {
    // Built from the schema's field list, so a key the table happens to carry - a
    // flattened name, a cityId - cannot leak into the body.
    const payload = toPayload('cities', {
      name: 'Bavi', route: 1, routeId: 1, customers: 'noise', id: 5
    });

    expect(payload.routeId).toBeUndefined();
    expect(payload.customers).toBeUndefined();
    expect(Object.keys(payload).sort()).toEqual(['name', 'obsolete', 'route']);
  });
});

describe('missingRequired', () => {
  it('names the empty required fields by their label', () => {
    expect(missingRequired('cities', { name: '', route: '' }))
      .toEqual(['City name', 'Route']);
    expect(missingRequired('cities', { name: 'Bavi', route: 1 })).toEqual([]);
  });

  it('treats whitespace as empty', () => {
    expect(missingRequired('drivers', { name: '   ' })).toEqual(['Driver name']);
  });

  it('does not require the optional fields', () => {
    // A customer with no phone number is still a customer - 118 of them are.
    expect(missingRequired('customers', { name: 'Javed', route: 6, city: 9 })).toEqual([]);
  });
});

describe('expiryState', () => {
  /**
   * A yyyy-MM-dd string n days from today, built from local parts.
   *
   * Not toISOString(): that converts to UTC first, and east of Greenwich local midnight
   * is the previous day in UTC - so in IST every date came out one day early and "today"
   * tested as expired. The dates in this data are calendar dates with no time, so the
   * comparison has to stay in local terms throughout.
   */
  const isoDaysFromNow = (days) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  it('calls a lapsed date expired and a near one due', () => {
    expect(expiryState(isoDaysFromNow(-1))).toBe('expired');
    expect(expiryState(isoDaysFromNow(10))).toBe('due');
    // A month's notice, because renewing papers means a trip to the RTO.
    expect(expiryState(isoDaysFromNow(30))).toBe('due');
    expect(expiryState(isoDaysFromNow(31))).toBeNull();
  });

  it('says nothing about a date that is absent or unreadable', () => {
    expect(expiryState(null)).toBeNull();
    expect(expiryState('')).toBeNull();
    expect(expiryState('not a date')).toBeNull();
  });

  it('treats today as due, not expired', () => {
    expect(expiryState(isoDaysFromNow(0))).toBe('due');
  });
});

describe('formatters', () => {
  it('groups money the Indian way with no decimals', () => {
    expect(FORMATTERS.money(307940)).toBe('₹3,07,940');
    expect(FORMATTERS.money(0)).toBe('₹0');
    expect(FORMATTERS.money(null)).toBe('—');
  });

  it('spaces a mobile number the way it is read aloud', () => {
    expect(FORMATTERS.mobile('9975080207')).toBe('99750 80207');
    expect(FORMATTERS.mobile('+919975080207')).toBe('99750 80207');
    expect(FORMATTERS.mobile('')).toBe('—');
  });

  it('writes Sep, not Sept, so a date column lines up', () => {
    expect(FORMATTERS.shortDate('2026-09-09')).toBe('09 Sep 2026');
    expect(FORMATTERS.shortDate(null)).toBe('—');
  });
});

describe('the schema itself', () => {
  it('covers every tab, and every tab has columns and a name key', () => {
    [...TAB_ORDER, ...ADMIN_TABS].forEach((tab) => {
      const entry = SCHEMA[tab];
      expect(entry).toBeDefined();
      expect(entry.columns.length).toBeGreaterThan(0);
      expect(entry.nameKey).toBeTruthy();
      // The identifying column must survive a narrow screen, or a row cannot be named.
      expect(entry.columns.find((c) => c.key === entry.nameKey)?.priority).toBe(1);
    });
  });

  it('keeps every table narrow enough to read without endless scrolling', () => {
    [...TAB_ORDER, ...ADMIN_TABS].forEach((tab) => {
      const width = SCHEMA[tab].columns
        .filter((column) => (column.priority ?? 1) <= 3)
        .reduce((sum, column) => sum + column.width, 0);
      // Plus the 96px pinned actions column, against a 1440px laptop.
      expect(width + 96).toBeLessThanOrEqual(1344);
    });
  });

  it('only marks a select dependent on a field that exists on the same form', () => {
    [...TAB_ORDER, ...ADMIN_TABS].forEach((tab) => {
      const keys = SCHEMA[tab].fields.map((field) => field.key);
      SCHEMA[tab].fields
        .filter((field) => field.dependsOn)
        .forEach((field) => expect(keys).toContain(field.dependsOn));
    });
  });
});
