import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

const STEPS = ['Order Placed', 'Preparing', 'Out for Delivery', 'Delivered'];

const Orders = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isUser, isPartner, isDeliveryPartner } = useAuth();
  const { loadFromOrder } = useCart();
  const { showToast } = useToast();

  const [tab, setTab] = useState('ongoing');
  const [orders, setOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (isPartner) {
        const { data } = await api.get('/orders/partner');
        setOrders(data.orders || []);
      } else if (isDeliveryPartner) {
        const { data } = await api.get('/orders/delivery');
        setOrders(data.orders || []);
      } else {
        const [tabRes, pastRes] = await Promise.all([
          api.get('/orders/my', { params: { filter: tab } }),
          api.get('/orders/my', { params: { filter: 'past' } }),
        ]);
        setOrders(tabRes.data.orders || []);
        setPastOrders(pastRes.data.orders || []);
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load orders'), 'error');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isPartner, isDeliveryPartner, tab, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    try {
      const { data } = await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      showToast(`Order #${data.order.orderNumber} → ${nextStatus}`, 'success');
      if (trackingOrder?._id === orderId) setTrackingOrder(data.order);
      fetchOrders();
    } catch (err) {
      showToast(getErrorMessage(err, 'Action not allowed'), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReorder = (order) => {
    loadFromOrder(order);
    showToast(`Loaded items from ${order.foodPartner?.name || 'restaurant'} into cart`, 'success');
    navigate('/cart');
  };

  if (!isAuthenticated) {
    return (
      <main className="explore-page">
        <div className="empty-state">
          <div className="empty-icon">🛵</div>
          <h3>Track your CraveScroll orders</h3>
          <p>Sign in as a Customer, Restaurant Partner, or Delivery Partner to view orders.</p>
          <div className="empty-cta-row">
            <Link to="/user/login" className="btn-primary-sm">Customer Sign In</Link>
            <Link to="/food-partner/login" className="btn-secondary-sm">Restaurant Login</Link>
            <Link to="/delivery-partner/login" className="btn-secondary-sm">Delivery Login</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="explore-page">
      <header className="explore-header">
        <h1 className="page-title">
          {isPartner ? 'Kitchen Orders Dashboard' : isDeliveryPartner ? 'Delivery Partner Queue' : 'My Orders'}
        </h1>
        {isUser && (
          <div className="order-tabs" role="tablist">
            {['ongoing', 'past', 'cancelled'].map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`order-tab ${tab === t ? 'is-active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}
      </header>

      {loading ? (
        <div className="page-center"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <div className="empty-icon">📦</div>
          <h3>No {isUser ? tab : ''} orders right now</h3>
          <p>
            {isPartner
              ? 'Incoming customer orders for your kitchen will appear here.'
              : isDeliveryPartner
              ? 'Orders ready for pickup or out for delivery will appear here.'
              : 'Explore restaurants or watch food reels to place your first order!'}
          </p>
          {isUser && <Link to="/" className="btn-primary-sm">Explore Food</Link>}
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const currentStepIdx = STEPS.indexOf(order.status);
            const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <article key={order._id} className="order-card">
                <div className="order-card__head">
                  <div className="order-partner-info">
                    <div className="order-partner-logo">
                      {order.foodPartner?.avatar ? (
                        <img src={order.foodPartner.avatar} alt={order.foodPartner.name} />
                      ) : (
                        (order.foodPartner?.name || order.user?.fullName || 'C').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3>
                        {isPartner
                          ? `${order.user?.fullName || 'Customer'}`
                          : order.foodPartner?.name || 'Restaurant'}
                      </h3>
                      <span className="order-number">Order #{order.orderNumber}</span>
                    </div>
                  </div>
                  <span className={`status-pill status-pill--${order.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {order.status}
                  </span>
                </div>

                {order.status !== 'Cancelled' && (
                  <div className="order-stepper" aria-label="Order progress">
                    {STEPS.map((step, idx) => {
                      const done = idx <= currentStepIdx;
                      const current = idx === currentStepIdx;
                      return (
                        <div key={step} className={`step-node ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}>
                          <div className="step-dot">{done ? '✓' : idx + 1}</div>
                          <span className="step-label">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                  <div className="eta-banner">
                    <span className="eta-icon">🛵</span>
                    <div>
                      <strong>
                        {order.estimatedMinutes > 0
                          ? `Arriving in ${order.estimatedMinutes}–${order.estimatedMinutes + 5} mins`
                          : 'Arriving soon'}
                      </strong>
                      <p>
                        {isDeliveryPartner
                          ? `Pickup: ${order.foodPartner?.address || 'Restaurant'} → Drop: ${order.deliveryAddress}`
                          : order.deliveryAddress}
                      </p>
                      {order.deliveryPartner && (
                        <p className="rider-meta">
                          Rider: {order.deliveryPartner.fullName} ({order.deliveryPartner.vehicleNumber || order.deliveryPartner.phone})
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="order-items-preview">
                  {order.items.map((item, idx) => (
                    <span key={idx} className="order-item-chip">
                      {item.quantity}× {item.name}
                    </span>
                  ))}
                </div>

                <div className="order-card__footer">
                  <span className="order-total">
                    {totalQty} {totalQty === 1 ? 'Item' : 'Items'} · <strong>₹{order.totalAmount}</strong>
                  </span>

                  <div className="order-footer-actions">
                    <button type="button" className="btn-secondary-sm" onClick={() => setTrackingOrder(order)}>
                      Track Order
                    </button>

                    {/* Strict Restaurant Controls: Order Placed -> Preparing -> Out for Delivery */}
                    {isPartner && order.status === 'Order Placed' && (
                      <>
                        <button type="button" className="btn-primary-sm" disabled={updatingId === order._id} onClick={() => handleStatusUpdate(order._id, 'Preparing')}>
                          Accept &amp; Prepare
                        </button>
                        <button type="button" className="btn-secondary-sm" disabled={updatingId === order._id} onClick={() => handleStatusUpdate(order._id, 'Cancelled')}>
                          Reject
                        </button>
                      </>
                    )}
                    {isPartner && order.status === 'Preparing' && (
                      <button type="button" className="btn-primary-sm" disabled={updatingId === order._id} onClick={() => handleStatusUpdate(order._id, 'Out for Delivery')}>
                        Dispatch (Out for Delivery)
                      </button>
                    )}

                    {/* Strict Delivery Partner Controls: Preparing -> Out for Delivery -> Delivered */}
                    {isDeliveryPartner && order.status === 'Preparing' && (
                      <button type="button" className="btn-primary-sm" disabled={updatingId === order._id} onClick={() => handleStatusUpdate(order._id, 'Out for Delivery')}>
                        Pick Up Order
                      </button>
                    )}
                    {isDeliveryPartner && order.status === 'Out for Delivery' && (
                      <button type="button" className="btn-primary-sm" disabled={updatingId === order._id} onClick={() => handleStatusUpdate(order._id, 'Delivered')}>
                        Mark Delivered ✓
                      </button>
                    )}

                    {/* Strict Customer Controls: ONLY Cancel before Preparing, or Reorder after Delivered */}
                    {isUser && order.status === 'Order Placed' && (
                      <button type="button" className="btn-secondary-sm" disabled={updatingId === order._id} onClick={() => handleStatusUpdate(order._id, 'Cancelled')}>
                        Cancel Order
                      </button>
                    )}
                    {isUser && order.status === 'Delivered' && (
                      <button type="button" className="btn-primary-sm" onClick={() => handleReorder(order)}>
                        Reorder
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isUser && pastOrders.length > 0 && tab === 'ongoing' && (
        <section className="explore-section" style={{ marginTop: 24 }}>
          <div className="section-head"><h2>Order Again</h2></div>
          <div className="reorder-list">
            {pastOrders.slice(0, 3).map((po) => (
              <div key={po._id} className="reorder-card">
                <div className="order-partner-info">
                  <div className="order-partner-logo">
                    {po.foodPartner?.avatar ? <img src={po.foodPartner.avatar} alt={po.foodPartner.name} /> : (po.foodPartner?.name || 'R').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{po.foodPartner?.name}</h3>
                    <p className="restaurant-cuisines">★ {po.foodPartner?.rating || 4.5} · {po.items.map((i) => i.name).join(', ')}</p>
                  </div>
                </div>
                <button type="button" className="btn-secondary-sm" onClick={() => handleReorder(po)}>
                  Reorder
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Read-only Live Tracking Timeline Modal (NO customer status hacking!) */}
      {trackingOrder && (
        <div className="drawer-backdrop" onClick={() => setTrackingOrder(null)} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>Order #{trackingOrder.orderNumber}</h3>
                <p className="drawer-subtitle">{trackingOrder.foodPartner?.name}</p>
              </div>
              <button type="button" className="icon-close-btn" onClick={() => setTrackingOrder(null)}>✕</button>
            </div>

            <div className="tracking-timeline">
              {(trackingOrder.statusHistory || []).map((h, i) => (
                <div key={i} className="timeline-row">
                  <div className="timeline-dot" />
                  <div>
                    <strong>{h.status}</strong>
                    <p className="timeline-note">{h.note}</p>
                    <span className="timeline-time">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Orders;
