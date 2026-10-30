/**
 * Format numeric value to Indian Rupee (INR) currency representation
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format ISO date string into readable Date (e.g. 15 Nov 2026)
 */
export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

/**
 * Format ISO date string into 12-hour Time (e.g. 07:30 PM)
 */
export function formatTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Format full Date & Time (e.g. 15 Nov 2026, 07:30 PM)
 */
export function formatDateTime(dateString) {
  if (!dateString) return '-';
  return `${formatDate(dateString)}, ${formatTime(dateString)}`;
}

/**
 * Format runtime duration in minutes to hours and minutes (e.g. 2h 45m)
 */
export function formatDuration(minutes) {
  if (!minutes || isNaN(minutes)) return '-';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Truncate long strings with ellipsis
 */
export function truncate(str, maxLength = 30) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

