import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

const ReelCard = memo(function ReelCard({
  item,
  index,
  isActive,
  shouldRenderVideo,
  isMuted,
  onToggleMute,
  onLike,
  onSave,
  onFollow,
  onOpenComments,
  onOrderNow,
  onShare,
  registerSection,
}) {
  const videoRef = useRef(null);
  const lastTapRef = useRef(0);
  const tapTimerRef = useRef(null);

  const [isPaused, setIsPaused] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);

  useEffect(() => {
    setVideoError(false);
  }, [item.video]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isActive) {
      vid.play().then(() => setIsPaused(false)).catch(() => setIsPaused(true));
    } else {
      vid.pause();
    }
  }, [isActive, shouldRenderVideo]);

  const handleVideoTap = () => {
    const now = Date.now();
    const diff = now - lastTapRef.current;
    lastTapRef.current = now;

    if (diff < 280) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 680);
      if (onLike && !item.isLiked) {
        onLike(item);
      }
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      const vid = videoRef.current;
      if (!vid) return;
      if (vid.paused) {
        vid.play().then(() => setIsPaused(false)).catch(() => {});
      } else {
        vid.pause();
        setIsPaused(true);
      }
    }, 250);
  };

  const partnerObj = typeof item.foodPartner === 'object' ? item.foodPartner : null;
  const partnerId = partnerObj?._id || item.foodPartner;
  const partnerName = partnerObj?.name || 'Food Partner';

  return (
    <section
      ref={registerSection(index)}
      data-index={index}
      className="reel"
      role="listitem"
      aria-label={`${item.name} by ${partnerName}`}
    >
      {shouldRenderVideo ? (
        videoError ? (
          <div className="reel-video-fallback">
            <span>⚠️</span>
            <p>Video unavailable right now</p>
            <button type="button" className="btn-secondary-sm" onClick={() => setVideoError(false)}>
              Retry Video
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="reel-video"
            src={item.video}
            muted={isMuted}
            playsInline
            loop
            preload={isActive ? 'auto' : 'metadata'}
            onClick={handleVideoTap}
            onWaiting={() => setBuffering(true)}
            onCanPlay={() => setBuffering(false)}
            onPlaying={() => setBuffering(false)}
            onError={() => {
              setBuffering(false);
              setVideoError(true);
            }}
          />
        )
      ) : (
        <div className="reel-placeholder" aria-hidden="true" />
      )}

      {buffering && isActive && !videoError && (
        <div className="reel-buffer-spinner" aria-label="Buffering video">
          <div className="spinner" />
        </div>
      )}

      {isPaused && isActive && !buffering && !videoError && (
        <div className="reel-center-indicator" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="7,5 19,12 7,19" />
          </svg>
        </div>
      )}

      {heartBurst && (
        <div className="reel-heart-burst" aria-hidden="true">
          <svg width="86" height="86" viewBox="0 0 24 24" fill="#E58C98">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </div>
      )}

      <button
        type="button"
        className="reel-mute-btn"
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute video (M)' : 'Mute video (M)'}
        title="Mute / Unmute (M)"
      >
        {isMuted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>

      <div className="reel-overlay">
        <div className="reel-overlay-gradient" aria-hidden="true" />

        <div className="reel-actions">
          <div className="reel-action-group">
            <button
              type="button"
              onClick={() => onLike?.(item)}
              className={`reel-action ${item.isLiked ? 'is-liked' : ''}`}
              aria-label={item.isLiked ? 'Unlike reel' : 'Like reel'}
              aria-pressed={Boolean(item.isLiked)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={item.isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
            </button>
            <span className="reel-action__count">{item.likeCount ?? 0}</span>
          </div>

          <div className="reel-action-group">
            <button
              type="button"
              onClick={() => onOpenComments?.(item)}
              className="reel-action"
              aria-label={`View ${item.commentsCount ?? 0} comments`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
              </svg>
            </button>
            <span className="reel-action__count">{item.commentsCount ?? 0}</span>
          </div>

          <div className="reel-action-group">
            <button
              type="button"
              onClick={() => onSave?.(item)}
              className={`reel-action ${item.isSaved ? 'is-saved' : ''}`}
              aria-label={item.isSaved ? 'Remove bookmark' : 'Save reel'}
              aria-pressed={Boolean(item.isSaved)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={item.isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
              </svg>
            </button>
            <span className="reel-action__count">{item.savesCount ?? 0}</span>
          </div>

          <div className="reel-action-group">
            <button
              type="button"
              onClick={() => onShare(item)}
              className="reel-action"
              aria-label="Share reel link"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
            <span className="reel-action__count">Share</span>
          </div>
        </div>

        <div className="reel-content">
          <div className="reel-badges">
            <span className={`diet-pill diet-pill--${(item.dietType || 'Veg').toLowerCase()}`}>
              <span className="diet-dot" />
              {item.dietType || 'Veg'}
            </span>
            {item.category && <span className="meta-pill">{item.category}</span>}
            {Number(item.price) > 0 && <span className="price-pill">₹{item.price}</span>}
          </div>

          <h2 className="reel-dish-title">{item.name}</h2>
          {item.description && (
            <p className="reel-description" title={item.description}>
              {item.description}
            </p>
          )}

          {partnerId && (
            <div className="reel-partner-row">
              <Link className="reel-partner-chip" to={`/food-partner/${partnerId}`}>
                {partnerObj?.avatar ? (
                  <img src={partnerObj.avatar} alt={partnerName} className="partner-mini-avatar" />
                ) : (
                  <span className="partner-mini-avatar partner-mini-avatar--fallback">
                    {partnerName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="partner-mini-name">{partnerName}</span>
              </Link>

              {onFollow && (
                <button
                  type="button"
                  className={`reel-follow-btn ${item.isFollowing ? 'is-following' : ''}`}
                  onClick={() => onFollow(partnerId, Boolean(item.isFollowing))}
                >
                  {item.isFollowing ? 'Following' : '+ Follow'}
                </button>
              )}

              <Link className="reel-btn" to={`/food-partner/${partnerId}`}>
                Visit Store
              </Link>
            </div>
          )}

          <div className="reel-order-card">
            <img
              className="reel-order-thumb"
              src={item.thumbnail || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&auto=format&fit=crop&q=70'}
              alt={item.name}
            />
            <div className="reel-order-meta">
              <span className="reel-order-name">{item.name}</span>
              <span className="reel-order-price">{Number(item.price) > 0 ? `₹${item.price}` : 'Chef Special'}</span>
            </div>
            <button
              type="button"
              className="reel-order-cta"
              onClick={() => onOrderNow?.(item)}
            >
              Order Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});

const ReelFeed = ({
  items = [],
  loading = false,
  hasMore = false,
  loadingMore = false,
  paginationError = '',
  onLoadMore,
  onLike,
  onSave,
  onFollow,
  onOpenComments,
  emptyTitle = 'Nothing to scroll yet',
  emptyMessage = 'No food reels found right now.',
  emptyAction = null,
}) => {
  const sectionRefs = useRef(new Map());
  const sentinelRef = useRef(null);
  const { showToast } = useToast();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const registerSection = useCallback(
    (index) => (el) => {
      if (!el) sectionRefs.current.delete(index);
      else sectionRefs.current.set(index, el);
    },
    []
  );

  // Track active visible reel for windowed video mounting
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number(entry.target.dataset.index);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { threshold: [0.6] }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  // Keyboard navigation (ArrowDown / ArrowUp / M to mute)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowDown') {
        const nextEl = sectionRefs.current.get(Math.min(items.length - 1, activeIndex + 1));
        if (nextEl) {
          e.preventDefault();
          nextEl.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp') {
        const prevEl = sectionRefs.current.get(Math.max(0, activeIndex - 1));
        if (prevEl) {
          e.preventDefault();
          prevEl.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (e.key.toLowerCase() === 'm') {
        setIsMuted((m) => !m);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, items.length]);

  // Infinite scroll trigger
  useEffect(() => {
    if (!hasMore || !onLoadMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore && !paginationError) {
          onLoadMore();
        }
      },
      { rootMargin: '260px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, paginationError, onLoadMore]);

  const handleShare = useCallback(
    async (item) => {
      const shareUrl = `${window.location.origin}/reel/${item._id}`;
      try {
        if (navigator.share) {
          await navigator.share({
            title: `${item.name} on CraveScroll`,
            text: item.description || `Check out ${item.name} on CraveScroll!`,
            url: shareUrl,
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          showToast('Reel link copied to clipboard!', 'success');
        }
      } catch {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showToast('Reel link copied to clipboard!', 'success');
        } catch {
          showToast('Could not copy link', 'error');
        }
      }
    },
    [showToast]
  );

  const handleOrderNow = useCallback(
    (item) => {
      addItem(item, null, () => {
        showToast(`Added ${item.name} to cart!`, 'success');
        navigate('/cart');
      });
    },
    [addItem, showToast, navigate]
  );

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  if (loading) {
    return (
      <div className="reels-stage">
        <div className="reel-skeleton" aria-busy="true" aria-label="Loading food reels">
          <div className="skeleton-shimmer" />
          <div className="skeleton-caption">
            <div className="skeleton-line short" />
            <div className="skeleton-line long" />
            <div className="skeleton-line short" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reels-stage">
      <div className="reels-feed" role="list" aria-label="Food reels feed">
        {items.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <h3>{emptyTitle}</h3>
            <p>{emptyMessage}</p>
            {emptyAction}
          </div>
        )}

        {items.map((item, idx) => (
          <ReelCard
            key={item._id}
            item={item}
            index={idx}
            isActive={idx === activeIndex}
            shouldRenderVideo={Math.abs(idx - activeIndex) <= 1}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onLike={onLike}
            onSave={onSave}
            onFollow={onFollow}
            onOpenComments={onOpenComments}
            onOrderNow={handleOrderNow}
            onShare={handleShare}
            registerSection={registerSection}
          />
        ))}

        {(hasMore || paginationError) && (
          <div ref={sentinelRef} className="feed-sentinel">
            {paginationError ? (
              <div className="pagination-retry">
                <span>{paginationError}</span>
                <button type="button" className="btn-secondary-sm" onClick={onLoadMore}>
                  Retry
                </button>
              </div>
            ) : loadingMore ? (
              'Loading more reels...'
            ) : (
              'Scroll for more'
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReelFeed;
