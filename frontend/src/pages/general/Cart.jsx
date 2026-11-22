import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

const PAYMENT_OPTIONS = ['UPI', 'Card', 'Cash on Delivery'];

const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isUser } = useAuth();
  const {
    cart,
    totalItems,
    itemTotal,
    deliveryFee,
    taxes,
    totalAmount,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const { showToast } = useToast();

  const [deliveryAddress, setDeliveryAddress] = useState('Boring Road, Patna, Bihar - 800001');
  const [editingAddress, setEditingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [placing, setPlacing] = useState(false);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to place your order.', 'info');
      navigate('/user/login');
      return;
    }
    if (!isUser) {
      showToast('Switch to a customer account to place food orders.', 'info');
      return;
    }
    if (!deliveryAddress.trim()) {
      showToast('Please enter a delivery address.', 'error');
      return;
    }

    setPlacing(true);
    try {
      const { data } = await api.post('/orders', {
        foodPartnerId: cart.partner._id,
        items: cart.items.map((i) => ({ foodId: i._id, quantity: i.quantity })),
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod,
      });
      clearCart();
      showToast(`Order #${data.order.orderNumber} placed!`, 'success');
      navigate('/orders');
    } catch (err) {
      showToast(getErrorMessage(err, 'Could not place order'), 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <main className="explore-page">
        <div className="empty-state">
          <div className="empty-icon">🛒</div>
          <h3>Your CraveScroll cart is empty</h3>
          <p>Explore restaurants or watch food reels and tap Order Now to add dishes.</p>
          <div className="empty-cta-row">
            <Link to="/" className="btn-primary-sm">Explore Food</Link>
            <Link to="/reels" className="btn-secondary-sm">Watch Reels</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="explore-page cart-page">
      <header className="cart-header">
        <Link to="/" className="back-link">← Back</Link>
        <h1>Your Cart ({totalItems})</h1>
        <button type="button" className="btn-ghost-sm" onClick={clearCart}>Clear</button>
      </header>

      {cart.partner && (
        <Link to={`/food-partner/${cart.partner._id}`} className="cart-partner-banner">
          <div className="cart-partner-avatar">
            {cart.partner.avatar ? (
              <img src={cart.partner.avatar} alt={cart.partner.name} />
            ) : (
              cart.partner.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2>{cart.partner.name}</h2>
            <p>Estimated delivery: {cart.partner.deliveryTime || '25–35 mins'}</p>
          </div>
        </Link>
      )}

      <section className="surface-card">
        {cart.items.map((item) => (
          <div key={item._id} className="cart-item-row">
            <img
              className="cart-item-thumb"
              src={item.thumbnail || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&auto=format&fit=crop&q=70'}
              alt={item.name}
            />
            <div className="cart-item-info">
              <span className="cart-item-name">{item.name}</span>
              <span className="cart-item-price">₹{item.price * item.quantity}</span>
            </div>
            <div className="cart-item-controls">
              <div className="qty-stepper">
                <button type="button" onClick={() => updateQuantity(item._id, -1)} aria-label="Decrease">−</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => updateQuantity(item._id, 1)} aria-label="Increase">+</button>
              </div>
              <button type="button" className="remove-item-btn" onClick={() => removeItem(item._id)}>Remove</button>
            </div>
          </div>
        ))}

        {cart.partner && (
          <Link to={`/food-partner/${cart.partner._id}`} className="add-more-link">
            + Add more items from {cart.partner.name}
          </Link>
        )}
      </section>

      <section className="surface-card bill-card">
        <h3>Bill Details</h3>
        <div className="bill-row">
          <span>Item Total</span>
          <span>₹{itemTotal}</span>
        </div>
        <div className="bill-row">
          <span>Delivery Fee {itemTotal >= 499 ? '(Free over ₹499)' : ''}</span>
          <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
        </div>
        <div className="bill-row">
          <span>Taxes &amp; Charges (5% GST)</span>
          <span>₹{taxes}</span>
        </div>
        <div className="bill-row bill-row--total">
          <span>Total Amount</span>
          <span>₹{totalAmount}</span>
        </div>
      </section>

      <section className="surface-card">
        <div className="address-head">
          <div>
            <span className="muted-label">Deliver to</span>
            {!editingAddress && <p className="address-text">📍 {deliveryAddress}</p>}
          </div>
          <button type="button" className="btn-secondary-sm" onClick={() => setEditingAddress((e) => !e)}>
            {editingAddress ? 'Done' : 'Edit'}
          </button>
        </div>
        {editingAddress && (
          <textarea
            className="address-textarea"
            rows={2}
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Enter complete delivery address..."
          />
        )}

        <div className="payment-methods">
          <span className="muted-label">Payment Method</span>
          <div className="payment-pills">
            {PAYMENT_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                className={`filter-chip ${paymentMethod === m ? 'is-active' : ''}`}
                onClick={() => setPaymentMethod(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button
        type="button"
        className="btn-primary btn-block checkout-pay-btn"
        disabled={placing}
        onClick={handleCheckout}
      >
        {placing ? 'Placing your order...' : `Proceed to Pay ₹${totalAmount} →`}
      </button>
    </main>
  );
};

export default Cart;
