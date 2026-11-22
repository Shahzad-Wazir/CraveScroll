import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

const VISUAL_CATEGORIES = [
  { label: 'Street Food', emoji: '🥙' },
  { label: 'Main Course', emoji: '🍛' },
  { label: 'Fast Food', emoji: '🍔' },
  { label: 'Snacks', emoji: '🍟' },
  { label: 'Dessert', emoji: '🧇' },
  { label: 'Beverages', emoji: '🧋' },
  { label: 'Healthy', emoji: '🥗' },
];

const Explore = () => {
  const navigate = useNavigate();
  const { addItem, updateQuantity, getItemQuantity, totalItems, totalAmount } = useCart();
  const { showToast } = useToast();

  const [location, setLocation] = useState('Patna, Bihar');
  const [editingLoc, setEditingLoc] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get('/food-partner'),
      api.get('/food', {
        params: {
          limit: 12,
          category: activeCategory !== 'All' ? activeCategory : undefined,
        },
      }),
    ])
      .then(([resPartners, resFoods]) => {
        if (!active) return;
        setRestaurants(resPartners.data.restaurants || []);
        setDishes(resFoods.data.foodItems || []);
      })
      .catch((err) => {
        if (active) showToast(getErrorMessage(err, 'Failed to load Explore feed'), 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeCategory, showToast]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchText.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchText.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const handleAddDish = (dish) => {
    addItem(dish, null, () => {
      showToast(`Added ${dish.name} to cart`, 'success');
    });
  };

  return (
    <main className="explore-page">
      <header className="explore-header">
        <div className="explore-loc-row">
          <div className="explore-loc">
            <span className="loc-label">Deliver to</span>
            {editingLoc ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEditingLoc(false);
                }}
              >
                <input
                  className="loc-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onBlur={() => setEditingLoc(false)}
                  autoFocus
                />
              </form>
            ) : (
              <button type="button" className="loc-btn" onClick={() => setEditingLoc(true)}>
                📍 {location} ▾
              </button>
            )}
          </div>

          <Link to="/cart" className="header-cart-btn" aria-label="View Cart">
            <span>🛒</span>
            {totalItems > 0 && <span className="header-cart-count">{totalItems}</span>}
          </Link>
        </div>

        <form className="explore-search-bar" onSubmit={handleSearchSubmit}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search for food, restaurants, biryani, momos..."
            aria-label="Search for food or restaurants"
          />
        </form>
      </header>

      {/* Visual Categories */}
      <section className="explore-section" aria-label="Food categories">
        <div className="category-strip">
          <button
            type="button"
            className={`cat-circle-card ${activeCategory === 'All' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('All')}
          >
            <span className="cat-emoji">✨</span>
            <span>All</span>
          </button>
          {VISUAL_CATEGORIES.map((c) => (
            <button
              key={c.label}
              type="button"
              className={`cat-circle-card ${activeCategory === c.label ? 'is-active' : ''}`}
              onClick={() => setActiveCategory(c.label)}
            >
              <span className="cat-emoji">{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Trending Reels Hero Banner */}
      <section className="trending-banner">
        <div className="trending-banner__text">
          <span className="trending-pill">🔥 Crave Reels</span>
          <h2>Hungry but confused what to eat?</h2>
          <p>Watch real kitchen reels, crave a dish, and order in one tap.</p>
          <Link to="/reels" className="btn-primary-sm">
            Watch Food Reels →
          </Link>
        </div>
      </section>

      {/* Restaurants Near You */}
      <section className="explore-section">
        <div className="section-head">
          <h2>Restaurants Near You</h2>
          <Link to="/search" className="section-link">See All</Link>
        </div>

        {loading ? (
          <div className="restaurant-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="restaurant-card skeleton-box" />
            ))}
          </div>
        ) : (
          <div className="restaurant-grid">
            {restaurants.map((r) => (
              <Link key={r._id} to={`/food-partner/${r._id}`} className="restaurant-card">
                <div className="restaurant-card__media">
                  <img
                    src={r.coverImage || r.avatar || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=70'}
                    alt={r.name}
                  />
                  <span className="restaurant-eta-pill">{r.deliveryTime || '25–35 mins'}</span>
                  <span className={`restaurant-status-badge ${r.isOpen === false ? 'is-closed' : 'is-open'}`}>{r.isOpen === false ? 'Closed' : 'Open'}</span>
                </div>
                <div className="restaurant-card__body">
                  <div className="restaurant-card__top">
                    <h3>
                      {r.name} {r.isVerified !== false && <span className="verified-dot" title="Verified Partner">✓</span>}
                    </h3>
                    <span className="rating-pill">★ {r.rating || 4.5}</span>
                  </div>
                  <p className="restaurant-cuisines">
                    {(r.cuisines || ['Indian', 'Street Food']).join(' · ')}
                  </p>
                  <div className="restaurant-meta-line">
                    <span>{r.distanceKm || 2.1} km</span>
                    <span>•</span>
                    <span>{r.reviewCount ? `${(r.reviewCount / 1000).toFixed(1)}K reviews` : 'Popular'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Popular Dishes (Quick Add to Cart) */}
      <section className="explore-section">
        <div className="section-head">
          <h2>{activeCategory === 'All' ? 'Trending Dishes to Order' : `${activeCategory} Picks`}</h2>
          <Link to="/reels" className="section-link">Watch in Reels</Link>
        </div>

        <div className="dish-list-grid">
          {dishes.map((dish) => {
            const qty = getItemQuantity(dish._id);
            return (
              <div key={dish._id} className="dish-card">
                <Link to={`/reel/${dish._id}`} className="dish-card__thumb">
                  <img
                    src={dish.thumbnail || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&auto=format&fit=crop&q=70'}
                    alt={dish.name}
                  />
                  <span className="dish-play-tag">▶ Reel</span>
                </Link>

                <div className="dish-card__info">
                  <div className="dish-card__badges">
                    <span className={`diet-pill diet-pill--${(dish.dietType || 'Veg').toLowerCase()}`}>
                      <span className="diet-dot" />
                      {dish.dietType || 'Veg'}
                    </span>
                    <span className="dish-rating">★ {dish.rating || 4.6}</span>
                  </div>
                  <h3>{dish.name}</h3>
                  <p className="dish-partner-sub">{dish.foodPartner?.name || 'Kitchen Partner'}</p>
                  <div className="dish-card__footer">
                    <span className="dish-price">₹{dish.price}</span>
                    {qty > 0 ? (
                      <div className="qty-stepper">
                        <button type="button" onClick={() => updateQuantity(dish._id, -1)} aria-label="Decrease quantity">−</button>
                        <span>{qty}</span>
                        <button type="button" onClick={() => updateQuantity(dish._id, 1)} aria-label="Increase quantity">+</button>
                      </div>
                    ) : (
                      <button type="button" className="add-btn" onClick={() => handleAddDish(dish)}>
                        Add +
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {totalItems > 0 && (
        <Link to="/cart" className="floating-cart-bar">
          <span>
            <strong>{totalItems} {totalItems === 1 ? 'item' : 'items'}</strong> · ₹{totalAmount}
          </span>
          <span className="floating-cart-cta">View Cart →</span>
        </Link>
      )}
    </main>
  );
};

export default Explore;
