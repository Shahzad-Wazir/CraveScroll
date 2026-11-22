import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ReelFeed from '../../components/ReelFeed';
import CommentsDrawer from '../../components/CommentsDrawer';

const ReelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isUser } = useAuth();
  const { showToast } = useToast();

  const [food, setFood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/food/${id}`)
      .then(({ data }) => setFood(data.food))
      .catch((err) => showToast(getErrorMessage(err, 'Reel not found'), 'error'))
      .finally(() => setLoading(false));
  }, [id, showToast]);

  const requireUser = useCallback(
    (action) => {
      if (!isAuthenticated) {
        showToast(`Sign in to ${action}`, 'info');
        navigate('/user/login');
        return false;
      }
      if (!isUser) {
        showToast(`Only customer accounts can ${action}`, 'info');
        return false;
      }
      return true;
    },
    [isAuthenticated, isUser, navigate, showToast]
  );

  const handleLike = useCallback(
    async (item) => {
      if (!requireUser('like reels')) return;
      try {
        const { data } = item.isLiked
          ? await api.delete(`/food/${item._id}/like`)
          : await api.put(`/food/${item._id}/like`);
        setFood((prev) => (prev ? { ...prev, isLiked: data.liked, likeCount: data.likeCount } : prev));
      } catch (err) {
        showToast(getErrorMessage(err), 'error');
      }
    },
    [requireUser, showToast]
  );

  const handleSave = useCallback(
    async (item) => {
      if (!requireUser('save reels')) return;
      try {
        const { data } = item.isSaved
          ? await api.delete(`/food/${item._id}/save`)
          : await api.put(`/food/${item._id}/save`);
        setFood((prev) => (prev ? { ...prev, isSaved: data.saved, savesCount: data.savesCount } : prev));
      } catch (err) {
        showToast(getErrorMessage(err), 'error');
      }
    },
    [requireUser, showToast]
  );

  const handleFollow = useCallback(
    async (partnerId, currentlyFollowing) => {
      if (!requireUser('follow partners')) return;
      try {
        const { data } = currentlyFollowing
          ? await api.delete(`/food-partner/${partnerId}/follow`)
          : await api.put(`/food-partner/${partnerId}/follow`);
        setFood((prev) => (prev ? { ...prev, isFollowing: data.following } : prev));
      } catch (err) {
        showToast(getErrorMessage(err), 'error');
      }
    },
    [requireUser, showToast]
  );

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__row">
          <Link to="/" className="back-link">← Back to Feed</Link>
          <span className="brand-mark-text">CraveScroll</span>
        </div>
      </header>

      <ReelFeed
        items={food ? [food] : []}
        loading={loading}
        onLike={handleLike}
        onSave={handleSave}
        onFollow={handleFollow}
        onOpenComments={() => setShowComments(true)}
        emptyTitle="Reel unavailable"
        emptyMessage="This food reel may have been deleted by the partner."
        emptyAction={<Link to="/" className="btn-primary-sm">Browse Feed</Link>}
      />

      {showComments && food && (
        <CommentsDrawer
          food={food}
          onClose={() => setShowComments(false)}
          onCountChange={(_, count) => setFood((prev) => (prev ? { ...prev, commentsCount: count } : prev))}
        />
      )}
    </div>
  );
};

export default ReelDetail;
