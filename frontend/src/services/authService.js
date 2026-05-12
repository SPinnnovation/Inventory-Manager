import api from "./api";

/**
 * All authentication and user-profile API calls.
*/
const authService = {
    /** POST /auth/login/ — no CSRF required (authentication_classes=[]) */
    login: async (email, password) => {
        const res = await api.post('/auth/login/', { email, password });    // Send a POST request to the login endpoint with the provided email and password
        return res.data;
    },

    /** POST /auth/logout/ */
    logout: async () => {
        await api.post('/auth/logout/');    // Send a POST request to the logout endpoint    
    },

    /** GET /auth/me/ — returns the current session's user */
    getMe: async () => {
        const res = await api.get('/auth/me/'); // Send a GET request to the 'me' endpoint to retrieve the current user's information
        return res.data;
    },

    /** POST /auth/change-password/ */
    changePassword: async (oldPassword, newPassword) => {
        const res = await api.post('/auth/change-password/', {  
            old_password: oldPassword,
            new_password: newPassword,
        }); // Send a POST request to the 'change-password' endpoint with the provided old and new passwords

        return res.data;
    },

    /** GET /users/:id/profile/ */
    getProfile: async (userId) => {
        const res = await api.get(`/users/${userId}/profile/`); // Send a GET request to the user's profile endpoint using the provided user ID
        return res.data;
    },

    /** PATCH /users/:id/profile/ */
    updateProfile: async (userId, data) => {
        const res = await api.patch(`/users/${userId}/profile/`, data);  // Send a PATCH request to the user's profile endpoint with the provided user ID and updated profile data
        return res.data;
    },
};

export default authService;