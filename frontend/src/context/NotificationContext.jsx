import { createContext, useCallback, useContext, useReducer, useMemo } from "react";


const NotificationContext = createContext(null);

let _nextId = 0; // Internal counter to generate unique IDs for toast notifications

// ── Reducer ───────────────────────────────────────────────────────────────────
// Manages two independent slices:
//   notifications  — transient toast queue
//   inboxItems     — persistent notification inbox (from DB + live WS pushes)

const INBOX_CAP = 50; // Maximum number of inbox items held in memory

function reducer(state, action) {
    switch (action.type) {
        // ── Toast actions ──────────────────────────────────────────────────
        case 'ADD':
            return { ...state, notifications: [...state.notifications, action.payload] };
        case 'REMOVE':
            return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };

        // ── Inbox actions ──────────────────────────────────────────────────
        // Replace entire inbox (used on initial API fetch)
        case 'INBOX_SET':
            return { ...state, inboxItems: action.payload.slice(0, INBOX_CAP) };

        // Prepend a single item from a live WS push; cap at INBOX_CAP
        case 'INBOX_PREPEND':
            return {
                ...state,
                inboxItems: [action.payload, ...state.inboxItems].slice(0, INBOX_CAP),
            };

        // Mark a single notification as read by its DB id
        case 'INBOX_MARK_READ':
            return {
                ...state,
                inboxItems: state.inboxItems.map(n =>
                    n.id === action.payload ? { ...n, is_read: true } : n
                ),
            };

        // Mark all notifications as read
        case 'INBOX_MARK_ALL_READ':
            return {
                ...state,
                inboxItems: state.inboxItems.map(n => ({ ...n, is_read: true })),
            };

        default:
            return state;
    }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, { notifications: [], inboxItems: [] });

    // ── Toast API (unchanged) ──────────────────────────────────────────────
    const add = useCallback((message, type = 'info', duration = 4500) => {
        const id = ++_nextId;
        dispatch({ type: 'ADD', payload: { id, message, type } });
        if (duration > 0) setTimeout(() => dispatch({ type: 'REMOVE', payload: id }), duration);
        return id;
    }, []);

    const remove = useCallback((id) => dispatch({ type: 'REMOVE', payload: id }), []);

    const notify = useMemo(() => ({
        success: (msg, dur) => add(msg, 'success', dur),
        error:   (msg, dur) => add(msg, 'error',   dur),
        warning: (msg, dur) => add(msg, 'warning', dur),
        info:    (msg, dur) => add(msg, 'info',    dur),
    }), [add]);

    // ── Inbox API ──────────────────────────────────────────────────────────
    const setInboxItems    = useCallback((items) => dispatch({ type: 'INBOX_SET',          payload: items }), []);
    const addInboxItem     = useCallback((item)  => dispatch({ type: 'INBOX_PREPEND',      payload: item  }), []);
    const markReadLocal    = useCallback((id)    => dispatch({ type: 'INBOX_MARK_READ',    payload: id    }), []);
    const markAllReadLocal = useCallback(()      => dispatch({ type: 'INBOX_MARK_ALL_READ'                }), []);

    const unreadCount = useMemo(
        () => state.inboxItems.filter(n => !n.is_read).length,
        [state.inboxItems],
    );

    return (
        <NotificationContext.Provider value={{
            // toast
            notifications: state.notifications,
            notify,
            remove,
            // inbox
            inboxItems: state.inboxItems,
            unreadCount,
            setInboxItems,
            addInboxItem,
            markReadLocal,
            markAllReadLocal,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
}