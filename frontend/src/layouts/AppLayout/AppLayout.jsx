import { useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import styles from './styles/AppLayout.module.css';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import useAuth from '../../hooks/useAuth';
import useWebSocket from '../../hooks/useWebSocket';
import { useNotificationContext } from '../../context/NotificationContext';
import notificationService from '../../services/notificationService';
import { getWebSocketUrl } from '../../utils/websocket';


function AppLayout() {
    const { user } = useAuth();
    const { notify, setInboxItems, addInboxItem } = useNotificationContext();

    // ── Seed inbox from REST API on mount ─────────────────────────────────
    useEffect(() => {
        if (!user) return;
        notificationService
            .getNotifications({ page_size: 50 })
            .then((data) => setInboxItems(data.results ?? data))
            .catch(() => {}); // Silently ignore — bell will just start empty
    }, [user, setInboxItems]);

    // ── Bridge incoming WS messages to toast + inbox ───────────────────────
    const handleMessage = useCallback(
        (data) => {
            // data.type is lowercase (warning/info/success/error) — maps to notify[type]()
            const toastFn = notify[data.type] ?? notify.info;
            toastFn(data.message);
            addInboxItem(data);
        },
        [notify, addInboxItem],
    );

    const wsUrl = user ? getWebSocketUrl('/ws/notifications/') : null;
    useWebSocket({ url: wsUrl, onMessage: handleMessage, enabled: !!user });

    return (
        <div className={styles.layout}>
            <Sidebar />

            <div className={styles.main}>
                <Header />
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AppLayout;
