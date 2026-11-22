import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

const UserProfile = () => {
  const navigate = useNavigate();
  const { isAuthenticated, account, isPartner, logout } = useAuth();
  const { totalItems } = useCart();
  const { showToast } = useToast();

  const handleLogout = async () => {
    await logout();
    showToast('Logged out successfully', 'info');
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <main className="explore-page">
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>Sign in to CraveScroll</h3>
          <p>Save your favorite food reels, follow kitchens, and track live orders.</p>
          <div className="empty-cta-row">
            <Link to="/user/login" className="btn-primary-sm">User Sign In</Link>
            <Link to="/food-partner/login" className="btn-secondary-sm">Partner Sign In</Link>
          </div>
        </div>
      </main>
    );
  }

  const displayName = isPartner ? account?.name : account?.fullName;

  return (
    <main className="explore-page">
      <section className="surface-card user-hub-card">
        <div className="profile-meta">
          <div className="profile-avatar profile-avatar--fallback">
            {(displayName || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1>{displayName}</h1>
            <p className="profile-address">{account?.email}</p>
            <span className="partner-badge">{isPartner ? 'Food Partner' : 'CraveScroll Member'}</span>
          </div>
        </div>
      </section>

      <section className="hub-links">
        <Link to="/orders" className="hub-link-card">
          <span>🛵</span>
          <div>
            <strong>My Orders &amp; Live Tracking</strong>
            <p>Track ongoing deliveries and reorder past meals</p>
          </div>
          <span>→</span>
        </Link>

        <Link to="/saved" className="hub-link-card">
          <span>🔖</span>
          <div>
            <strong>Saved Food Reels</strong>
            <p>Watch dishes you bookmarked from Crave Reels</p>
          </div>
          <span>→</span>
        </Link>

        <Link to="/cart" className="hub-link-card">
          <span>🛒</span>
          <div>
            <strong>My Cart ({totalItems} items)</strong>
            <p>Review items and proceed to checkout</p>
          </div>
          <span>→</span>
        </Link>

        <button type="button" className="hub-link-card hub-link-card--danger" onClick={handleLogout}>
          <span>🚪</span>
          <div>
            <strong>Log Out</strong>
            <p>Sign out securely from this device</p>
          </div>
          <span>→</span>
        </button>
      </section>
    </main>
  );
};

export default UserProfile;
