import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage, isRequestCanceled } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ReelFeed from '../../components/ReelFeed';
import CommentsDrawer from '../../components/CommentsDrawer';

const CATEGORIES = ['All', 'Street Food', 'Main Course', 'Snacks', 'Dessert', 'Beverages', 'Healthy', 'Fast Food'];
const DIETS = ['All', 'Veg', 'Non-Veg', 'Vegan'];

const Home = () => {
  const { isUser, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [feedType, setFeedType] = useState('for-you');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [dietType, setDietType] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [activeCommentFood, setActiveCommentFood] = useState(null);

  const abortControllerRef = useRef(null);
  const loadingMoreLockRef = useRef(false);

  // 350ms debounce for search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchFeed = useCallback(
    async (pageNum = 1, append = false) => {
      if (append) {
        if (loadingMoreLockRef.current) return;
        loadingMoreLockRef.current = true;
        setLoadingMore(true);
        setPaginationError('');
      } else {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        loadingMoreLockRef.current = false;
        setLoading(true);
        setPaginationError('');
      }

      const signal = abortControllerRef.current?.signal;

      try {
        const { data } = await api.get('/food', {
          signal,
          params: {
            page: pageNum,
            limit: 6,
            feed: feedType,
            search: debouncedSearch || undefined,
            category: category !== 'All' ? category : undefined,
            dietType: dietType !== 'All' ? dietType : undefined,
          },
        });

        const incoming = data.foodItems || [];
        setVideos((prev) => {
          if (!append) return incoming;
          const seen = new Set(prev.map((v) => v._id));
          const uniqueIncoming = incoming.filter((v) => !seen.has(v._id));
          return [...prev, ...uniqueIncoming];
        });
        setPage(pageNum);
        setHasMore(Boolean(data.pagination?.hasMore));
      } catch (err) {
        if (isRequestCanceled(err)) return;
        const msg = getErrorMessage(err, 'Failed to load food reels');
        if (append) {
          setPaginationError(msg);
        } else {
          showToast(msg, 'error');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
          loadingMoreLockRef.current = false;
        }
      }
    },
    [feedType, debouncedSearch, category, dietType, showToast]
  );

  useEffect(() => {
    fetchFeed(1, false);
    return () => abortControllerRef.current?.abort();
  }, [fetchFeed]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMoreLockRef.current) {
      fetchFeed(page + 1, true);
    }
  }, [hasMore, page, fetchFeed]);

  const resetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCategory('All');
    setDietType('All');
    setFeedType('for-you');
  };

  const requireUserAction = useCallback(
    (actionLabel) => {
      if (!isAuthenticated) {
        showToast(`Please sign in to ${actionLabel}.`, 'info');
        navigate('/user/login');
        return false;
      }
      if (!isUser) {
        showToast(`Only customer accounts can ${actionLabel}.`, 'info');
        return false;
      }
      return true;
    },
    [isAuthenticated, isUser, navigate, showToast]
  );

  // Explicit idempotent PUT / DELETE like
  const handleLike = useCallback(
    async (item) => {
      if (!requireUserAction('like reels')) return;
      const shouldLike = !item.isLiked;
      try {
        const { data } = shouldLike
          ? await api.put(`/food/${item._id}/like`)
          : await api.delete(`/food/${item._id}/like`);
        setVideos((prev) =>
          prev.map((v) =>
            v._id === item._id ? { ...v, isLiked: data.liked, likeCount: data.likeCount } : v
          )
        );
      } catch (err) {
        showToast(getErrorMessage(err, 'Could not update like'), 'error');
      }
    },
    [requireUserAction, showToast]
  );

  // Explicit idempotent PUT / DELETE save
  const handleSave = useCallback(
    async (item) => {
      if (!requireUserAction('save reels')) return;
      const shouldSave = !item.isSaved;
      try {
        const { data } = shouldSave
          ? await api.put(`/food/${item._id}/save`)
          : await api.delete(`/food/${item._id}/save`);
        setVideos((prev) =>
          prev.map((v) =>
            v._id === item._id ? { ...v, isSaved: data.saved, savesCount: data.savesCount } : v
          )
        );
        showToast(data.saved ? 'Saved to your collection' : 'Removed from saved', 'info');
      } catch (err) {
        showToast(getErrorMessage(err, 'Could not update bookmark'), 'error');
      }
    },
    [requireUserAction, showToast]
  );

  // Explicit idempotent PUT / DELETE follow
  const handleFollow = useCallback(
    async (partnerId, currentlyFollowing) => {
      if (!requireUserAction('follow food partners')) return;
      try {
        const { data } = currentlyFollowing
          ? await api.delete(`/food-partner/${partnerId}/follow`)
          : await api.put(`/food-partner/${partnerId}/follow`);
        setVideos((prev) =>
          prev.map((v) => {
            const id = v.foodPartner?._id || v.foodPartner;
            return id === partnerId ? { ...v, isFollowing: data.following } : v;
          })
        );
        showToast(data.following ? 'Following partner!' : 'Unfollowed partner', 'info');
      } catch (err) {
        showToast(getErrorMessage(err, 'Could not update follow status'), 'error');
      }
    },
    [requireUserAction, showToast]
  );

  const handleCommentCountChange = (foodId, newCount) => {
    setVideos((prev) =>
      prev.map((v) => (v._id === foodId ? { ...v, commentsCount: newCount } : v))
    );
  };

  const hasActiveFilters = Boolean(debouncedSearch || category !== 'All' || dietType !== 'All');

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__row">
          <div className="brand-mark mobile-only-brand">
            <img src="/cravescroll.svg" alt="" width="24" height="24" />
            <span>CraveScroll</span>
          </div>

          <div className="feed-tabs" role="tablist" aria-label="Feed type">
            <button
              type="button"
              role="tab"
              aria-selected={feedType === 'for-you'}
              className={`feed-tab ${feedType === 'for-you' ? 'is-active' : ''}`}
              onClick={() => setFeedType('for-you')}
            >
              For You
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feedType === 'following'}
              className={`feed-tab ${feedType === 'following' ? 'is-active' : ''}`}
              onClick={() => setFeedType('following')}
            >
              Following
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feedType === 'nearby'}
              className={`feed-tab ${feedType === 'nearby' ? 'is-active' : ''}`}
              onClick={() => setFeedType('nearby')}
            >
              Nearby
            </button>
          </div>

          <button
            type="button"
            className={`filter-toggle-btn ${showFilters || hasActiveFilters ? 'is-active' : ''}`}
            onClick={() => setShowFilters((s) => !s)}
            aria-label="Toggle search and filters"
            aria-expanded={showFilters}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {showFilters && (
          <div className="filter-panel">
            <div className="search-row">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search paneer, biryani, chaat..."
                aria-label="Search dishes"
              />
              {hasActiveFilters && (
                <button type="button" className="clear-btn" onClick={resetFilters}>
                  Reset
                </button>
              )}
            </div>

            <div className="chip-scroll" role="group" aria-label="Filter by diet">
              {DIETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`filter-chip ${dietType === d ? 'is-active' : ''}`}
                  onClick={() => setDietType(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="chip-scroll" role="group" aria-label="Filter by category">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`filter-chip ${category === c ? 'is-active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <ReelFeed
        items={videos}
        loading={loading}
        hasMore={hasMore}
        loadingMore={loadingMore}
        paginationError={paginationError}
        onLoadMore={handleLoadMore}
        onLike={handleLike}
        onSave={handleSave}
        onFollow={handleFollow}
        onOpenComments={setActiveCommentFood}
        emptyTitle={hasActiveFilters ? 'No matching dishes found' : feedType === 'following' ? 'Your Following feed is empty' : 'No reels yet'}
        emptyMessage={
          hasActiveFilters
            ? 'Try a different keyword, category, or diet filter.'
            : feedType === 'following'
            ? 'Follow your favorite kitchens from For You to see their latest dishes here.'
            : 'Check back soon or run npm run seed in backend to load demo food reels.'
        }
        emptyAction={
          (hasActiveFilters || feedType === 'following') && (
            <button type="button" className="btn-primary-sm" onClick={resetFilters}>
              Show All Reels
            </button>
          )
        }
      />

      {activeCommentFood && (
        <CommentsDrawer
          food={activeCommentFood}
          onClose={() => setActiveCommentFood(null)}
          onCountChange={handleCommentCountChange}
        />
      )}
    </div>
  );
};

export default Home;
