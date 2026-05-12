/**
 * Format an ISO date string to a readable local date.
 * @param {string} iso
 * @returns {string}
*/

// Format Date: Convert an ISO date string to a more human-readable format (e.g., "01 Jan 2024") using the 'en-IN' locale. If the input is falsy, return an em dash.
export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/**
 * Capitalise the first letter of a string.
 * @param {string} str
 * @returns {string}
*/
// Capitalize: Take a string and return it with the first letter capitalized. If the input is falsy, return an empty string.
export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

/**
 * Return user's display name: "First Last" or email fallback.
 * @param {{ first_name?: string, last_name?: string, email: string }} user
 * @returns {string}
*/
// Display Name: Generate a display name for a user based on their first and last name, or fall back to their email if the first name is not available. If the user object is falsy, return an empty string.
export const displayName = (user) =>
  user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.email ?? '';