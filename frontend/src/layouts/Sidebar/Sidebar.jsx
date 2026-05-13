import React from 'react'
import styles from './styles/Sidebar.module.css';
import { NavLink } from 'react-router-dom';
import { displayName } from '../../utils/formatters';
import useAuth from '../../hooks/useAuth';


const NAV = [
    { to: '/dashboard', label: 'Dashboard', icon: '◧' },
    { to: '/inventory', label: 'Inventory',  icon: '⬡' },
    { to: '/orders',    label: 'Orders',     icon: '◫' },
    { to: '/profile',   label: 'Profile',    icon: '◉' },    
]

const Sidebar = () => {

    const { user } = useAuth();
    const initials = (user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <aside className={styles.sidebar}>
        {/* Brand */}
        <div className={styles.brand}>
            <span className={styles.brandIcon}>🏠</span>
            <span className={styles.brandName}>Home Inventory</span>
        </div>

        {/* Navigation */}
        <nav 
            className={styles.nav} 
            aria-label='Main Navigation'
        >
            <ul className={styles.navList}>
                {NAV.map(({ to, label, icon }) => (
                    <li key={to}>
                    <NavLink
                        to={to}
                        className={({ isActive }) =>
                        `${styles.navLink} ${isActive ? styles.active : ''}`
                        }
                    >
                        <span className={styles.icon} aria-hidden="true">{icon}</span>
                        <span>{label}</span>
                    </NavLink>
                    </li>
                ))}
            </ul>
        </nav>

        {/* User Strip */}
        {user && (
            <div className={styles.userStrip}>
                <div className={styles.avatar} aria-hidden="true">{initials}</div>

                <div className={styles.userInfo}>
                    <span className={styles.userName}>{displayName(user)}</span>
                    <span className={styles.userRole}>{user.role}</span>
                </div>
            </div>
        )}
    </aside>
  )
}

export default Sidebar