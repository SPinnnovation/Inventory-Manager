import React from 'react'
import styles from './styles/Toast.module.css';
import { useNotificationContext } from '../../../context/NotificationContext';

const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

const Toast = () => {

    const { notifications, remove } = useNotificationContext(); // Access the notifications and remove function from the NotificationContext

    if (!notifications.length) return null; // If there are no notifications, render nothing

  return (
    <div className={styles.container} role="region" aria-label="Notifications" aria-live="polite">
        {notifications.map((n) => (
            <div key={n.id} className={`${styles.toast} ${styles[n.type]}`} role="alert">
                <span className={styles.icon} aria-hidden="true">{ICONS[n.type]}</span>

                <span className={styles.message}>{n.message}</span>

                <button
                    className={styles.close}
                    onClick={() => remove(n.id)}
                    aria-label="Dismiss"
                >
                    X
                </button>
            </div>
        ))}
    </div>
  )
}

export default Toast