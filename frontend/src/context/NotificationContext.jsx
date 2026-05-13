import { createContext, useCallback, useContext, useReducer, useMemo } from "react";


const NotificationContext = createContext(null);

let _nextId = 0; // Internal counter to generate unique IDs for notifications

function reducer(state, action) {
    switch (action.type) {
        case 'ADD':
            return { notifications: [...state.notifications, action.payload] };
        case 'REMOVE':
            return { notifications: state.notifications.filter(n => n.id !== action.payload) };
        default:
            return state;
    }
}       // Reducer function to manage the state of notifications based on dispatched actions (ADD and REMOVE)

export function NotificationProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, { notifications: [] }); // Initialize the reducer with an empty notifications array


    const add = useCallback((message, type = 'info', duration = 4500) => {
        const id = ++_nextId;    // Generate a unique ID for the notification

        dispatch({ type: 'ADD', payload: { id, message, type } });  // Dispatch an action to add the new notification to the state

        if (duration > 0) setTimeout(() => dispatch({ type: 'REMOVE', payload: id }), duration);    // If a duration is provided, set a timeout to remove the notification after the specified duration
        
        return id;  // Return the ID of the newly added notification for potential manual removal later
    }, []); // useCallback is used to memoize the add function, ensuring it doesn't change on every render


    const remove = useCallback((id) => dispatch({ type: 'REMOVE', payload: id }), []); // useCallback is used to memoize the remove function, ensuring it doesn't change on every render


    const notify = useMemo(() => ({
        success: (msg, dur) => add(msg, 'success', dur),
        error: (msg, dur) => add(msg, 'error', dur),
        warning: (msg, dur) => add(msg, 'warning', dur),
        info: (msg, dur) => add(msg, 'info', dur),
    }), [add]);  // Helper functions to create notifications of specific types (success, error, warning, info) that internally call the add function with the appropriate type

    return (
        <NotificationContext.Provider value={{ notifications: state.notifications, notify, remove }}>
            {children}
        </NotificationContext.Provider>    
    );  // Provide the notifications state and helper functions to the component tree via the NotificationContext
}


export function useNotificationContext() {
    const context = useContext(NotificationContext); // Access the NotificationContext to retrieve the current notifications and helper functions
    if (!context) throw new Error('useNotification must be used within a NotificationProvider'); // Ensure that the hook is used within a NotificationProvider
    return context; // Return the context value, which includes the notifications and helper functions for managing them
}