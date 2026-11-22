import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage, isRequestCanceled } from '../../api/axios';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

const CATEGORIES = ['All', 'Street Food', 'Main Course', 'Fast Food', 'Snacks', 'Dessert', 'Beverages', 'Healthy'];
const DIETS = ['All', 'Veg', 'Non-Veg', 'Vegan'];

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem, updateQuantity, getItemQuantity } = useCart();
  const { showToast } = useToast();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debounced, setDebounced] = useState(query);
  const [category, setCategory] = useState('All');
  const [dietType, setDietType] = useState('All');
  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query.trim());
      if (query.trim()) setSearchParams({ q: query.trim() }, { replace: true });
      else setSearchParams({}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [query, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      api.get('/food-partner', { signal: controller.signal, params: { search: debounced || undefined } }),
      api.get('/food', {
        signal: controller.signal,
        params: {
          limit: 20,
          search: debounced || undefined,
          category: category !== 'All' ? category : undefined,
          dietType: dietType !== 'All' ? dietType : undefined,
        },
      }),
    ])
      .then(([r1, r2]) => {
        setRestaurants(r1.data.restaurants || []);
        setDishes(r2.data.foodItems || []);
      })
      .catch((err) => {
        if (!isRequestCanceled(err)) showToast(getErrorMessage(err), 'error');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debounced, category, dietType, showToast]);

  return (
    <main className="explore-page">
      <header className="explore-header">
        <h1 className="page-title">Search CraveScroll</h1>
        <div className="explore-search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes, restaurants, cuisines..."
            autoFocus
          />
        </div>

        <div className="chip-scroll" style={{ marginTop: 10 }}>
          {DIETS.map((d) => (
            <button key={d} type="button" className={`filter-chip ${dietType === d ? 'is-active' : ''}`} onClick={() => setDietType(d)}>
              {d}
            </button>
          ))}
        </div>
        <div className="chip-scroll" style={{ marginTop: 6 }}>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={`filter-chip ${category === c ? 'is-active' : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="page-center"><div className="spinner" /></div>
      ) : (
        <>
          {restaurants.length > 0 && (
            <section className="explore-section">
              <div className="section-head"><h2>Restaurants ({restaurants.length})</h2></div>
              <div className="restaurant-grid">
                {restaurants.map((r) => (
                  <Link key={r._id} to={`/food-partner/${r._id}`} className="restaurant-card">
                    <div className="restaurant-card__body">
                      <div className="restaurant-card__top">
                        <h3>{r.name}</h3>
                        <span className="rating-pill">★ {r.rating || 4.5}</span>
                      </div>
                      <p className="restaurant-cuisines">{(r.cuisines || []).join(' · ')}</p>
                      <div className="restaurant-meta-line">
                        <span>{r.deliveryTime || '25–35 mins'}</span>
                        <span>•</span>
                        <span>{r.address}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="explore-section">
            <div className="section-head"><h2>Dishes ({dishes.length})</h2></div>
            {dishes.length === 0 ? (
              <div className="empty-state empty-state--compact">
                <div className="empty-icon">🔍</div>
                <h3>No matching dishes</h3>
                <p>Try searching for Paneer, Biryani, Chaat, Momos, or Waffle.</p>
              </div>
            ) : (
              <div className="dish-list-grid">
                {dishes.map((dish) => {
                  const qty = getItemQuantity(dish._id);
                  return (
                    <div key={dish._id} className="dish-card">
                      <Link to={`/reel/${dish._id}`} className="dish-card__thumb">
                        <img src={dish.thumbnail || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&auto=format&fit=crop&q=70'} alt={dish.name} />
                        <span className="dish-play-tag">▶ Reel</span>
                      </Link>
                      <div className="dish-card__info">
                        <h3>{dish.name}</h3>
                        <p className="dish-partner-sub">{dish.foodPartner?.name}</p>
                        <div className="dish-card__footer">
                          <span className="dish-price">₹{dish.price}</span>
                          {qty > 0 ? (
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
                                addItem(dish);
                                showToast(`Added ${dish.name} to cart`, 'success');
                              }}
                            >
                              Add +
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
};

export default Search;
