import {
  change,
  compactMoney,
  describeChange,
  describePending,
  money,
  shortDate,
  summariseTrend
} from './dashboardFormat';

describe('change', () => {
  it('reports direction and magnitude', () => {
    expect(change(150, 100)).toEqual({ direction: 'up', percent: 50, delta: 50 });
    expect(change(80, 100)).toEqual({ direction: 'down', percent: 20, delta: -20 });
    expect(change(100, 100)).toEqual({ direction: 'flat', percent: 0, delta: 0 });
  });

  it('refuses to invent a percentage when the base was zero', () => {
    // Yesterday nothing was sold. "Up 100%" would be arithmetic on nothing, and
    // dividing by zero gives Infinity, which is what the tile used to show.
    expect(change(142670, 0)).toEqual({ direction: 'up', percent: null, delta: 142670 });
    expect(describeChange(change(142670, 0), 'prev day')).toBe('Up from nothing prev day');
  });

  it('measures a change against a negative base by magnitude', () => {
    // Pending can be negative when old dues are collected, so the base can be
    // below zero and the sign of the percentage must not flip.
    expect(change(-50, -100)).toEqual({ direction: 'up', percent: 50, delta: 50 });
  });

  it('treats a missing figure as zero rather than NaN', () => {
    expect(change(undefined, null)).toEqual({ direction: 'flat', percent: 0, delta: 0 });
  });
});

describe('describePending', () => {
  it('reads a positive figure as money not yet collected', () => {
    const result = describePending(18280, 142670, 124390);
    expect(result.tone).toBe('error');
    expect(result.headline).toBe('₹18,280');
  });

  it('explains a negative figure as recovery of older dues', () => {
    // Real case: month to date billed 22,61,720 and collected 23,76,760, so
    // pending is -1,15,040. That is not a credit balance and not an error.
    const result = describePending(-115040, 2261720, 2376760);
    expect(result.tone).toBe('success');
    expect(result.headline).toBe('₹1,15,040');
    expect(result.note).toMatch(/older dues recovered/);
    expect(result.note).toMatch(/105.1%/);
  });

  it('separates "nothing billed" from "all collected"', () => {
    expect(describePending(0, 0, 0).note).toBe('Nothing billed');
    expect(describePending(0, 5000, 5000).note).toBe('Everything billed was collected');
  });
});

describe('summariseTrend', () => {
  const points = [
    { date: '2026-09-01', amount: 100000, received: 90000, traded: true },
    { date: '2026-09-02', amount: 0, received: 0, traded: false },
    { date: '2026-09-03', amount: 300000, received: 280000, traded: true }
  ];

  it('averages over trading days, not calendar days', () => {
    const summary = summariseTrend(points);
    expect(summary.tradingDays).toBe(2);
    expect(summary.calendarDays).toBe(3);
    // 400000 over the two days that traded, not over three.
    expect(summary.averagePerTradingDay).toBe(200000);
  });

  it('scales to the larger of billed and collected', () => {
    const summary = summariseTrend([{ amount: 10, received: 900, traded: true }]);
    expect(summary.peak).toBe(900);
  });

  it('names the best trading day', () => {
    expect(summariseTrend(points).best.date).toBe('2026-09-03');
  });

  it('survives an empty series', () => {
    const summary = summariseTrend([]);
    expect(summary).toMatchObject({ peak: 0, tradingDays: 0, averagePerTradingDay: 0, best: null });
  });
});

describe('formatting', () => {
  it('groups money the Indian way, without decimals', () => {
    expect(money(20367397)).toBe('₹2,03,67,397');
    expect(money(-115040)).toBe('₹-1,15,040');
  });

  it('shortens large figures to crore and lakh', () => {
    expect(compactMoney(153368710)).toBe('₹15.34 Cr');
    expect(compactMoney(2261720)).toBe('₹22.62 L');
    expect(compactMoney(45600)).toBe('₹45,600');
    expect(compactMoney(-533000)).toBe('-₹5.33 L');
  });

  it('spells September as three letters, like every other month', () => {
    expect(shortDate('2026-09-09')).toBe('09 Sep 2026');
  });
});
