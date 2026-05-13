import React, { useState } from 'react';
import useAuth from '../../hooks/useAuth.js';
import useNotification from '../../hooks/useNotification.js';
import authService from '../../services/authService.js';
import Button from '../../components/common/Button/Button.jsx';
import Input from '../../components/common/Input/Input.jsx';
import { formatDate, displayName } from '../../utils/formatters.js';
import styles from './styles/Profile.module.css';

function Profile() {
  const { user, refreshUser } = useAuth();
  const { notify } = useNotification();

  const [pwForm, setPwForm]   = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);

  const validatePw = () => {
    const errs = {};
    if (!pwForm.old_password) errs.old_password = 'Required.';
    if (!pwForm.new_password) errs.new_password = 'Required.';
    else if (pwForm.new_password.length < 8) errs.new_password = 'Minimum 8 characters.';
    if (pwForm.confirm !== pwForm.new_password) errs.confirm = 'Passwords do not match.';
    return errs;
  };

  const handlePwChange = (e) => {
    const { name, value } = e.target;
    setPwForm(prev => ({ ...prev, [name]: value }));
    if (pwErrors[name]) setPwErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    const errs = validatePw();
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setPwLoading(true);
    try {
      await authService.changePassword(pwForm.old_password, pwForm.new_password);
      notify.success('Password changed successfully.');
      setPwForm({ old_password: '', new_password: '', confirm: '' });
      await refreshUser();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className={styles.page}>
      {/* User info card */}
      <div className={styles.card}>
        <div className={styles.avatarRow}>
          <div className={styles.avatar}>
            {(user.first_name?.[0] || user.email[0]).toUpperCase()}
          </div>
          <div>
            <h2 className={styles.name}>{displayName(user)}</h2>
            <p className={styles.email}>{user.email}</p>
            <span className={styles.roleBadge}>{user.role}</span>
          </div>
        </div>

        <dl className={styles.details}>
          <div className={styles.detailRow}>
            <dt>Status</dt>
            <dd>
              <span className={user.is_active ? styles.active : styles.inactive}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Member since</dt>
            <dd>{formatDate(user.date_joined)}</dd>
          </div>
          {user.profile?.phone && (
            <div className={styles.detailRow}>
              <dt>Phone</dt>
              <dd>{user.profile.phone}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Change password */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Change Password</h3>
        <form onSubmit={handlePwSubmit} className={styles.form} noValidate>
          <Input
            id="old_password" name="old_password" type="password"
            label="Current password" placeholder="••••••••"
            autoComplete="current-password"
            value={pwForm.old_password} onChange={handlePwChange}
            error={pwErrors.old_password}
          />
          <Input
            id="new_password" name="new_password" type="password"
            label="New password" placeholder="Min. 8 characters"
            autoComplete="new-password"
            value={pwForm.new_password} onChange={handlePwChange}
            error={pwErrors.new_password}
          />
          <Input
            id="confirm" name="confirm" type="password"
            label="Confirm new password" placeholder="Repeat new password"
            value={pwForm.confirm} onChange={handlePwChange}
            error={pwErrors.confirm}
          />
          <div className={styles.formFooter}>
            <Button type="submit" loading={pwLoading}>Update Password</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;