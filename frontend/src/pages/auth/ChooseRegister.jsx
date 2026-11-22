import React from 'react';
import { Link } from 'react-router-dom';

const ChooseRegister = () => {
  return (
    <div className="auth-page-wrapper">
      <div className="auth-card" role="region" aria-labelledby="choose-register-title">
        <header className="auth-header">
          <div className="brand-mark brand-mark--center">
            <img src="/cravescroll.svg" alt="" width="30" height="30" />
            <span>CraveScroll</span>
          </div>
          <h1 id="choose-register-title" className="auth-title">Join CraveScroll</h1>
          <p className="auth-subtitle">Scroll mouth-watering reels or showcase your kitchen.</p>
        </header>

        <div className="auth-choice-stack">
          <Link to="/user/register" className="btn-primary btn-block">
            Join as Food Lover
          </Link>
          <Link to="/food-partner/register" className="btn-secondary btn-block">
            Join as Food Partner / Restaurant
          </Link>
          <Link to="/delivery-partner/register" className="btn-secondary btn-block">
            Join as Delivery Partner / Rider
          </Link>
        </div>

        <div className="auth-alt-action">
          Already have an account? <Link to="/user/login">User Sign In</Link> ·{' '}
          <Link to="/food-partner/login">Partner Sign In</Link> · <Link to="/delivery-partner/login">Delivery Sign In</Link>
        </div>
        <div className="auth-alt-action">
          <Link to="/">Continue browsing reels →</Link>
        </div>
      </div>
    </div>
  );
};

export default ChooseRegister;
