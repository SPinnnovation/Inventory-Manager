import { useCallback, useContext, useEffect, useState, createContext } from "react";
import { useNotificationContext } from "./NotificationContext";
import authService from "../services/authService";


const AuthContext = createContext(null); // Create a context for authentication-related data and functions, initialized with null

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // State to hold the current user's information, initialized to null
    const [loading, setLoading] = useState(true); // State to track whether the authentication status is being determined, initialized to true
    const { notify } = useNotificationContext(); // Access the notification context to use the notify function for displaying messages to the user

    // Restore session on mount - calls /auth/me to verify cookie is still valid
    useEffect(() => {
        authService.getMe()
        .then(data => setUser(data)) // If the request is successful, update the user state with the retrieved user data
        .catch(() => setUser(null)) // If the request fails (e.g., due to an invalid session), set the user state to null
        .finally(() => setLoading(false)); // Once the request is complete (regardless of success or failure), set loading to false
    }, [])   

    const login = useCallback(async (email, password) => {
        const data = await authService.login(email, password); // Call the login function from the authService with the provided email and password
        
        setUser(data); // If the login is successful, update the user state with the retrieved user data
        
        notify.success(`Welcome back, ${data.first_name || data.email}!`);
        
        return data;
    }, [notify]); // Define a login function that will be used to authenticate the user, memoized with useCallback to prevent unnecessary re-renders

    const logout = useCallback(async () => {
        try {
            await authService.logout(); // Call the logout function from the authService to log the user out
        } catch (err) {
            // Session may already be invalid, so we ignore any errors here and just clear local state
        }

        setUser(null); // After attempting to log out, set the user state to null to reflect that there is no authenticated user
        notify.info('You have been logged out.'); // Notify the user that they have been logged out

    }, [notify]); // Define a logout function that will be used to log the user out, memoized with useCallback to prevent unnecessary re-renders

    const refreshUser = useCallback(async () => {
        const data = await authService.getMe(); // Call the getMe function from the authService to retrieve the current user's information, which can be used to refresh the user state after profile updates or other changes
        setUser(data);
        return data; // Update the user state with the retrieved user data and return it
    }, []); // Define a refreshUser function that can be used to refresh the user's information, memoized with useCallback to prevent unnecessary re-renders

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
          {children}
        </AuthContext.Provider>
    );
}


export function useAuthContext() {
    const context = useContext(AuthContext); // Access the AuthContext to retrieve the current authentication state and functions
    if (!context) throw new Error('useAuthContext must be used within an AuthProvider');
    return context; // Return the context value, which includes the user information, loading state, and authentication functions
}