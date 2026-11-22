import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage, isRequestCanceled } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CommentsDrawer = ({ food, onClose, onCountChange }) => {
  const { isAuthenticated, account, role } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!food?._id) return;
    const controller = new AbortController();
    setLoading(true);

    api
      .get(`/food/${food._id}/comments`, { signal: controller.signal })
      .then(({ data }) => setComments(data.comments || []))
      .catch((err) => {
        if (!isRequestCanceled(err)) {
          showToast(getErrorMessage(err, 'Failed to load comments'), 'error');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setTimeout(() => inputRef.current?.focus(), 60);
        }
      });

    return () => controller.abort();
  }, [food?._id, showToast]);

  if (!food) return null;

  const partnerId = food.foodPartner?._id || food.foodPartner;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/food/${food._id}/comments`, { text: text.trim() });
      setComments((prev) => [data.comment, ...prev]);
      setText('');
      onCountChange?.(food._id, data.commentsCount);
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not post comment'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      const { data } = await api.delete(`/food/${food._id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      onCountChange?.(food._id, data.commentsCount);
      showToast('Comment deleted', 'info');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not delete comment'), 'error');
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Comments for ${food.name}`}>
      <div className="drawer-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h3>Comments</h3>
            <p className="drawer-subtitle">{food.name}</p>
          </div>
          <button type="button" className="icon-close-btn" onClick={onClose} aria-label="Close comments">
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {loading ? (
            <div className="comment-skeleton-list" aria-busy="true">
              {[1, 2, 3].map((n) => (
                <div key={n} className="comment-skeleton-row">
                  <div className="skeleton-circle" />
                  <div className="skeleton-col">
                    <div className="skeleton-line short" />
                    <div className="skeleton-line long" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="drawer-empty">
              <div className="empty-icon">💬</div>
              <p>No comments yet. Be the first to review this dish!</p>
            </div>
          ) : (
            comments.map((c) => {
              const canDelete =
                isAuthenticated &&
                (c.authorId === account?._id || (role === 'foodpartner' && partnerId === account?._id));
              return (
                <div key={c._id} className="comment-item">
                  <div className="comment-avatar" aria-hidden="true">
                    {(c.authorName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="comment-content">
                    <div className="comment-meta">
                      <span className="comment-author">{c.authorName}</span>
                      {c.authorRole === 'foodpartner' && <span className="partner-badge">Partner</span>}
                      <span className="comment-date">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="comment-text">{c.text}</p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      className="comment-delete-btn"
                      onClick={() => handleDelete(c._id)}
                      aria-label="Delete comment"
                    >
                      Delete
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="drawer-footer">
          {isAuthenticated ? (
            <form className="comment-form" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment about this dish..."
                maxLength={500}
                aria-label="Write a comment"
              />
              <button type="submit" disabled={!text.trim() || submitting}>
                {submitting ? '...' : 'Post'}
              </button>
            </form>
          ) : (
            <div className="drawer-login-prompt">
              <Link to="/user/login">Sign in</Link> to join the conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentsDrawer;
