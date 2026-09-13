import axios from 'axios';
import { API_BASE_URL } from '../../config/axiosConfig.js';

const getToken = () => localStorage.getItem('token');

// Fetch list of parties
const getParties = () => {
  return axios.get(`${API_BASE_URL}/user/parties`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

// Fetch list of vendors
const getSuppliers = () => {
  return axios.get(`${API_BASE_URL}/user/suppliers`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

/**
 * The registration numbers of one party's vehicles.
 *
 * Read off the party itself. There used to be a /user/partyVehicles/party/{id} endpoint
 * behind this, along with an entity, a repository and a Master Data tab - all to hold a
 * registration number against a party. The numbers are a field on the party now, so this
 * is one fewer round trip and one fewer thing to keep in step.
 *
 * Resolves to a plain array of strings.
 */
const getVehiclesByParty = async (partyId) => {
  const response = await axios.get(`${API_BASE_URL}/user/parties/${partyId}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return response.data?.vehicleNumbers ?? [];
};

/*
 * The trading entry endpoints.
 *
 * These three were all pointed at paths no controller has ever mapped - `/trading/sale`,
 * `/trading/payment` and `/user/balanceAmount` - so every load and every party payment
 * entered on the trading screen returned 404 and was reported as "Error creating ... entry".
 * The controller is and always was `/api/trading`, and a party payment had no endpoint at
 * all until one was written.
 *
 * Worth stating because the failure was silent in the worst way: the money had been taken
 * and the balance never moved, and the screen's message read like a glitch rather than like
 * nothing having been saved.
 */
const TRADING_API = '/api/trading';

/** What a party owes, for the entry screen's header. */
const getBalanceAmount = (partyId, vendorId) => {
  return axios.get(`${API_BASE_URL}${TRADING_API}/balanceAmount`, {
    params: { partyId, vendorId },
    headers: { Authorization: `Bearer ${getToken()}` }
  });
};

/** Records a load delivered to a party, and messages them if asked. */
const createSalesEntry = (salesEntry) => {
  return axios.post(`${API_BASE_URL}${TRADING_API}`, salesEntry, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    }
  });
};

/**
 * Records money received from a party.
 *
 * Goes to the same payment service a retail receipt does, so it reaches the same ledger
 * account and the same statement - a party's account is a customer ledger account.
 */
const createPaymentEntry = (paymentEntry) => {
  return axios.post(`${API_BASE_URL}${TRADING_API}/payment`, paymentEntry, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`
    }
  });
};


/*
 * The wholesale ledger and reports.
 *
 * Under /adminuser, so office staff reach them as well as administrators - the same line
 * already drawn for the customer ledger, which shows the same balances.
 *
 * Separate endpoints from the retail reports on purpose: a route report is read per trip
 * and per driver, trading per party, and route 9 spent six months inside the route reports
 * distorting exactly those figures.
 */
const TRADING_BASE = '/adminuser/trading';

const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

const dateParams = ({ from, to } = {}) => ({
  params: { from: from || undefined, to: to || undefined }
});

/** Every party with what they owe now, heaviest debt first. */
const getTradingParties = async (range) => {
  const response = await axios.get(`${API_BASE_URL}${TRADING_BASE}/parties`, {
    headers: authHeader(),
    ...dateParams(range)
  });
  return response.data ?? [];
};

/** One party's loads plus the account statement they were billed to. */
const getPartyLedger = async (partyId, range) => {
  const response = await axios.get(`${API_BASE_URL}${TRADING_BASE}/parties/${partyId}/ledger`, {
    headers: authHeader(),
    ...dateParams(range)
  });
  return response.data;
};

/** What the wholesale side did over a period, by party and by day. */
const getTradingReport = async (range) => {
  const response = await axios.get(`${API_BASE_URL}${TRADING_BASE}/report`, {
    headers: authHeader(),
    ...dateParams(range)
  });
  return response.data;
};

/**
 * A party's statement PDF, rendered by the server.
 *
 * The same generator and the same layout as a retail customer's, on the same ledger
 * account - so a party who was a route customer until last week sees no change in the
 * document that arrives. responseType blob is required or axios decodes it as text and
 * the saved file is corrupt.
 */
const getPartyStatementPdf = async (partyId, { startDate, endDate } = {}) => {
  const response = await axios.get(`${API_BASE_URL}${TRADING_BASE}/parties/${partyId}/statement.pdf`, {
    headers: authHeader(),
    params: { startDate: startDate || undefined, endDate: endDate || undefined },
    responseType: 'blob',
    timeout: 60000
  });

  const disposition = response.headers?.['content-disposition'] ?? '';
  const match = /filename=\s*"?([^";]+)"?/i.exec(disposition);
  return { blob: response.data, fileName: match ? match[1].trim() : `statement-party-${partyId}.pdf` };
};

export {
  getParties,
  getSuppliers,
  getVehiclesByParty,
  getBalanceAmount,
  createSalesEntry,
  createPaymentEntry,
  getTradingParties,
  getPartyLedger,
  getTradingReport,
  getPartyStatementPdf
};
