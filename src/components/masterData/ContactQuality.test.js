import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactQuality from './ContactQuality';
import { fetchContactQuality, updateCustomerMobile } from '../service/ContactQualityService';

jest.mock('../service/ContactQualityService');

/**
 * Rendered against the shape the live endpoint returns, using the real production
 * cases: a customer owing two lakh with no number at all, a placeholder shared by
 * four customers, and a number recorded against seven.
 */
const payload = {
  totalCustomers: 488,
  activeCustomers: 487,
  reachable: 331,
  unusable: 130,
  onSharedNumbers: 27,
  sharedNumberCount: 11,
  unreachableBalance: 529260,
  sharedNumberBalance: 680420,
  unusableNumbers: [
    {
      customerId: 501, customerName: 'Swarup Bhale', shopName: null, cityName: 'Madha',
      mobileNo: '', status: 'MISSING', reason: 'No mobile number recorded',
      balance: 204750, lastSaleDate: '2026-09-07', saleCount: 11
    },
    {
      customerId: 39, customerName: 'Adam', shopName: 'Adam Chicken', cityName: 'Barshi',
      mobileNo: '1234567890', status: 'PLACEHOLDER', reason: 'A placeholder, not a real number',
      balance: 4240, lastSaleDate: '2026-08-30', saleCount: 20
    },
    {
      customerId: 330, customerName: 'Dada Irle', shopName: null, cityName: 'Karmala',
      mobileNo: '0', status: 'TOO_SHORT', reason: 'Too short - an Indian mobile number is 10 digits',
      balance: 0, lastSaleDate: null, saleCount: 0
    }
  ],
  sharedNumbers: [
    {
      mobileNo: '8669022313',
      customerCount: 7,
      totalBalance: 33630,
      likelyDuplicateCustomer: false,
      suggestion: 'Confirm which customer owns this phone, and record the others\' own numbers.',
      customers: [
        { customerId: 1, customerName: 'shifa', shopName: null, cityName: 'Madha', mobileNo: '8669022313', status: 'SHARED', reason: 'This number is recorded against 7 customers', balance: 5000, lastSaleDate: '2026-09-01', saleCount: 4 },
        { customerId: 2, customerName: 'budan', shopName: null, cityName: 'Madha', mobileNo: '8669022313', status: 'SHARED', reason: 'This number is recorded against 7 customers', balance: 4000, lastSaleDate: '2026-09-02', saleCount: 3 }
      ]
    },
    {
      mobileNo: '7709399507',
      customerCount: 2,
      totalBalance: 61150,
      likelyDuplicateCustomer: true,
      suggestion: 'These look like one customer entered twice, not two people sharing a phone.',
      customers: [
        { customerId: 10, customerName: 'Salman Darfal', shopName: null, cityName: 'Barshi', mobileNo: '7709399507', status: 'SHARED', reason: 'This number is recorded against 2 customers', balance: 40000, lastSaleDate: '2026-09-05', saleCount: 30 },
        { customerId: 11, customerName: 'Salman Darfal', shopName: null, cityName: 'Barshi', mobileNo: '7709399507', status: 'SHARED', reason: 'This number is recorded against 2 customers', balance: 21150, lastSaleDate: '2026-09-06', saleCount: 12 }
      ]
    }
  ]
};

describe('ContactQuality', () => {
  beforeEach(() => {
    fetchContactQuality.mockResolvedValue(payload);
    updateCustomerMobile.mockResolvedValue({ id: 501, mobileNo: '9876543211' });
  });

  afterEach(() => jest.clearAllMocks());

  it('leads with what is unreachable and what it is worth', async () => {
    render(<ContactQuality />);
    await waitFor(() => expect(screen.getByText('Can be messaged')).toBeInTheDocument());

    expect(screen.getByText('331')).toBeInTheDocument();
    expect(screen.getByText('130')).toBeInTheDocument();
    // 5,29,260 owed by customers who cannot be contacted.
    expect(screen.getByText(/₹5.29 L owed, unreachable/)).toBeInTheDocument();
  });

  it('puts the largest unreachable balance first', async () => {
    render(<ContactQuality />);
    await waitFor(() => expect(screen.getByText('Swarup Bhale')).toBeInTheDocument());

    const row = screen.getByText('Swarup Bhale').closest('tr');
    expect(within(row).getByText('₹2,04,750')).toBeInTheDocument();
    expect(within(row).getByText('No number')).toBeInTheDocument();
    expect(within(row).getByText('07 Sep 2026')).toBeInTheDocument();
  });

  it('shows a bad number exactly as recorded rather than tidying it', async () => {
    render(<ContactQuality />);
    await waitFor(() => expect(screen.getByText('Adam')).toBeInTheDocument());

    // Displayed as stored, so the operator sees the placeholder itself.
    expect(within(screen.getByText('Adam').closest('tr')).getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('Placeholder')).toBeInTheDocument();
  });

  it('groups a shared number and warns when it looks like one customer twice', async () => {
    render(<ContactQuality />);
    await waitFor(() => expect(screen.getByText('86690 22313')).toBeInTheDocument());

    expect(screen.getByText('7 customers')).toBeInTheDocument();
    expect(screen.getByText('₹33,630 between them')).toBeInTheDocument();

    // "Salman Darfal" twice on one number is a duplicate record, not a shared
    // phone. Scoped to that group's card, because the warning above the list
    // mentions the same words when explaining what the marker means.
    const duplicateGroup = screen.getByText('77093 99507').closest('.MuiPaper-root');
    expect(within(duplicateGroup).getByText('Likely duplicate')).toBeInTheDocument();
    expect(within(duplicateGroup).getAllByText('Salman Darfal')).toHaveLength(2);
    expect(within(duplicateGroup).getByText(/one customer entered twice/)).toBeInTheDocument();

    // And the number held by seven is not flagged as a duplicate - those are
    // genuinely different people sharing a phone.
    const sharedGroup = screen.getByText('86690 22313').closest('.MuiPaper-root');
    expect(within(sharedGroup).queryByText('Likely duplicate')).not.toBeInTheDocument();
  });

  it('will not save until the number is complete and valid', async () => {
    render(<ContactQuality />);
    await waitFor(() => expect(screen.getByText('Swarup Bhale')).toBeInTheDocument());

    const row = screen.getByText('Swarup Bhale').closest('tr');
    const input = within(row).getByPlaceholderText('10-digit mobile');

    await userEvent.type(input, '98765');
    expect(within(row).getByText('5 of 10 digits')).toBeInTheDocument();
    expect(updateCustomerMobile).not.toHaveBeenCalled();

    await userEvent.clear(input);
    await userEvent.type(input, '1234567890');
    expect(within(row).getByText(/placeholder/i)).toBeInTheDocument();

    await userEvent.clear(input);
    // Enter saves, so a list of 130 can be worked without reaching for the mouse.
    await userEvent.type(input, '98765 43211{enter}');

    // The third argument says which of the customer's two numbers this is. false here,
    // because this editor writes the main one; the second-number editor beside it passes
    // true. Asserted rather than ignored - sending it the wrong way round would quietly
    // overwrite a working number with a fallback.
    await waitFor(() => expect(updateCustomerMobile).toHaveBeenCalledWith(501, '98765 43211', false));
    // Confirmed in place, so a long list shows what has been done.
    expect(await within(row).findByText('98765 43211')).toBeInTheDocument();
  });

  it('shows the server reason when a number is already taken', async () => {
    updateCustomerMobile.mockRejectedValue(
      new Error('That number is already recorded for sani pawar.'));

    render(<ContactQuality />);
    await waitFor(() => expect(screen.getByText('Swarup Bhale')).toBeInTheDocument());

    const row = screen.getByText('Swarup Bhale').closest('tr');
    await userEvent.type(within(row).getByPlaceholderText('10-digit mobile'), '8669022313{enter}');

    await waitFor(() => expect(
      screen.getByText(/already recorded for sani pawar/)).toBeInTheDocument());
  });

  it('drops its own page heading when embedded in Master Data', async () => {
    const { rerender } = render(<ContactQuality />);
    await waitFor(() =>
      expect(screen.getByText('Customer contact clean-up')).toBeInTheDocument());

    rerender(<ContactQuality embedded />);
    await waitFor(() =>
      expect(screen.queryByText('Customer contact clean-up')).not.toBeInTheDocument());
    // The rest of the screen is unchanged.
    expect(screen.getByText('Can be messaged')).toBeInTheDocument();
  });

  it('reports a load failure rather than showing an empty list', async () => {
    fetchContactQuality.mockRejectedValue(new Error('Session expired. Please login again.'));

    render(<ContactQuality />);
    await waitFor(() =>
      expect(screen.getByText('Session expired. Please login again.')).toBeInTheDocument());
  });
});
