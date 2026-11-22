import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import ReelFeed from '../../components/ReelFeed';
import CommentsDrawer from '../../components/CommentsDrawer';

const Saved = () => {
  const { showToast } = useToast();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCommentFood, setActiveCommentFood] = useState(null);

  useEffect(() => {
    api
      .get('/food/saved')
      .then(({ data }) => setVideos(data.savedFoods || []))
      .catch((err) => showToast(getErrorMessage(err, 'Failed to load saved reels'), 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleLike = useCallback(
    async (item) => {
      try {
        const { data } = item.isLiked
          ? await api.delete(`/food/${item._id}/like`)
          : await api.put(`/food/${item._id}/like`);
        setVideos((prev) =>
          prev.map((v) =>
            v._id === item._id ? { ...v, isLiked: data.liked, likeCount: data.likeCount } : v
          )
        );
      } catch (err) {
        showToast(getErrorMessage(err), 'error');
      }
    },
    [showToast]
  );

  const handleUnsave = useCallback(
    async (item) => {
      try {
        const { data } = await api.delete(`/food/${item._id}/save`);
        if (!data.saved) {
          setVideos((prev) => prev.filter((v) => v._id !== item._id));
          showToast('Removed from saved reels', 'info');
        }
      } catch (err) {
        showToast(getErrorMessage(err), 'error');
      }
    },
    [showToast]
  );

  const handleCommentCountChange = (foodId, newCount) => {
    setVideos((prev) =>
      prev.map((v) => (v._id === foodId ? { ...v, commentsCount: newCount } : v))
    );
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__row">
          <div className="brand-mark">
            <span>Saved Cravings</span>
          </div>
          <span className="top-bar__count">{videos.length} saved</span>
        </div>
      </header>

      <ReelFeed
        items={videos}
        loading={loading}
        onLike={handleLike}
        onSave={handleUnsave}
        onOpenComments={setActiveCommentFood}
        emptyTitle="No saved cravings yet"
        emptyMessage="Bookmark dishes from the feed to build your personal food watchlist."
        emptyAction={<Link to="/" className="btn-primary-sm">Explore Feed</Link>}
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

export default Saved;
