import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/axios';

const DeliveryPartnerRegister = () => {
  const navigate = useNavigate();
  const { registerDeliveryPartner } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({ fullName: '', phone: '', vehicleNumber: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await registerDeliveryPartner(form);
      showToast('Delivery partner account ready!', 'success');
      navigate('/orders');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create delivery account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card" role="region" aria-labelledby="rider-register-title">
        <header className="auth-header">
          <div className="brand-mark brand-mark--center">
            <img src="/cravescroll.svg" alt="" width="28" height="28" />
            <span>CraveScroll Delivery</span>
          </div>
          <h1 id="rider-register-title" className="auth-title">Become a Delivery Partner</h1>
          <p className="auth-subtitle">Deliver hot meals from CraveScroll kitchens.</p>
        </header>

        {error && <div className="alert-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="fullName">Full Name</label>
            <input id="fullName" value={form.fullName} onChange={onChange('fullName')} placeholder="Vikash Kumar" required />
          </div>
          <div className="two-col">
            <div className="field-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={form.phone} onChange={onChange('phone')} placeholder="+91 90001 44556" required />
            </div>
            <div className="field-group">
              <label htmlFor="vehicleNumber">Vehicle Number</label>
              <input id="vehicleNumber" value={form.vehicleNumber} onChange={onChange('vehicleNumber')} placeholder="BR-01-CS-4022" />
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={onChange('email')} placeholder="rider@example.com" required />
          </div>
          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={form.password} onChange={onChange('password')} placeholder="At least 6 characters" minLength={6} required />
          </div>
          <button className="btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Create Delivery Account'}
          </button>
        </form>

        <div className="auth-alt-action">
          Already registered? <Link to="/delivery-partner/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPartnerRegister;
