import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

const CATEGORIES = ['All', 'Street Food', 'Main Course', 'Fast Food', 'Snacks', 'Dessert', 'Beverages', 'Healthy', 'Other'];
const DIET_TYPES = ['Veg', 'Non-Veg', 'Vegan'];

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, isPartner, isUser, isAuthenticated, setAccount } = useAuth();
  const { addItem, updateQuantity, getItemQuantity, totalItems, totalAmount } = useCart();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'reels' | 'about'
  const [menuCategory, setMenuCategory] = useState('All');

  const [editingReel, setEditingReel] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingStore, setEditingStore] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', phone: '', whatsapp: '', address: '', bio: '' });

  const avatarInputRef = useRef(null);
  const isOwner = isPartner && account?._id === id;

  useEffect(() => {
    if (!editingReel) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setEditingReel(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingReel]);

  const fetchProfile = useCallback(
    async (pageNum = 1, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const { data } = await api.get(`/food-partner/${id}`, {
          params: { page: pageNum, limit: 12 },
        });
        setProfile(data.foodPartner);
        const incoming = data.foodPartner.foodItems || [];
        setVideos((prev) => {
          if (!append) return incoming;
          const seen = new Set(prev.map((v) => v._id));
          return [...prev, ...incoming.filter((v) => !seen.has(v._id))];
        });
        setPage(pageNum);
        setHasMore(Boolean(data.pagination?.hasMore));

        if (!append) {
          setStoreForm({
            name: data.foodPartner.name || '',
            phone: data.foodPartner.phone || '',
            whatsapp: data.foodPartner.whatsapp || '',
            address: data.foodPartner.address || '',
            bio: data.foodPartner.bio || '',
          });
        }
      } catch (err) {
        showToast(getErrorMessage(err, 'Could not load restaurant'), 'error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [id, showToast]
  );

  useEffect(() => {
    fetchProfile(1, false);
  }, [fetchProfile]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    setUploadingAvatar(true);
    try {
      const { data } = await api.patch('/food-partner/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((prev) => (prev ? { ...prev, avatar: data.avatar } : prev));
      setAccount((prev) => (prev ? { ...prev, avatar: data.avatar } : prev));
      showToast('Store logo updated!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to upload avatar'), 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleStoreOpen = async () => {
    try {
      const nextOpen = profile.isOpen === false;
      const { data } = await api.patch('/food-partner/me', { isOpen: nextOpen });
      setProfile((prev) => (prev ? { ...prev, isOpen: data.foodPartner.isOpen } : prev));
      showToast(nextOpen ? 'Restaurant is now Open for orders' : 'Restaurant marked as Closed', 'info');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleStoreUpdate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.patch('/food-partner/me', storeForm);
      setProfile((prev) => (prev ? { ...prev, ...data.foodPartner } : prev));
      setEditingStore(false);
      showToast('Restaurant details updated!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to follow restaurants', 'info');
      navigate('/user/login');
      return;
    }
    if (!isUser) {
      showToast('Only customer accounts can follow restaurants', 'info');
      return;
    }
    try {
      const { data } = profile?.isFollowing
        ? await api.delete(`/food-partner/${id}/follow`)
        : await api.put(`/food-partner/${id}/follow`);
      setProfile((prev) =>
        prev ? { ...prev, isFollowing: data.following, followersCount: data.followersCount } : prev
      );
      showToast(data.following ? 'Following restaurant!' : 'Unfollowed restaurant', 'info');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const handleSaveReelEdit = async (e) => {
    e.preventDefault();
    if (!editingReel) return;
    setSavingEdit(true);
    try {
      const { data } = await api.patch(`/food/${editingReel._id}`, {
        name: editingReel.name,
        description: editingReel.description,
        price: Number(editingReel.price) || 0,
        category: editingReel.category,
        dietType: editingReel.dietType,
        isAvailable: editingReel.isAvailable !== false,
      });
      setVideos((prev) => prev.map((v) => (v._id === editingReel._id ? { ...v, ...data.food } : v)));
      setEditingReel(null);
      showToast('Dish updated successfully', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update dish'), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteReel = async (reelId) => {
    if (!window.confirm('Delete this dish & reel permanently?')) return;
    try {
      await api.delete(`/food/${reelId}`);
      setVideos((prev) => prev.filter((v) => v._id !== reelId));
      setProfile((prev) => (prev ? { ...prev, totalMeals: Math.max(0, (prev.totalMeals || 1) - 1) } : prev));
      showToast('Dish removed', 'info');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not delete dish'), 'error');
    }
  };

  if (loading) {
    return (
      <main className="profile-page" aria-busy="true">
        <div className="profile-header skeleton-card">
          <div className="profile-meta">
            <div className="skeleton-circle lg" />
            <div className="skeleton-col">
              <div className="skeleton-line short" />
              <div className="skeleton-line long" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <div className="page-center">
        <div className="empty-icon">🏪</div>
        <p>Restaurant not found.</p>
        <Link to="/" className="btn-primary-sm">Back to Explore</Link>
      </div>
    );
  }

  const filteredMenu = menuCategory === 'All' ? videos : videos.filter((v) => v.category === menuCategory);
  const availableCategories = ['All', ...new Set(videos.map((v) => v.category).filter(Boolean))];
  const cleanPhone = (profile.whatsapp || profile.phone || '').replace(/[^\d+]/g, '');
  const waDigits = cleanPhone.replace(/\+/g, '');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profile.name} ${profile.address}`)}`;

  return (
    <main className="profile-page">
      {/* Restaurant Cover Hero */}
      <div className="store-cover">
        <img
          src={profile.coverImage || profile.avatar || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&auto=format&fit=crop&q=75'}
          alt={profile.name}
          className="store-cover__img"
        />
        <div className="store-cover__top">
          <Link to="/" className="cover-icon-btn" aria-label="Back to Explore">←</Link>
          {isOwner && (
            <div className="owner-top-actions">
              <Link to="/orders" className="btn-secondary-sm">Kitchen Orders</Link>
              <Link to="/create-food" className="btn-primary-sm">+ Post Reel</Link>
            </div>
          )}
        </div>
      </div>

      <section className="profile-header store-hero-card">
        <div className="profile-meta">
          <div className="avatar-wrap">
            {profile.avatar ? (
              <img className="profile-avatar" src={profile.avatar} alt={profile.name} />
            ) : (
              <div className="profile-avatar profile-avatar--fallback">
                {profile.name?.charAt(0).toUpperCase()}
              </div>
            )}
            {isOwner && (
              <>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="file-input-hidden" onChange={handleAvatarUpload} />
                <button type="button" className="avatar-edit-btn" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
                  {uploadingAvatar ? '...' : 'Change'}
                </button>
              </>
            )}
          </div>

          <div className="profile-info">
            <h1 className="profile-business">
              {profile.name} {profile.isVerified !== false && <span className="verified-dot">✓</span>}
            </h1>
            <div className="store-rating-row">
              <span className="rating-pill">★ {profile.rating || 4.6}</span>
              <span>({profile.reviewCount ? `${(profile.reviewCount / 1000).toFixed(1)}K` : '120'} reviews)</span>
              <span>·</span>
              <span>{(profile.cuisines || ['Indian']).join(' · ')}</span>
            </div>
            <p className="profile-address">
              📍 {profile.distanceKm || 2.1} km · {profile.address}
            </p>
            <p className="store-open-status">
              <span className={`open-dot ${profile.isOpen === false ? 'is-closed' : ''}`} /> {profile.isOpen === false ? 'Currently Closed' : `Open · Closes at ${profile.closingTime || '11:00 PM'}`} · {profile.deliveryTime || '25–35 mins'}
            </p>
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-value">{profile.totalMeals ?? videos.length}</span>
            <span className="profile-stat-label">Menu &amp; Reels</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{profile.followersCount ?? 0}</span>
            <span className="profile-stat-label">Followers</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{profile.totalLikes ?? 0}</span>
            <span className="profile-stat-label">Likes</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">{profile.totalSaves ?? 0}</span>
            <span className="profile-stat-label">Saves</span>
          </div>
        </div>

        <div className="profile-cta-row">
          {!isOwner ? (
            <button type="button" className={profile.isFollowing ? 'btn-secondary-sm' : 'btn-primary-sm'} onClick={handleFollowToggle}>
              {profile.isFollowing ? 'Following' : '+ Follow'}
            </button>
          ) : (
            <>
              <button type="button" className="btn-secondary-sm" onClick={() => setEditingStore((s) => !s)}>
                {editingStore ? 'Cancel Edit' : 'Edit Store Info'}
              </button>
              <button type="button" className="btn-secondary-sm" onClick={toggleStoreOpen}>
                {profile.isOpen === false ? 'Mark Open' : 'Mark Closed'}
              </button>
            </>
          )}
          {profile.phone && <a className="cta-pill" href={`tel:${cleanPhone}`}>Call</a>}
          {waDigits && (
            <a className="cta-pill cta-pill--wa" href={`https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${profile.name}, I saw your menu on CraveScroll!`)}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
          <a className="cta-pill" href={mapsUrl} target="_blank" rel="noreferrer">Directions</a>
        </div>

        {editingStore && isOwner && (
          <form className="store-edit-form" onSubmit={handleStoreUpdate}>
            <div className="two-col">
              <div className="field-group">
                <label>Restaurant Name</label>
                <input value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} required />
              </div>
              <div className="field-group">
                <label>Phone</label>
                <input value={storeForm.phone} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} required />
              </div>
            </div>
            <div className="two-col">
              <div className="field-group">
                <label>WhatsApp</label>
                <input value={storeForm.whatsapp} onChange={(e) => setStoreForm({ ...storeForm, whatsapp: e.target.value })} />
              </div>
              <div className="field-group">
                <label>Address</label>
                <input value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} required />
              </div>
            </div>
            <div className="field-group">
              <label>Bio</label>
              <input value={storeForm.bio} onChange={(e) => setStoreForm({ ...storeForm, bio: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary-sm">Save Changes</button>
          </form>
        )}
      </section>

      {/* Storefront Tabs: Menu | Reels | About */}
      <div className="store-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={activeTab === 'menu'} className={`store-tab ${activeTab === 'menu' ? 'is-active' : ''}`} onClick={() => setActiveTab('menu')}>
          Menu ({videos.length})
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'reels'} className={`store-tab ${activeTab === 'reels' ? 'is-active' : ''}`} onClick={() => setActiveTab('reels')}>
          Reels ({profile.totalMeals ?? videos.length})
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'about'} className={`store-tab ${activeTab === 'about' ? 'is-active' : ''}`} onClick={() => setActiveTab('about')}>
          About
        </button>
      </div>

      {/* MENU TAB (Zomato-style Add to Cart Menu) */}
      {activeTab === 'menu' && (
        <section>
          <div className="chip-scroll" style={{ marginBottom: 14 }}>
            {availableCategories.map((c) => (
              <button key={c} type="button" className={`filter-chip ${menuCategory === c ? 'is-active' : ''}`} onClick={() => setMenuCategory(c)}>
                {c}
              </button>
            ))}
          </div>

          <div className="menu-list">
            {filteredMenu.map((dish) => {
              const qty = getItemQuantity(dish._id);
              const unavailable = dish.isAvailable === false || profile.isOpen === false;
              return (
                <div key={dish._id} className={`menu-item-card ${unavailable ? 'is-unavailable' : ''}`}>
                  <div className="menu-item-info">
                    <div className="dish-card__badges">
                      <span className={`diet-pill diet-pill--${(dish.dietType || 'Veg').toLowerCase()}`}>
                        <span className="diet-dot" />
                        {dish.dietType || 'Veg'}
                      </span>
                      <span className="meta-pill">{dish.category}</span>
                      {unavailable && <span className="out-of-stock-pill">Unavailable</span>}
                    </div>
                    <h3>{dish.name}</h3>
                    <p className="menu-item-desc">{dish.description}</p>
                    <span className="dish-price">₹{dish.price}</span>
                  </div>

                  <div className="menu-item-right">
                    <Link to={`/reel/${dish._id}`} className="menu-item-thumb-wrap">
                      <img src={dish.thumbnail || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=240&auto=format&fit=crop&q=70'} alt={dish.name} />
                      <span className="dish-play-tag">▶</span>
                    </Link>

                    {!isOwner ? (
                      unavailable ? (
                        <button type="button" className="add-btn" disabled>Sold Out</button>
                      ) : qty > 0 ? (
                        <div className="qty-stepper">
                          <button type="button" onClick={() => updateQuantity(dish._id, -1)}>−</button>
                          <span>{qty}</span>
                          <button type="button" onClick={() => updateQuantity(dish._id, 1)}>+</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="add-btn"
                          onClick={() => {
                            addItem(dish, profile, () => showToast(`Added ${dish.name} to cart`, 'success'));
                          }}
                        >
                          Add +
                        </button>
                      )
                    ) : (
                      <div className="owner-inline-btns">
                        <button type="button" className="btn-secondary-sm" onClick={() => setEditingReel({ ...dish })}>Edit</button>
                        <button type="button" className="btn-ghost-sm" onClick={() => handleDeleteReel(dish._id)}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* REELS TAB */}
      {activeTab === 'reels' && (
        <section className="profile-grid">
          {videos.map((v) => (
            <div key={v._id} className="profile-grid-item">
              <Link to={`/reel/${v._id}`} className="profile-grid-link">
                <video className="profile-grid-video" src={v.video} muted preload="metadata" />
                <div className="profile-grid-overlay">
                  <span className="grid-dish-name">{v.name}</span>
                  <div className="grid-dish-meta">
                    {Number(v.price) > 0 && <span>₹{v.price}</span>}
                    <span>♥ {v.likeCount ?? 0}</span>
                  </div>
                </div>
              </Link>
              {isOwner && (
                <div className="grid-owner-actions">
                  <button type="button" onClick={() => setEditingReel({ ...v })}>Edit</button>
                  <button type="button" className="danger" onClick={() => handleDeleteReel(v._id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ABOUT TAB */}
      {activeTab === 'about' && (
        <section className="surface-card">
          <h3>About {profile.name}</h3>
          <p style={{ marginTop: 8, color: 'var(--cs-muted)', lineHeight: 1.5 }}>
            {profile.bio || 'Serving freshly prepared dishes crafted daily. Watch our reels to see how every dish is cooked!'}
          </p>
          <div className="about-rows">
            <div><strong>Address:</strong> {profile.address}</div>
            <div><strong>Contact:</strong> {profile.contactName} ({profile.phone})</div>
            <div><strong>Delivery Time:</strong> {profile.deliveryTime || '25–35 mins'}</div>
            <div><strong>Hours:</strong> Open daily until {profile.closingTime || '11:00 PM'}</div>
          </div>
        </section>
      )}

      {hasMore && activeTab !== 'about' && (
        <div className="load-more-wrap">
          <button type="button" className="btn-secondary-sm" disabled={loadingMore} onClick={() => fetchProfile(page + 1, true)}>
            {loadingMore ? 'Loading more...' : 'Load More Dishes'}
          </button>
        </div>
      )}

      {totalItems > 0 && !isOwner && (
        <Link to="/cart" className="floating-cart-bar">
          <span><strong>{totalItems} {totalItems === 1 ? 'item' : 'items'}</strong> · ₹{totalAmount}</span>
          <span className="floating-cart-cta">View Cart →</span>
        </Link>
      )}

      {editingReel && (
        <div className="drawer-backdrop" onClick={() => setEditingReel(null)} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Edit Dish &amp; Reel</h3>
              <button type="button" className="icon-close-btn" onClick={() => setEditingReel(null)}>✕</button>
            </div>
            <form className="auth-form" onSubmit={handleSaveReelEdit}>
              <div className="field-group">
                <label>Dish Name</label>
                <input value={editingReel.name} onChange={(e) => setEditingReel({ ...editingReel, name: e.target.value })} required />
              </div>
              <div className="three-col">
                <div className="field-group">
                  <label>Price (₹)</label>
                  <input type="number" min="0" value={editingReel.price ?? 0} onChange={(e) => setEditingReel({ ...editingReel, price: e.target.value })} />
                </div>
                <div className="field-group">
                  <label>Category</label>
                  <select value={editingReel.category || 'Other'} onChange={(e) => setEditingReel({ ...editingReel, category: e.target.value })}>
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label>Diet</label>
                  <select value={editingReel.dietType || 'Veg'} onChange={(e) => setEditingReel({ ...editingReel, dietType: e.target.value })}>
                    {DIET_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-group">
                <label>Description</label>
                <textarea rows={3} value={editingReel.description || ''} onChange={(e) => setEditingReel({ ...editingReel, description: e.target.value })} />
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={editingReel.isAvailable !== false}
                  onChange={(e) => setEditingReel({ ...editingReel, isAvailable: e.target.checked })}
                />
                <span>Available for ordering</span>
              </label>
              <button type="submit" className="btn-primary btn-block" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Profile;
