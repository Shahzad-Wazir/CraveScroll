import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/axios';

const FoodPartnerRegister = () => {
  const navigate = useNavigate();
  const { registerPartner } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    whatsapp: '',
    email: '',
    password: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await registerPartner(form);
      showToast('Partner store created! Upload your first reel.', 'success');
      navigate(`/food-partner/${data.foodPartner._id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create partner account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card" role="region" aria-labelledby="partner-register-title">
        <header className="auth-header">
          <div className="brand-mark brand-mark--center">
            <img src="/cravescroll.svg" alt="" width="28" height="28" />
            <span>CraveScroll Partner</span>
          </div>
          <h1 id="partner-register-title" className="auth-title">Partner Sign Up</h1>
          <p className="auth-subtitle">Turn food cravings into customers with short reels.</p>
        </header>

        <div className="auth-switch">
          <Link to="/user/register">Food Lover</Link>
          <span className="is-current">Food Partner</span>
        </div>

        {error && <div className="alert-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="name">Business / Kitchen Name</label>
            <input id="name" value={form.name} onChange={onChange('name')} placeholder="Spice Route Kitchen" required />
          </div>

          <div className="two-col">
            <div className="field-group">
              <label htmlFor="contactName">Owner / Contact Name</label>
              <input id="contactName" value={form.contactName} onChange={onChange('contactName')} placeholder="Rohan Verma" required />
            </div>
            <div className="field-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={form.phone} onChange={onChange('phone')} placeholder="+91 98765 43210" required />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="whatsapp">WhatsApp Number (optional for orders)</label>
            <input id="whatsapp" value={form.whatsapp} onChange={onChange('whatsapp')} placeholder="+91 98765 43210" />
          </div>

          <div className="field-group">
            <label htmlFor="email">Business Email</label>
            <input id="email" type="email" value={form.email} onChange={onChange('email')} placeholder="kitchen@example.com" required />
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={form.password} onChange={onChange('password')} placeholder="At least 6 characters" minLength={6} required />
          </div>

          <div className="field-group">
            <label htmlFor="address">Store Address (used for Google Maps Directions)</label>
            <input id="address" value={form.address} onChange={onChange('address')} placeholder="Boring Road Crossing, Patna, Bihar" required />
          </div>

          <button className="btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Creating Partner Account...' : 'Create Partner Account'}
          </button>
        </form>

        <div className="auth-alt-action">
          Already a partner? <Link to="/food-partner/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default FoodPartnerRegister;
