import { Outlet } from 'react-router-dom';
import styles from './styles/AppLayout.module.css';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';


function AppLayout() {
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
    )
}

export default AppLayout;