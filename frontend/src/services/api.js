import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL; 

/**
 * Reads the csrftoken cookie set by Django.
 * Requires CSRF_COOKIE_HTTPONLY=False in Django settings.
 * @returns {string|null}
*/
const getCsrfToken = () => {
    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/); // Look for 'csrftoken' in cookies
    return match ? decodeURIComponent(match[1]) : null; // Return the token value or null if not found
};

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // Include cookies in requests
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});     // Create an Axios instance with the base URL and default headers

// Attach Django CSRF token to all state-mutating requests (POST, PUT, PATCH, DELETE)
api.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    const csrf = getCsrfToken();    // Get the CSRF token from cookies
    if (csrf) config.headers['X-CSRFToken'] = csrf; // Set the 'X-CSRFToken' header if the token is available
  }
  return config;
}); // Add a request interceptor to include the CSRF token in relevant requests


// Normalize error shape → always throw a plain Error with a readable message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;    // Extract the response data from the error object

    const message =
      data?.detail ||
      data?.non_field_errors?.[0] ||
      (typeof data === 'string' ? data : null) ||
      err.message ||
      'An unexpected error occurred.';      // Determine the error message to use based on the response data or fallback to a generic message

    return Promise.reject(new Error(message));  // Reject the promise with a new Error object containing the determined message
  }
); // Add a response interceptor to standardize error handling

export default api; // Export the configured Axios instance for use in the application