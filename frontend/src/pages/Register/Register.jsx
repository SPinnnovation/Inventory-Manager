import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useNotification from '../../hooks/useNotification.js';
import Button from '../../components/common/Button/Button.jsx';
import Input from '../../components/common/Input/Input.jsx';
import styles from './styles/Register.module.css';

// NOTE: The backend restricts user creation to Admins (IsAdmin permission).
// This page uses mock data until admin-scoped user management is wired in.
const MOCK_DELAY = 1200;

function Register() {
  const { notify } = useNotification();

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name.trim())  errs.last_name  = 'Last name is required.';
    if (!form.email.trim())      errs.email      = 'Email is required.';
    if (!form.password)          errs.password   = 'Password is required.';
    else if (form.password.length < 8) errs.password = 'Minimum 8 characters.';
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    // Mock: simulate network request
    await new Promise(res => setTimeout(res, MOCK_DELAY));
    setLoading(false);
    setDone(true);
    notify.success('Account request submitted! An admin will activate your account.');
  };

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>Request Submitted</h2>
          <p className={styles.successMsg}>
            Your registration is pending admin approval.
          </p>
          <Link to="/login" className={styles.loginLink}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span>🏠</span>
          <h1 className={styles.brandName}>Create Account</h1>
        </div>
        <p className={styles.subtitle}>Fill in your details below</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.row}>
            <Input
              id="first_name" name="first_name" label="First name"
              placeholder="Jane" value={form.first_name}
              onChange={handleChange} error={errors.first_name}
            />
            <Input
              id="last_name" name="last_name" label="Last name"
              placeholder="Doe" value={form.last_name}
              onChange={handleChange} error={errors.last_name}
            />
          </div>
          <Input
            id="email" name="email" type="email" label="Email address"
            placeholder="you@example.com" autoComplete="email"
            value={form.email} onChange={handleChange} error={errors.email}
          />
          <Input
            id="password" name="password" type="password" label="Password"
            placeholder="Min. 8 characters" autoComplete="new-password"
            value={form.password} onChange={handleChange} error={errors.password}
          />
          <Input
            id="confirm" name="confirm" type="password" label="Confirm password"
            placeholder="Repeat password"
            value={form.confirm} onChange={handleChange} error={errors.confirm}
          />

          <Button type="submit" fullWidth loading={loading}>
            Create Account
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;