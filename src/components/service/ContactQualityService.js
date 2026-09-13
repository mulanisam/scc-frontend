import apiClient from './api.js';

/**
 * Customer contact-book quality.
 *
 * Exists so WhatsApp statements can be switched on safely: a statement carries a
 * balance, so it can only go to a number that is valid and belongs to exactly one
 * customer. Neither is true for 157 of 488 customers today.
 */

/**
 * Who cannot be messaged and why, plus the numbers shared by more than one
 * customer, with the likely-duplicate ones flagged.
 */
export const fetchContactQuality = async () => {
  const response = await apiClient.get('/user/customers/contact-quality');
  return response.data;
};

/**
 * Corrects one customer's mobile number and nothing else.
 *
 * PATCH rather than the existing PUT /user/customers/{id}, which takes a whole
 * CustomerDTO - sending a partial one through that would blank every field left
 * out. The server rejects an invalid number and a number already held by another
 * customer, with the reason in the message.
 */
/**
 * Sets one of a customer's two numbers.
 *
 * @param {boolean} alternate true for the shop's second number. A blank value clears
 *   it; the main number cannot be cleared, only replaced, because blanking it would
 *   make a reachable customer unreachable.
 */
export const updateCustomerMobile = async (customerId, mobileNo, alternate = false) => {
  const response = await apiClient.patch(
    `/user/customers/${customerId}/mobile`,
    { mobileNo, alternate }
  );
  return response.data;
};

const ContactQualityService = { fetchContactQuality, updateCustomerMobile };

export default ContactQualityService;
