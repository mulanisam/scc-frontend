/**
 * What each master-data table holds, stated explicitly.
 *
 * The screen used to derive its columns and its form fields from
 * `Object.keys(data[0])` - whatever the API happened to return. That had three costs.
 * The customer table showed fourteen columns including `whatsappOptOutAt` and
 * `creditLimitEnabled`, so the five a person actually reads were pushed off the right
 * edge. The form offered the same fourteen as text boxes, including ones that write
 * nowhere. And because a key was all the screen knew, it could not tell that `route`
 * reads as a name but has to be sent as an id - which is why editing a city failed
 * with "Error updating cities" until somebody re-picked the route from the dropdown.
 *
 * Declaring it instead means each table shows the columns worth reading, in a sensible
 * order, at widths that fit; the form asks for the fields the API actually accepts; and
 * one place knows how to turn a row back into a payload.
 */

/**
 * Indian grouping, no decimals - master data balances are round figures.
 *
 * Absent and zero are different facts and are shown differently: a supplier with no
 * pending payment recorded is not the same as one settled to the rupee. The null check
 * has to come first because Number(null) is 0, which is finite - so testing only for
 * finiteness reported every blank as "₹0".
 */
const money = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const shortDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

/** 98765 43210, the way a number is read back over the phone. */
const mobile = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(-10);
  if (!digits) return '—';
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : String(value);
};

export const FORMATTERS = { money, shortDate, mobile };

/**
 * How many days before an expiry date counts as "due".
 *
 * A month, because renewing a vehicle's papers means a trip to the RTO and a
 * same-week warning is no use.
 */
export const EXPIRY_WARNING_DAYS = 30;

export const VEHICLE_DATE_FIELDS = [
  { key: 'passingDate', label: 'Passing' },
  { key: 'insuranceDate', label: 'Insurance' },
  { key: 'fitnessDate', label: 'Fitness' },
  { key: 'pucdate', label: 'PUC' }
];

/**
 * The tables, their columns and their form fields.
 *
 * `columns[].priority` decides what survives a narrow screen: 1 is always shown, 2 is
 * dropped below about a tablet, 3 below a laptop. The identifying column is always
 * priority 1 - a row you cannot name is not worth showing.
 *
 * `fields[].type` drives the input: text, number, date, mobile, or select. A select
 * names its option list in `options`, and `dependsOn` filters those options by another
 * field's value - cities belong to routes, and offering all 171 of them when a route is
 * already chosen is how the wrong city gets picked.
 */
export const SCHEMA = {
  customers: {
    label: 'Customers',
    singular: 'customer',
    /** Used in the delete confirmation and the form title. */
    nameKey: 'name',
    columns: [
      { key: 'name', label: 'Customer', width: 190, priority: 1, bold: true },
      { key: 'shopName', label: 'Shop', width: 170, priority: 2 },
      { key: 'mobileNo', label: 'Mobile', width: 125, priority: 1, format: 'mobile', numeric: true },
      { key: 'alternateMobileNo', label: '2nd mobile', width: 125, priority: 3, format: 'mobile', numeric: true },
      { key: 'city', label: 'City', width: 120, priority: 2 },
      { key: 'route', label: 'Route', width: 105, priority: 2 },
      { key: 'balanceAmount', label: 'Balance', width: 115, priority: 1, format: 'money', align: 'right', numeric: true },
      { key: 'address', label: 'Address', width: 150, priority: 3 }
    ],
    fields: [
      { key: 'name', label: 'Customer name', required: true, autoFocus: true },
      { key: 'shopName', label: 'Shop name' },
      { key: 'mobileNo', label: 'Mobile number', type: 'mobile' },
      {
        key: 'alternateMobileNo',
        label: 'Second mobile number',
        type: 'mobile',
        help: 'Used only when the first number cannot be reached'
      },
      { key: 'route', label: 'Route', type: 'select', options: 'routes', required: true },
      {
        key: 'city',
        label: 'City',
        type: 'select',
        options: 'cities',
        dependsOn: 'route',
        required: true,
        help: 'Cities on the chosen route'
      },
      { key: 'address', label: 'Address', full: true },
      {
        key: 'balanceAmount',
        label: 'Opening balance',
        type: 'number',
        createOnly: true,
        help: 'Only set when adding a customer. After that the ledger owns the balance.'
      }
    ]
  },

  routes: {
    label: 'Routes',
    singular: 'route',
    nameKey: 'name',
    columns: [
      { key: 'name', label: 'Route', width: 160, priority: 1, bold: true },
      { key: 'cities', label: 'Cities on this route', width: 520, priority: 1, wrap: true }
    ],
    fields: [
      { key: 'name', label: 'Route name', required: true, autoFocus: true }
    ],
    // Cities are attached from the city's own record, which is the only side that can
    // set the foreign key. Offering a cities box here would look editable and silently
    // do nothing.
    note: 'A city is put on a route from the Cities tab.'
  },

  cities: {
    label: 'Cities',
    singular: 'city',
    nameKey: 'name',
    columns: [
      { key: 'name', label: 'City', width: 200, priority: 1, bold: true },
      { key: 'route', label: 'Route', width: 160, priority: 1 }
    ],
    fields: [
      { key: 'name', label: 'City name', required: true, autoFocus: true },
      { key: 'route', label: 'Route', type: 'select', options: 'routes', required: true }
    ]
  },

  drivers: {
    label: 'Drivers',
    singular: 'driver',
    nameKey: 'name',
    columns: [
      { key: 'name', label: 'Driver', width: 200, priority: 1, bold: true },
      { key: 'mobileNo', label: 'Mobile', width: 140, priority: 1, format: 'mobile', numeric: true },
      { key: 'address', label: 'Address', width: 240, priority: 2 }
    ],
    fields: [
      { key: 'name', label: 'Driver name', required: true, autoFocus: true },
      { key: 'mobileNo', label: 'Mobile number', type: 'mobile' },
      { key: 'address', label: 'Address', full: true }
    ]
  },

  vehicles: {
    label: 'Vehicles',
    singular: 'vehicle',
    nameKey: 'vehicleNo',
    columns: [
      { key: 'vehicleNo', label: 'Vehicle', width: 140, priority: 1, bold: true },
      { key: 'model', label: 'Model', width: 140, priority: 2 },
      { key: 'passingDate', label: 'Passing', width: 120, priority: 1, format: 'shortDate', expiry: true },
      { key: 'insuranceDate', label: 'Insurance', width: 120, priority: 1, format: 'shortDate', expiry: true },
      { key: 'fitnessDate', label: 'Fitness', width: 120, priority: 2, format: 'shortDate', expiry: true },
      { key: 'pucdate', label: 'PUC', width: 120, priority: 2, format: 'shortDate', expiry: true }
    ],
    fields: [
      { key: 'vehicleNo', label: 'Vehicle number', required: true, autoFocus: true },
      { key: 'model', label: 'Model' },
      { key: 'passingDate', label: 'Passing valid until', type: 'date' },
      { key: 'insuranceDate', label: 'Insurance valid until', type: 'date' },
      { key: 'fitnessDate', label: 'Fitness valid until', type: 'date' },
      { key: 'pucdate', label: 'PUC valid until', type: 'date' }
    ]
  },

  suppliers: {
    label: 'Suppliers',
    singular: 'supplier',
    nameKey: 'name',
    columns: [
      { key: 'name', label: 'Supplier', width: 220, priority: 1, bold: true },
      { key: 'branch', label: 'Branch', width: 180, priority: 1 },
      { key: 'pendingPayment', label: 'Pending', width: 140, priority: 1, format: 'money', align: 'right', numeric: true }
    ],
    fields: [
      { key: 'name', label: 'Supplier name', required: true, autoFocus: true },
      { key: 'branch', label: 'Branch' },
      { key: 'pendingPayment', label: 'Pending payment', type: 'number' }
    ]
  },

  parties: {
    label: 'Parties',
    singular: 'party',
    nameKey: 'name',
    columns: [
      { key: 'name', label: 'Party', width: 190, priority: 1, bold: true },
      { key: 'owner', label: 'Owner', width: 170, priority: 1 },
      { key: 'city', label: 'City', width: 130, priority: 2 },
      { key: 'address', label: 'Address', width: 170, priority: 3 },
      { key: 'balanceAmount', label: 'Balance', width: 130, priority: 1, format: 'money', align: 'right', numeric: true },
      { key: 'vehicleNumbers', label: 'Vehicles', width: 200, priority: 2, wrap: true }
    ],
    fields: [
      { key: 'name', label: 'Party name', required: true, autoFocus: true },
      { key: 'owner', label: 'Owner' },
      { key: 'city', label: 'City' },
      { key: 'address', label: 'Address', full: true },
      { key: 'balanceAmount', label: 'Balance', type: 'number' },
      {
        key: 'vehicleNumbers',
        label: 'Vehicles',
        type: 'list',
        full: true,
        help: 'Registration numbers of the vehicles this party uses'
      }
    ]
  }
  /*
   * Party vehicles no longer have a tab of their own.
   *
   * They were never separate things - one attribute, and nothing anywhere referring to
   * one - and the tab could not add one anyway: that endpoint bound the entity, so the
   * bare party id the form sent came back as a 400 every time it was used. A party's
   * vehicles are now a field on the party, saved with it.
   */
};

export const TAB_ORDER = [
  'customers', 'cities', 'routes', 'drivers', 'vehicles', 'suppliers'
];

export const ADMIN_TABS = ['parties'];

/**
 * Flattens an API row into the shape the table reads.
 *
 * Associations come back as objects and are shown as names. Kept here with
 * {@link toPayload}, which has to reverse it, so the two cannot drift - they did, and
 * the result was a form that sent "Route 1" to a Long field.
 */
export const toRow = (type, raw) => {
  switch (type) {
    case 'customers':
      return {
        ...raw,
        city: raw.city?.name ?? '',
        route: raw.city?.route?.name ?? '',
        // Kept so the form can preselect without another lookup by name.
        cityId: raw.city?.id ?? '',
        routeId: raw.city?.route?.id ?? ''
      };
    case 'cities':
      return {
        ...raw,
        customers: undefined,
        route: raw.route?.name ?? '',
        routeId: raw.route?.id ?? ''
      };
    case 'routes':
      return { ...raw, cities: (raw.cities ?? []).map((c) => c.name).join(', ') };
    case 'parties':
      return {
        ...raw,
        // Joined for the column, kept as an array for the form.
        vehicleNumbers: (raw.vehicleNumbers ?? []).join(', '),
        vehicleNumberList: raw.vehicleNumbers ?? []
      };
    default:
      return raw;
  }
};

/**
 * Turns the form's values into the body the endpoint expects.
 *
 * Every shape difference between reading and writing lives here:
 *
 *  - customers and cities take `route`/`city` as bare ids, though they return objects
 *  - a party's vehicles go as an array of registration numbers, and come back joined
 *    into one string for the table column
 *  - a customer's balance is a String on the DTO and is parsed without a null check,
 *    so it always has to be present
 *  - parties use `isObsolete`, everything else uses `obsolete`
 */
export const toPayload = (type, form) => {
  const base = {};
  SCHEMA[type].fields.forEach((field) => {
    const value = form[field.key];
    base[field.key] = value === undefined ? '' : value;
  });

  switch (type) {
    case 'customers':
      return {
        ...base,
        route: form.route === '' ? null : Number(form.route),
        city: form.city === '' ? null : Number(form.city),
        // The DTO parses this straight into a BigDecimal with no null check, so a blank
        // would be a 500. An existing customer keeps the figure the ledger maintains.
        balanceAmount: String(
          form.balanceAmount === '' || form.balanceAmount == null ? 0 : form.balanceAmount
        ),
        obsolete: false
      };

    case 'cities':
      return { ...base, route: form.route === '' ? null : Number(form.route), obsolete: false };

    case 'parties':
      return {
        ...base,
        balanceAmount: form.balanceAmount === '' ? 0 : Number(form.balanceAmount),
        // An array of registration numbers. The server tidies and de-duplicates them,
        // since "mh13 cu 4916" and "MH13CU4916" are one lorry.
        vehicleNumbers: Array.isArray(form.vehicleNumbers)
          ? form.vehicleNumbers.map((number) => String(number).trim()).filter(Boolean)
          : [],
        isObsolete: false
      };

    case 'suppliers':
      return {
        ...base,
        pendingPayment: form.pendingPayment === '' ? 0 : Number(form.pendingPayment),
        obsolete: false
      };

    case 'vehicles':
      // Blank dates must be null, not "": Jackson cannot read "" as a LocalDate.
      return {
        ...base,
        ...Object.fromEntries(VEHICLE_DATE_FIELDS.map(({ key }) => [key, form[key] || null])),
        obsolete: false
      };

    default:
      return { ...base, obsolete: false };
  }
};

/** The values a form opens with, for a new record or an existing row. */
export const toForm = (type, row) => {
  const form = {};
  SCHEMA[type].fields.forEach((field) => {
    // A list field is an array even when empty, so the editor never has to guess
    // whether '' means "no vehicles" or "not loaded yet".
    if (field.type === 'list') {
      form[field.key] = [];
      return;
    }
    form[field.key] = row?.[field.key] ?? '';
  });

  if (!row) {
    return form;
  }

  form.id = row.id;

  /*
   * Selects hold ids, and the row holds names.
   *
   * This is the bug that made editing a city impossible: the dropdown had no option
   * matching "Route 1", so it rendered blank and saving sent the name to a Long field.
   * toRow keeps the ids alongside the names precisely so this does not need a lookup
   * by name, which would also have picked the wrong record for two routes sharing one.
   */
  if (type === 'customers') {
    form.route = row.routeId ?? '';
    form.city = row.cityId ?? '';
  }
  if (type === 'cities') {
    form.route = row.routeId ?? '';
  }
  // The column holds a joined string; the editor needs the array back.
  if (type === 'parties') {
    form.vehicleNumbers = row.vehicleNumberList ?? [];
  }

  return form;
};

/** Which required fields are still empty. */
export const missingRequired = (type, form) =>
  SCHEMA[type].fields
    .filter((field) => field.required)
    .filter((field) => String(form[field.key] ?? '').trim() === '')
    .map((field) => field.label);

/**
 * How close a date is to lapsing: 'expired', 'due', or null.
 *
 * Returned rather than rendered, so the table can colour the cell and the header can
 * count how many vehicles need attention from the same rule.
 */
export const expiryState = (value) => {
  if (!value) return null;

  /*
   * Parsed as a local calendar date, not through Date(string).
   *
   * new Date('2026-09-12') is UTC midnight, while "today" is local midnight - so the two
   * are offset by the timezone and the comparison drifts by a day. East of Greenwich that
   * is harmless; west of it, a certificate expiring today reads as already expired. These
   * are calendar dates on a paper document with no time of day, so both sides stay local.
   */
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date - today) / 86400000);

  if (days < 0) return 'expired';
  if (days <= EXPIRY_WARNING_DAYS) return 'due';
  return null;
};
