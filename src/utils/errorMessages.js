/**
 * Converts raw API/network errors into short, user-friendly messages.
 */
export function friendlyError(err) {
  // Axios-style error with response
  const status = err?.response?.status || err?.status;
  const serverMsg = err?.response?.data?.error || err?.response?.data?.message;

  // Rate-limit / quota
  if (status === 429 || /quota|rate.?limit|resource.?exhausted/i.test(serverMsg || err?.message || '')) {
    return 'The service is temporarily busy. Please wait a moment and try again.';
  }

  // Payment / billing
  if (status === 402) {
    return 'Service quota reached. Please check your plan or try again later.';
  }

  // Auth – wrong credentials on login
  if (status === 401) {
    const msg = (serverMsg || '').toLowerCase();
    if (/invalid|incorrect|wrong|credentials|password|not found/i.test(msg)) {
      return 'Incorrect email or password. Please try again.';
    }
    return 'Incorrect email or password. Please try again.';
  }
  if (status === 403) {
    return 'You do not have permission to do that.';
  }

  // Not found
  if (status === 404) {
    return 'The requested resource was not found.';
  }

  // Server error
  if (status >= 500) {
    return 'Something went wrong on the server. Please try again shortly.';
  }

  // Network error (no response at all)
  if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
    return 'Unable to reach the server. Check your internet connection and make sure the backend is running.';
  }

  // Fallback: use server message if it's short enough, otherwise generic
  if (serverMsg && serverMsg.length < 120) {
    return serverMsg;
  }

  return 'Something went wrong. Please try again.';
}
