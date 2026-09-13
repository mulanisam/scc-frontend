import {
  statementSegments,
  runHeadline,
  runTone,
  weekLabel,
  parseLocalDate,
} from './messagingFormat';
import { retryNote } from './StatementPanel';

/**
 * The statement status bar.
 *
 * This is the line somebody reads before telling a customer their statement was sent, so
 * the thing it must never do is present provider acceptance as arrival. The rest is about
 * the bar being honest at a glance: a run that is mostly grey is a consent problem and a
 * run that is mostly red is a provider problem, and they go to different people.
 */

/** A run as the API returns it, with the fields under test overridden. */
const run = (overrides = {}) => ({
  weekEnding: '2026-09-06',
  weekStarting: '2026-08-31',
  queued: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
  skipped: 0,
  cancelled: 0,
  total: 0,
  deliveryRate: null,
  hasFailures: false,
  ...overrides,
});

describe('statementSegments', () => {
  it('sizes each segment by its share of the run', () => {
    const segments = statementSegments(run({
      delivered: 50, failed: 25, skipped: 25, total: 100,
    }));

    expect(segments.map((segment) => [segment.key, segment.count, segment.percent])).toEqual([
      ['delivered', 50, 50],
      ['failed', 25, 25],
      ['skipped', 25, 25],
    ]);
  });

  it('folds read into delivered, so the greens are not double counted', () => {
    // Two adjacent green segments would invite the reader to add them up to find how
    // many arrived - and a customer who opened the statement certainly received it.
    const segments = statementSegments(run({ delivered: 8, read: 2, total: 10 }));

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ key: 'delivered', count: 10, percent: 100 });
  });

  it('drops empty segments rather than drawing slivers', () => {
    const segments = statementSegments(run({ skipped: 254, total: 254 }));

    expect(segments.map((segment) => segment.key)).toEqual(['skipped']);
    expect(segments[0].percent).toBe(100);
  });

  it('keeps accepted separate from delivered', () => {
    // The distinction the whole screen rests on: Fast2SMS taking the message is not the
    // customer receiving it, so these must never share a segment.
    const segments = statementSegments(run({ sent: 3, delivered: 7, total: 10 }));

    expect(segments.map((segment) => segment.key)).toEqual(['delivered', 'sent']);
    expect(segments.find((segment) => segment.key === 'sent').count).toBe(3);
  });

  it('has nothing to draw for an empty or missing run', () => {
    expect(statementSegments(run({ total: 0 }))).toEqual([]);
    expect(statementSegments(null)).toEqual([]);
  });
});

describe('runHeadline', () => {
  it('leads with the failures, because that is the part with an action attached', () => {
    const headline = runHeadline(run({
      failed: 4, delivered: 20, queued: 1, total: 25,
    }));

    expect(headline).toBe('25 statements: 4 failed, 20 delivered, 1 still queued.');
  });

  it('does not report an all-skipped run as a delivery failure', () => {
    // Production today: 254 skipped, nothing sent. "0 delivered" would read as the
    // provider failing when the cause is that nobody has opted in.
    expect(runHeadline(run({ skipped: 254, total: 254 })))
      .toBe('254 statements: 254 not sendable.');
  });

  it('calls an accepted run awaiting confirmation, not delivered', () => {
    expect(runHeadline(run({ sent: 30, total: 30 })))
      .toBe('30 statements: 30 awaiting confirmation.');
  });

  it('says so plainly when the week has nothing', () => {
    expect(runHeadline(run({ total: 0 }))).toBe('No statements have been built for this week.');
    expect(runHeadline(null)).toBe('No statements have been built for this week.');
  });
});

describe('runTone', () => {
  it('is red while anything failed, whatever else succeeded', () => {
    expect(runTone(run({ failed: 1, delivered: 200, total: 201 }))).toBe('error');
  });

  it('is amber while work is unfinished', () => {
    expect(runTone(run({ queued: 5, total: 5 }))).toBe('warning');
    expect(runTone(run({ sent: 5, total: 5 }))).toBe('warning');
  });

  it('is green only once something is confirmed delivered', () => {
    expect(runTone(run({ delivered: 5, total: 5 }))).toBe('success');
    // Everything skipped is not a success - nothing was sent.
    expect(runTone(run({ skipped: 5, total: 5 }))).toBe('default');
  });
});

describe('weekLabel', () => {
  it('reads as one period, with the month named once when it does not change', () => {
    expect(weekLabel('2026-09-01', '2026-09-06')).toBe('1 – 6 Sep');
  });

  it('names both months when the week crosses one', () => {
    expect(weekLabel('2026-08-31', '2026-09-06')).toBe('31 Aug – 6 Sep');
  });

  it('survives a run with no period', () => {
    expect(weekLabel(null, null)).toBe('—');
    expect(weekLabel(null, '2026-09-06')).toBe('6 Sep');
  });

  it('reads a yyyy-MM-dd date as a local one', () => {
    // new Date('2026-09-06') is UTC midnight, which west of Greenwich is the 5th - so a
    // week ending Sunday would be labelled Saturday.
    const parsed = parseLocalDate('2026-09-06');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(6);
  });
});

describe('retryNote', () => {
  it('quotes the provider when it failed again', () => {
    expect(retryNote({
      status: 'FAILED', recipientName: 'Javed Kureshi', error: 'Template not approved',
    })).toBe('It failed again for Javed Kureshi: Template not approved');
  });

  it('distinguishes queued-but-not-sent from sent', () => {
    // The dry run and the unapproved template both land here. Saying "resent" would be
    // a lie that somebody repeats to a customer.
    expect(retryNote({ status: 'PENDING', recipientName: 'Javed' }))
      .toBe('Queued for Javed, but not sent — see the reasons above.');
    expect(retryNote({ status: 'SENT', recipientName: 'Javed' }))
      .toBe('Sent again to Javed. Awaiting a delivery report.');
  });

  it('gives the skip reason, which is a contact problem rather than a send problem', () => {
    expect(retryNote({
      status: 'SKIPPED', recipientName: 'Javed', skipReason: 'Customer has not opted in',
    })).toBe('Not sent to Javed: Customer has not opted in');
  });

  it('falls back to the number when there is no name', () => {
    expect(retryNote({ status: 'SENT', recipientMobile: '7798112855' }))
      .toBe('Sent again to 7798112855. Awaiting a delivery report.');
  });
});
