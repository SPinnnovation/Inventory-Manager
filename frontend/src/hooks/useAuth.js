import { useAuthContext } from "../context/AuthContext";

/**
 * Access auth state and actions from any component.
 * @returns {{ user, loading, login, logout, refreshUser }}
*/

const useAuth = () => useAuthContext();

export default useAuth;