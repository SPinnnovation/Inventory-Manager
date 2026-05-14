import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './styles/Sidebar.module.css';
import { displayName } from '../../utils/formatters';
import useAuth from '../../hooks/useAuth';

const LOCATION_LINKS = [
  { to: '/inventory/locations/warehouses', label: 'Warehouses' },
  { to: '/inventory/locations/floors', label: 'Floors' },
  { to: '/inventory/locations/racks', label: 'Racks' },
  { to: '/inventory/locations/shelves', label: 'Shelves' },
];

const PRODUCT_LINKS = [
  { to: '/inventory/products', label: 'Catalog' },
  { to: '/inventory/products/categories', label: 'Categories' },
];

function NavGroup({ icon, label, basePath, children }) {
  const location = useLocation(); // Used for auto-opening when navigating to a child route, but not for active styling (that's handled by NavLink in SubLink)
  const isActive = location.pathname.startsWith(basePath); // Consider active if we're anywhere in the section, not just on the exact path of the NavGroup
  const [open, setOpen] = useState(isActive); // Start open if we're already on a child route, otherwise closed

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);  // Auto-open if we navigate to a child route, but don't auto-close if we navigate away (user might want to keep it open for later)

  return (
    <li>
        <button
            onClick={() => setOpen(o => !o)}
            className={`${styles.navGroup} ${isActive ? styles.navGroupActive : ''}`}
        >
            <span className={styles.icon} aria-hidden="true">{icon}</span>

            <span>{label}</span>

            <span className={styles.chevron} aria-hidden="true">{open ? '▾' : '›'}</span>
        </button>

        {open && <ul className={styles.subList}>{children}</ul>}
    </li>
  );
}

function SubSection({ label }) {
  return <li className={styles.subSection}>{label}</li>;
}   // Simple wrapper for sub-links to apply active styling based on NavLink, since NavGroup is only active based on path and doesn't know which child is active

function SubLink({ to, label }) {
  return (
    <li>
        <NavLink
            to={to}
            className={({ isActive }) => `${styles.subNavLink} ${isActive ? styles.subActive : ''}`}
        >
            {label}
        </NavLink>
    </li>
  );
} // NavLink automatically applies 'active' class to the link that matches the current route, so we can style it differently. We use a function for className to conditionally apply styles based on whether the link is active.

const Sidebar = () => {
  const { user } = useAuth();   // We can use user info in the sidebar, e.g. to show their name and role, and maybe conditionally show/hide links based on permissions
  const initials = (user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <span className={styles.brandIcon}>🏠</span>
        <span className={styles.brandName}>Home Inventory</span>
      </div>

      {/* Navigation */}
      <nav className={styles.nav} aria-label="Main Navigation">
        <ul className={styles.navList}>
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.icon} aria-hidden="true">◧</span>
              <span>Dashboard</span>
            </NavLink>
          </li>

          <NavGroup icon="⬡" label="Inventory" basePath="/inventory">
            <SubSection label="Locations" />
            {LOCATION_LINKS.map(l => <SubLink key={l.to} to={l.to} label={l.label} />)}

            <SubSection label="Products" />
            {PRODUCT_LINKS.map(l => <SubLink key={l.to} to={l.to} label={l.label} />)}

            <SubSection label="Operations" />
            <SubLink to="/inventory/stock"     label="Stock" />
            <SubLink to="/inventory/movements" label="Movements" />
          </NavGroup>

          <li>
            <NavLink
              to="/orders"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.icon} aria-hidden="true">◫</span>
              <span>Orders</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/profile"
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.icon} aria-hidden="true">◉</span>
              <span>Profile</span>
            </NavLink>
          </li>
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
  );
};

export default Sidebar;