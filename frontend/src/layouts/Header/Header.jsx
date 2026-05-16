import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './styles/Header.module.css';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/common/Button/Button';
import { useNotificationContext } from '../../context/NotificationContext';
import notificationService from '../../services/notificationService';


const PAGE_TITLES = {
  '/dashboard':                    'Dashboard',
  '/inventory':                    'Inventory',
  '/inventory/stock':              'Stock',
  '/inventory/movements':          'Movements',
  '/inventory/products':           'Catalog',
  '/inventory/products/categories':'Categories',
  '/inventory/locations/warehouses':'Warehouses',
  '/inventory/locations/floors':   'Floors',
  '/inventory/locations/racks':    'Racks',
  '/inventory/locations/shelves':  'Shelves',
  '/orders':                       'Orders',
  '/orders/purchase-orders':       'Purchase Orders',
  '/orders/work-orders':           'Work Orders',
  '/profile':                      'My Profile',
};

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { inboxItems, unreadCount, markReadLocal, markAllReadLocal } = useNotificationContext();

    const [bellOpen, setBellOpen]  = useState(false);
    const bellRef = useRef(null);

    const title = PAGE_TITLES[pathname] ?? 'Home Inventory';

    // Close dropdown on outside click
    useEffect(() => {
        if (!bellOpen) return;
        function handle(e) {
            if (bellRef.current && !bellRef.current.contains(e.target)) {
                setBellOpen(false);
            }
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [bellOpen]);

    const handleMarkRead = useCallback((id) => {
        notificationService.markRead(id)
            .then(() => markReadLocal(id))
            .catch(() => {});
    }, [markReadLocal]);

    const handleMarkAllRead = useCallback(() => {
        notificationService.markAllRead()
            .then(() => markAllReadLocal())
            .catch(() => {});
    }, [markAllReadLocal]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

  return (
    <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>

        <div className={styles.actions}>
            {/* Bell icon with notification inbox dropdown */}
            <div className={styles.bellWrap} ref={bellRef}>
                <button
                    className={styles.bellBtn}
                    onClick={() => setBellOpen(o => !o)}
                    aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
                >
                    <span className={styles.bellIcon} aria-hidden="true">🔔</span>
                    {unreadCount > 0 && (
                        <span className={styles.bellBadge}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {bellOpen && (
                    <div className={styles.dropdown}>
                        <div className={styles.dropdownHeader}>
                            <span className={styles.dropdownTitle}>Notifications</span>
                            {unreadCount > 0 && (
                                <button
                                    className={styles.markAllBtn}
                                    onClick={handleMarkAllRead}
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <ul className={styles.notifList}>
                            {inboxItems.length === 0 && (
                                <li className={styles.emptyState}>No notifications yet.</li>
                            )}
                            {inboxItems.map((n) => (
                                <li
                                    key={n.id ?? `ws-${n.created_at}`}
                                    className={`${styles.notifItem} ${n.is_read ? styles.notifRead : ''} ${styles[`notifType_${n.type ?? n.notification_type}`] ?? ''}`}
                                >
                                    <div className={styles.notifBody}>
                                        {n.title && <span className={styles.notifTitle}>{n.title}</span>}
                                        <span className={styles.notifMsg}>{n.message}</span>
                                        <span className={styles.notifTime}>{timeAgo(n.created_at)}</span>
                                    </div>
                                    {!n.is_read && n.id && (
                                        <button
                                            className={styles.markReadBtn}
                                            onClick={() => handleMarkRead(n.id)}
                                            aria-label="Mark as read"
                                        >
                                            ×
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <Button onClick={handleLogout} variant='outline' size='sm'>Logout</Button>
        </div>
    </header>
  );
};

export default Header;