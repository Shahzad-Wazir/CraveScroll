import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/axios';

const UserRegister = () => {
  const navigate = useNavigate();
  const { registerUser } = useAuth();
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await registerUser({
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email,
        password,
      });
      showToast('Account created! Start scrolling.', 'success');
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card" role="region" aria-labelledby="user-register-title">
        <header className="auth-header">
          <div className="brand-mark brand-mark--center">
            <img src="/cravescroll.svg" alt="" width="28" height="28" />
            <span>CraveScroll</span>
          </div>
          <h1 id="user-register-title" className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Discover local dishes through short food reels.</p>
        </header>

        <div className="auth-switch">
          <span className="is-current">Food Lover</span>
          <Link to="/food-partner/register">Food Partner</Link>
        </div>

        {error && <div className="alert-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="two-col">
            <div className="field-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Aarav"
                required
              />
            </div>
            <div className="field-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sharma"
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>

          <button className="btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-alt-action">
          Already have an account? <Link to="/user/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default UserRegister;
