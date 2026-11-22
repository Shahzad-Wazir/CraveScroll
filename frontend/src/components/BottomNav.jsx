import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const BottomNav = () => {
  const { isAuthenticated, isPartner, isDeliveryPartner, account } = useAuth();
  const { totalItems } = useCart();
  const displayName = isPartner ? account?.name : account?.fullName;

  return (
    <nav className="app-nav" role="navigation" aria-label="Main navigation">
      <div className="app-nav__brand">
        <img src="/cravescroll.svg" alt="" width="28" height="28" />
        <div>
          <span className="brand-title">CraveScroll</span>
          <span className="brand-tagline">Watch It. Crave It. Order It.</span>
        </div>
      </div>

      <div className="app-nav__inner">
        <NavLink to="/" end className={({ isActive }) => `app-nav__item ${isActive ? 'is-active' : ''}`}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
          </svg>
          <span>Explore</span>
        </NavLink>

        <NavLink to="/reels" className={({ isActive }) => `app-nav__item ${isActive ? 'is-active' : ''}`}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
          </svg>
          <span>Reels</span>
        </NavLink>

        <NavLink to="/search" className={({ isActive }) => `app-nav__item ${isActive ? 'is-active' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search</span>
        </NavLink>

        <NavLink to="/orders" className={({ isActive }) => `app-nav__item ${isActive ? 'is-active' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span>Orders</span>
        </NavLink>

        <NavLink
          to={isPartner ? `/food-partner/${account?._id}` : '/profile'}
          className={({ isActive }) => `app-nav__item ${isActive ? 'is-active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>{isPartner ? 'My Store' : 'Profile'}</span>
        </NavLink>

        <NavLink to="/cart" className={({ isActive }) => `app-nav__item app-nav__cart-desktop ${isActive ? 'is-active' : ''}`}>
          <span className="nav-icon-badge-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {totalItems > 0 && <span className="nav-badge">{totalItems}</span>}
          </span>
          <span>Cart {totalItems > 0 ? `(${totalItems})` : ''}</span>
        </NavLink>
      </div>

      {isAuthenticated && displayName && (
        <div className="app-nav__account">
          <div className="app-nav__avatar">{displayName.charAt(0).toUpperCase()}</div>
          <div className="app-nav__meta">
            <span className="app-nav__name">{displayName}</span>
            <span className="app-nav__role">{isPartner ? 'Food Partner' : isDeliveryPartner ? 'Delivery Partner' : 'Food Lover'}</span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default BottomNav;
