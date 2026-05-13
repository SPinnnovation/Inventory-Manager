import { useNotificationContext } from "../context/NotificationContext"

/**
 * Access the notification system from any component.
 * @returns {{ notify: { success, error, warning, info }, remove }}
*/

const useNotification = () => {
    const { notify, remove } = useNotificationContext();
    return { notify, remove }; // Return the notify and remove functions from the notification context for use in components
}

export default useNotification; // Export the useNotification hook for use in components to access notification functionality