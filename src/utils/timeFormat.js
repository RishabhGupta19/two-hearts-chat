/**
 * Format timestamp to IST timezone
 * Assumes backend sends UTC timestamps in ISO format
 */
export const formatTimeIST = (timestamp) => {
  if (!timestamp) return '';
  
  let date = new Date(timestamp);
  
  // If the date is invalid, return empty
  if (isNaN(date.getTime())) {
    return '';
  }
  
  // Format time in IST (UTC+5:30)
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
};

/**
 * Get relative time that updates (e.g., "5m ago", "just now")
 */
export const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  const now = new Date();
  
  // Handle invalid dates
  if (isNaN(messageDate.getTime())) {
    return '';
  }
  
  const diffMs = now - messageDate;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 30) {
    return 'just now';
  }
  
  if (diffSecs < 60) {
    return `${diffSecs}s ago`;
  }
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  
  // Fallback to formatted time for older messages
  return formatTimeIST(timestamp);
};
