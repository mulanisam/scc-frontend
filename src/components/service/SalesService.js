import apiClient from './api.js';

/**
 * Sales API.
 *
 * All requests go through `apiClient`, which attaches the bearer token and
 * normalises errors. Callers receive the raw axios response and read `.data`.
 */

const getRoutes = () => apiClient.get('/user/routes');

const getDrivers = () => apiClient.get('/user/drivers');

const getVehicles = () => apiClient.get('/user/vehicles');

const getCustomersByRoute = (routeId) =>
  apiClient.get(`/user/customers/byRoute/${routeId}`);

const createSalesEntry = (salesEntry) =>
  apiClient.post('/user/sales/bulk', salesEntry);

const createSingleSale = (saleData) =>
  apiClient.post('/user/sales/single', saleData);

const saveSaleDetailsData = (salesDetails) =>
  apiClient.post('/user/sales/saveDetails', salesDetails);

const getSaleDetailsByCriteria = (date, route, vehicle, driver) =>
  apiClient.get('/user/sales/saleDetails', {
    params: { date, route, vehicle, driver }
  });

/**
 * What the server knows about a date and route before we submit: whether a trip
 * is already recorded (a possible duplicate) and when the route last had a sale
 * (so an earlier date can be confirmed as a backdated entry).
 */
const getTripContext = (date, routeId) =>
  apiClient.get('/user/sales/tripContext', {
    params: { date, route: routeId }
  });

export {
  getRoutes,
  getDrivers,
  getCustomersByRoute,
  createSalesEntry,
  createSingleSale,
  getVehicles,
  getSaleDetailsByCriteria,
  saveSaleDetailsData,
  getTripContext
};
