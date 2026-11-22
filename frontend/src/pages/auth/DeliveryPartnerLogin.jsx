import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/axios';

const DeliveryPartnerLogin = () => {
  const navigate = useNavigate();
  const { loginDeliveryPartner } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await loginDeliveryPartner({ email, password });
      showToast(`Welcome, ${data.deliveryPartner.fullName}!`, 'success');
      navigate('/orders');
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid delivery partner credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card" role="region" aria-labelledby="rider-login-title">
        <header className="auth-header">
          <div className="brand-mark brand-mark--center">
            <img src="/cravescroll.svg" alt="" width="28" height="28" />
            <span>CraveScroll Delivery</span>
          </div>
          <h1 id="rider-login-title" className="auth-title">Delivery Partner Sign In</h1>
          <p className="auth-subtitle">Pick up orders and confirm doorstep deliveries.</p>
        </header>

        {error && <div className="alert-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rider@example.com" required />
          </div>
          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In to Delivery Queue'}
          </button>
        </form>

        <div className="auth-alt-action">
          New rider? <Link to="/delivery-partner/register">Create delivery account</Link> ·{' '}
          <Link to="/user/login">Customer Login</Link>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPartnerLogin;
