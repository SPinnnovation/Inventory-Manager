import { lazy, Suspense } from "react";
import useAuth from "../hooks/useAuth.js";
import LoadingSpinner from "../components/common/LoadingSpinner/LoadingSpinner.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../layouts/AppLayout/AppLayout";


const Login = lazy(() => import("../pages/Login/Login"));
const Register = lazy(() => import('../pages/Register/Register.jsx'));
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard.jsx'));
const Inventory = lazy(() => import('../pages/Inventory/Inventory.jsx'));
const Orders = lazy(() => import('../pages/Orders/Orders.jsx'));
const Profile = lazy(() => import('../pages/Profile/Profile.jsx'));
const NotFound = lazy(() => import('../pages/NotFound/NotFound.jsx'));
const Warehouses = lazy(() => import('../pages/Locations/Warehouses/Warehouses.jsx'));
const Floors = lazy(() => import('../pages/Locations/Floors/Floors.jsx'));
const Racks = lazy(() => import('../pages/Locations/Racks/Racks.jsx'));
const Shelves = lazy(() => import('../pages/Locations/Shelves/Shelves.jsx'));
const Categories = lazy(() => import('../pages/Products/Categories/Categories.jsx'));
const Catalog = lazy(() => import('../pages/Products/Catalog/Catalog.jsx'));
const Stock = lazy(() => import('../pages/Stock/Stock.jsx'));
const Movements = lazy(() => import('../pages/Movements/Movements.jsx'));


/* Redirect unauthenticated users to login page */
function PrivateRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <LoadingSpinner fullPage />
        )
    }
    return user ? children : <Navigate to="/login" replace/>;
}


/* Redirecting already-authenticated users away from login/register pages */
function PublicRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <LoadingSpinner fullPage />
        )    
    }
    return user ? <Navigate to="/dashboard" replace/> : children;
}


function AppRouter () {
    return (
        <Suspense fallback={<LoadingSpinner fullPage />}>
            <Routes>
                {/* Public */}
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                {/* Protected — all share AppLayout */}
                <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />                    
                    <Route path="orders" element={<Orders />} />
                    <Route path="profile" element={<Profile />} />

                    <Route path="inventory">
                        <Route index element={<Navigate to="stock" replace />} />

                        {/* Location hierarchy */}
                        <Route path="locations/warehouses" element={<Warehouses />} />
                        <Route path="locations/floors" element={<Floors />} />
                        <Route path="locations/racks" element={<Racks />} />
                        <Route path="locations/shelves" element={<Shelves />} />

                        {/* Product catalog */}
                        <Route path="products" element={<Catalog />} />
                        <Route path="products/categories" element={<Categories />} />

                        {/* Stock & audit */}
                        <Route path="stock" element={<Stock />} />
                        <Route path="movements" element={<Movements />} />
                    </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    )
}

export default AppRouter;