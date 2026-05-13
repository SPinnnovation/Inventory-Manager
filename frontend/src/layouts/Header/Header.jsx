import React from 'react'
import styles from './styles/Header.module.css';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/common/Button/Button';


const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/orders':    'Orders',
  '/profile':   'My Profile',
};      // Map of route paths to their corresponding page titles for display in the header


const Header = () => {

    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const {  pathname } = useLocation();

    const title = PAGE_TITLES[pathname] ?? 'Home Inventory';

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

  return (
    <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>

        <div className={styles.actions}>
            {/* {user && (
                <Button variant="outline" size="sm" onClick={handleLogout}>
                    Logout
                </Button>
            )} */}
            <Button onClick={handleLogout} variant='outline' size='sm'>
                Logout
            </Button>
        </div>
    </header>
  )
}

export default Header