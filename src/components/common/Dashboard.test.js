import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import Dashboard from './Dashboard';
import { fetchDashboardOverview } from '../service/DashboardService';
import overview from './__fixtures__/dashboardOverview.json';

jest.mock('../service/DashboardService');

/**
 * Renders the dashboard against a payload captured from the live API, so the
 * component meets the shapes the server really sends - including the awkward ones
 * this data has: a month where more was collected than billed, a margin that is
 * not comparable, days where the bird count does not tally, and days with no
 * trading at all.
 *
 * The previous dashboard had no test, which is how three fetches to endpoints that
 * had never existed survived in the shipped code.
 */

/** The row of the given table-like panel whose first cell is `label`. */
const rowFor = (label) => {
  const cells = screen.getAllByText(label).map((node) => node.closest('tr')).filter(Boolean);
  if (!cells.length) throw new Error(`No table row found for "${label}"`);
  return cells[0];
};

describe('Dashboard', () => {
  beforeEach(() => {
    fetchDashboardOverview.mockResolvedValue(overview);
  });

  afterEach(() => jest.clearAllMocks());

  it('asks the server once and renders the day headline', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Business overview')).toBeInTheDocument());

    // One call, not four - three of the old ones hit endpoints that never existed.
    expect(fetchDashboardOverview).toHaveBeenCalledTimes(1);

    // Billed on 09 Sep 2026 was 1,42,670. It appears in the headline tile and
    // again in that day's row of the table below, which is intended.
    expect(screen.getAllByText('₹1,42,670').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('09 Sep 2026 · generated', { exact: false })).toBeInTheDocument();
  });

  it('shows the day\'s bird movement and whether it tallies', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/Bird movement/)).toBeInTheDocument());

    // The strip is its own panel; "Mortality" is also a column header and a row
    // label elsewhere, so the assertions are scoped to it.
    const strip = screen.getByText(/Bird movement/).closest('.MuiPaper-root');

    // 710 loaded = 636 sold + 8 mortality + 62 to farm leaves 4 unaccounted for.
    expect(within(strip).getByText('710')).toBeInTheDocument();
    expect(within(strip).getByText('636')).toBeInTheDocument();
    expect(within(strip).getByText('Mortality')).toBeInTheDocument();
    expect(within(strip).getByText('8')).toBeInTheDocument();
    expect(within(strip).getByText('Returned to farm')).toBeInTheDocument();
    expect(within(strip).getByText('62')).toBeInTheDocument();
    expect(within(strip).getByText(/4 birds unaccounted for/)).toBeInTheDocument();
  });

  it('lists every day with mortality, returns and a tally that adds up', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Day by day, last 14 days')).toBeInTheDocument());

    // 28 Aug tallies exactly: 1633 loaded, 1391 sold, 9 mortality, 233 to farm.
    const tallying = rowFor('28 Aug');
    expect(within(tallying).getByText('1,633')).toBeInTheDocument();
    expect(within(tallying).getByText('1,391')).toBeInTheDocument();
    expect(within(tallying).getByText('tallies')).toBeInTheDocument();

    // 08 Sep does not: 2190 - 1661 - 15 - 282 leaves 232.
    const mismatch = rowFor('08 Sep');
    expect(within(mismatch).getByText('+232')).toBeInTheDocument();

    // 11 of the 14 days do not tally, and the panel says so up front.
    expect(screen.getByText(/11 of 14 days do not tally/)).toBeInTheDocument();
  });

  it('does not draw a chart', async () => {
    const { container } = render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Day by day, last 14 days')).toBeInTheDocument());

    // Only MUI icons remain; no plotted geometry.
    expect(container.querySelectorAll('svg rect').length).toBe(0);
    expect(container.querySelectorAll('svg line').length).toBe(0);
  });

  it('shows every route trading in the month with its share', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Route by route')).toBeInTheDocument());

    overview.routesMonthToDate.forEach((route) => {
      expect(screen.getAllByText(route.routeName).length).toBeGreaterThan(0);
    });
    // Route 7 is the largest at 22.2% of the month.
    expect(screen.getByText('22.2%')).toBeInTheDocument();
  });

  it('states the receivable position and who has never paid', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Money owed to you')).toBeInTheDocument());

    expect(screen.getByText('₹2.04 Cr')).toBeInTheDocument();
    expect(screen.getByText('Sartaj Shaikh')).toBeInTheDocument();
    expect(screen.getAllByText('never paid').length).toBeGreaterThan(0);
  });

  it('refuses to present a margin the purchase data cannot support', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Bought against sold')).toBeInTheDocument());

    expect(screen.getByText('Cannot be measured yet')).toBeInTheDocument();
    expect(screen.getByText(/Purchases cover only 0.3%/)).toBeInTheDocument();
  });

  it('lists the data conditions that distort the figures', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Needs attention')).toBeInTheDocument());

    expect(screen.getByText(/2 sale\(s\) are dated after today/)).toBeInTheDocument();
    expect(screen.getByText(/887 trip\(s\) do not tally/)).toBeInTheDocument();
    expect(screen.getByText(/143 trip\(s\) hold a sold-bird count that disagrees/)).toBeInTheDocument();
    expect(screen.getByText(/3691 trip\(s\) have no loaded weight/)).toBeInTheDocument();
  });

  it('shows sales and purchases across all three windows', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Sales and purchases in full')).toBeInTheDocument());

    // 636 on the day, 8,084 for the month, 4,50,486 for the year.
    const birds = rowFor('Birds sold');
    expect(within(birds).getByText('636')).toBeInTheDocument();
    expect(within(birds).getByText('8,084')).toBeInTheDocument();
    expect(within(birds).getByText('4,50,486')).toBeInTheDocument();

    const owed = rowFor('Owed to suppliers');
    expect(within(owed).getByText('₹5,33,000')).toBeInTheDocument();
  });

  it('explains an empty day instead of showing a screen of zeros', async () => {
    fetchDashboardOverview.mockResolvedValue({
      ...overview,
      asOfDate: '2026-09-10',
      tradedOnAsOfDate: false,
      latestTradingDate: '2026-09-09',
      day: {
        ...overview.day,
        saleCount: 0,
        tripCount: 0,
        amount: 0,
        received: 0,
        pending: 0,
        birdsSold: 0,
        birdsLoaded: 0,
        mortality: 0,
        returnToFarm: 0,
        weightSold: 0,
        averageRate: 0,
        recoveryPercent: 0
      },
      routesOnDay: []
    });

    render(<Dashboard />);
    await waitFor(() =>
      expect(screen.getByText(/No sales are recorded for 10 Sep 2026/)).toBeInTheDocument());
    expect(screen.getByText(/last day with trading was 09 Sep 2026/)).toBeInTheDocument();
    // 10 Sep has no trip in the fortnight, so there is nothing to tally.
    expect(screen.getByText('No trip recorded for this day')).toBeInTheDocument();
  });

  it('surfaces a failure rather than rendering half a dashboard', async () => {
    fetchDashboardOverview.mockRejectedValue(new Error('Session expired. Please login again.'));

    render(<Dashboard />);
    await waitFor(() =>
      expect(screen.getByText('Session expired. Please login again.')).toBeInTheDocument());
  });
});
