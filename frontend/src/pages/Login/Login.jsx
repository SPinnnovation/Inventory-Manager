import React, { useState } from 'react'
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth'
import useNotification from '../../hooks/useNotification'
import styles from './styles/Login.module.css';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';

const Login = () => {

    const { login } = useAuth();
    const { notify } = useNotification();

    const [form, setForm] = useState({
        email: '',
        password: '',    
    })
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const errs = {};
        if (!form.email) errs.email = 'Email is required';
        if (!form.password) errs.password = 'Password is required';
        return errs;
    }   // Simple client-side validation function that checks if email and password fields are filled out and returns an object containing any validation errors

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value,
        }))

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: '',
            }))
        }    
    }   // Handle input changes by updating form state and clearing any existing validation errors for the changed field


    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();

        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);

        try {
            await login(form.email.trim(), form.password);  // Attempt to log in using the login function from the AuthContext with trimmed email and password. The AuthContext is responsible for handling authentication logic and will redirect the user upon successful login, so we don't need to handle navigation here.
            // AuthContext redirects via router after setting user
        } catch (err) {
            notify.error(err.message);
        } finally {
            setLoading(false);
        }

    }   // Handle form submission by validating input, showing errors if validation fails, and calling the login function from the AuthContext. If login fails, show an error notification. The loading state is used to disable the submit button while the login request is in progress.

  return (
    <div className={styles.page}>
        <div className={styles.card}>
            {/* Brand */}
            <div className={styles.brand}>
                <span className={styles.brandIcon}>🏠</span>
                <h1 className={styles.brandName}>Home Inventory</h1>
            </div> 

            <p className={styles.subtitle}>Sign in to your account</p>

            {/* Form */}
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <Input 
                    id="email"
                    name="email"
                    type="email"
                    label="Email address"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}    
                />

                <Input
                    id="password"
                    name="password"
                    type="password"
                    label="Password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    error={errors.password}
                />

                <Button type="submit" disabled={loading} fullWidth>
                    {loading ? 'Signing in...' : 'Sign In'}
                </Button>
            </form>

            <p className={styles.footer}>
                Don&apos;t have an account?{' '}

                <Link to="/register" className={styles.link}>
                    Register
                </Link>
            </p>
        </div>
    </div>
  )
}

export default Login