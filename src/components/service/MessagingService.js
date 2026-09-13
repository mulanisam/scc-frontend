import apiClient from './api';

/**
 * The messaging dashboard's calls, in one place.
 *
 * Under /adminuser, so office staff and administrators both reach it. It was /admin
 * only, which meant the people entering the day's sales - the ones customers ask "did
 * my message come through" - could not answer that or resend a failure themselves.
 */
const BASE = '/adminuser/messaging';

/** Counts by channel and status, the delivery rate, reachability, and the config. */
export const getStats = async (days = 7) => {
  const response = await apiClient.get(`${BASE}/stats`, { params: { days } });
  return response.data;
};

/**
 * The message list. `channel`, `status` and `type` are optional and combine; pass 'ALL'
 * or omit them for no filter.
 */
export const getMessages = async ({ channel, status, type, from, to, limit = 100 } = {}) => {
  const response = await apiClient.get(`${BASE}/messages`, {
    params: {
      channel: channel && channel !== 'ALL' ? channel : undefined,
      status: status && status !== 'ALL' ? status : undefined,
      type: type && type !== 'ALL' ? type : undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
    },
  });
  return response.data;
};

/** Everything ever sent to one customer. */
export const getCustomerMessages = async (customerId, limit = 50) => {
  const response = await apiClient.get(`${BASE}/customer/${customerId}`, { params: { limit } });
  return response.data;
};

/**
 * Sends a failed message again. Resolves with the NEW row - the original keeps its
 * failure, so the caller should add this to the list rather than replace anything.
 */
export const resendMessage = async (id) => {
  const response = await apiClient.post(`${BASE}/${id}/resend`);
  return response.data;
};

/**
 * Sends an approved template to any number.
 *
 * @param {string[]} values the template's variables, in the template's own order
 */
export const sendCustomMessage = async ({
  mobileNo, recipientName, channel, templateId, values, customerId,
}) => {
  const response = await apiClient.post(`${BASE}/send`, {
    mobileNo, recipientName, channel, templateId, values, customerId,
  });
  return response.data;
};

/** Asks Fast2SMS what became of the messages it accepted, and records the answers. */
export const syncDeliveryStatus = async () => {
  const response = await apiClient.post(`${BASE}/sync-status`);
  return response.data;
};

/** Runs the dispatcher now instead of waiting for the two-minute schedule. */
export const dispatchNow = async () => {
  const response = await apiClient.post(`${BASE}/dispatch`);
  return response.data;
};

/**
 * The WhatsApp templates on the Fast2SMS account, with each one's variable count -
 * which is what the custom-send form builds its fields from.
 *
 * The provider call is cached server-side; `refresh` drops that cache, for use right
 * after approving a template.
 */
export const getTemplates = async (refresh = false) => {
  const response = await apiClient.get(`${BASE}/templates`, { params: { refresh } });
  return response.data;
};

/**
 * Every weekly statement run, newest week first, with the counts for each.
 *
 * One row per week rather than per message: "did last week's statements go out" is the
 * question, and 254 rows do not answer it.
 */
export const getStatementRuns = async () => {
  const response = await apiClient.get(`${BASE}/weekly-statements`);
  return response.data;
};

/**
 * Builds a week's statements now instead of waiting for Monday.
 *
 * @param weekEnding the Sunday the week closed on, yyyy-MM-dd. Omitted means the last
 *        completed week, which is what the Monday job would have used.
 */
export const buildStatements = async (weekEnding) => {
  const response = await apiClient.post(`${BASE}/weekly-statements`, null, {
    params: { weekEnding: weekEnding || undefined },
  });
  return response.data;
};

/**
 * Sends the statements that are queued.
 *
 * Separate from building them because each one is rendered, uploaded and then sent - so a
 * week can be built and read before any of it goes out.
 */
export const sendQueuedStatements = async (limit = 100) => {
  const response = await apiClient.post(`${BASE}/weekly-statements/send`, null, {
    params: { limit },
  });
  return response.data;
};

const MessagingService = {
  getStats,
  getMessages,
  getCustomerMessages,
  resendMessage,
  sendCustomMessage,
  syncDeliveryStatus,
  dispatchNow,
  getTemplates,
  getStatementRuns,
  buildStatements,
  sendQueuedStatements,
};

export default MessagingService;
