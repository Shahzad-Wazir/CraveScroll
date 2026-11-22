import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/axios';

const FoodPartnerLogin = () => {
  const navigate = useNavigate();
  const { loginPartner } = useAuth();
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
      const data = await loginPartner({ email, password });
      showToast(`Welcome back, ${data.foodPartner.name}!`, 'success');
      navigate(`/food-partner/${data.foodPartner._id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid partner credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card" role="region" aria-labelledby="partner-login-title">
        <header className="auth-header">
          <div className="brand-mark brand-mark--center">
            <img src="/cravescroll.svg" alt="" width="28" height="28" />
            <span>CraveScroll Partner</span>
          </div>
          <h1 id="partner-login-title" className="auth-title">Partner Sign In</h1>
          <p className="auth-subtitle">Upload reels, manage dishes, and grow your store.</p>
        </header>

        {error && <div className="alert-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Business Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kitchen@example.com"
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="auth-alt-action">
          New partner? <Link to="/food-partner/register">Create partner account</Link> ·{' '}
          <Link to="/user/login">User Login</Link>
        </div>
      </div>
    </div>
  );
};

export default FoodPartnerLogin;
