import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'cravescroll_cart_v1';

function loadInitialCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { partner: null, items: [] };
    const parsed = JSON.parse(raw);
    return {
      partner: parsed.partner || null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { partner: null, items: [] };
  }
}

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(loadInitialCart);
  const [pendingSwitch, setPendingSwitch] = useState(null); // { dish, partnerObj, onConfirmed }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  const addItem = useCallback((dish, partnerInfo, onConfirmed) => {
    const partnerObj =
      partnerInfo ||
      (typeof dish.foodPartner === 'object' ? dish.foodPartner : { _id: dish.foodPartner, name: 'Restaurant' });

    const partnerId = partnerObj?._id;
    if (!partnerId) return { added: false, needsConfirm: false };

    // If cart has items from ANOTHER restaurant, ask user explicitly before clearing!
    if (cart.partner && cart.partner._id !== partnerId && cart.items.length > 0) {
      setPendingSwitch({ dish, partnerObj, onConfirmed });
      return { added: false, needsConfirm: true };
    }

    setCart((prev) => {
      const existing = prev.items.find((i) => i._id === dish._id);
      const nextItems = existing
        ? prev.items.map((i) => (i._id === dish._id ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i))
        : [
            ...prev.items,
            {
              _id: dish._id,
              name: dish.name,
              price: Number(dish.price) || 0,
              thumbnail: dish.thumbnail || '',
              dietType: dish.dietType || 'Veg',
              quantity: 1,
            },
          ];

      return {
        partner: prev.partner || {
          _id: partnerId,
          name: partnerObj.name || 'Restaurant',
          avatar: partnerObj.avatar || '',
          deliveryTime: partnerObj.deliveryTime || '25–35 mins',
        },
        items: nextItems,
      };
    });

    onConfirmed?.();
    return { added: true, needsConfirm: false };
  }, [cart.partner, cart.items.length]);

  const confirmRestaurantSwitch = useCallback(() => {
    if (!pendingSwitch) return;
    const { dish, partnerObj, onConfirmed } = pendingSwitch;
    setCart({
      partner: {
        _id: partnerObj._id,
        name: partnerObj.name || 'Restaurant',
        avatar: partnerObj.avatar || '',
        deliveryTime: partnerObj.deliveryTime || '25–35 mins',
      },
      items: [
        {
          _id: dish._id,
          name: dish.name,
          price: Number(dish.price) || 0,
          thumbnail: dish.thumbnail || '',
          dietType: dish.dietType || 'Veg',
          quantity: 1,
        },
      ],
    });
    setPendingSwitch(null);
    onConfirmed?.();
  }, [pendingSwitch]);

  const cancelRestaurantSwitch = useCallback(() => setPendingSwitch(null), []);

  const updateQuantity = useCallback((dishId, delta) => {
    setCart((prev) => {
      const nextItems = prev.items
        .map((i) => (i._id === dishId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0);
      return {
        partner: nextItems.length ? prev.partner : null,
        items: nextItems,
      };
    });
  }, []);

  const removeItem = useCallback((dishId) => {
    setCart((prev) => {
      const nextItems = prev.items.filter((i) => i._id !== dishId);
      return {
        partner: nextItems.length ? prev.partner : null,
        items: nextItems,
      };
    });
  }, []);

  const clearCart = useCallback(() => setCart({ partner: null, items: [] }), []);

  const loadFromOrder = useCallback((order) => {
    if (!order?.foodPartner || !order?.items?.length) return;
    setCart({
      partner: {
        _id: order.foodPartner._id || order.foodPartner,
        name: order.foodPartner.name || 'Restaurant',
        avatar: order.foodPartner.avatar || '',
        deliveryTime: order.foodPartner.deliveryTime || '25–35 mins',
      },
      items: order.items.map((item) => ({
        _id: item.food?._id || item.food,
        name: item.name,
        price: Number(item.price) || 0,
        thumbnail: item.thumbnail || '',
        dietType: item.dietType || 'Veg',
        quantity: item.quantity || 1,
      })),
    });
  }, []);

  const getItemQuantity = useCallback(
    (dishId) => cart.items.find((i) => i._id === dishId)?.quantity || 0,
    [cart.items]
  );

  const summary = useMemo(() => {
    const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    const itemTotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = itemTotal === 0 ? 0 : itemTotal >= 499 ? 0 : 39;
    const taxes = Math.round(itemTotal * 0.05);
    const totalAmount = itemTotal + deliveryFee + taxes;
    return { totalItems, itemTotal, deliveryFee, taxes, totalAmount };
  }, [cart.items]);

  return (
    <CartContext.Provider
      value={{
        cart,
        ...summary,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        loadFromOrder,
        getItemQuantity,
      }}
    >
      {children}

      {pendingSwitch && (
        <div className="drawer-backdrop" onClick={cancelRestaurantSwitch} role="dialog" aria-modal="true" aria-label="Replace cart items">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Replace cart items?</h3>
              <button type="button" className="icon-close-btn" onClick={cancelRestaurantSwitch} aria-label="Close">✕</button>
            </div>
            <p className="switch-cart-msg">
              Your cart contains items from <strong>{cart.partner?.name}</strong>. Switching to{' '}
              <strong>{pendingSwitch.partnerObj?.name}</strong> will clear your current cart.
            </p>
            <div className="switch-cart-actions">
              <button type="button" className="btn-secondary-sm" onClick={cancelRestaurantSwitch}>
                Keep Current Cart
              </button>
              <button type="button" className="btn-primary-sm" onClick={confirmRestaurantSwitch}>
                Clear Cart &amp; Add
              </button>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
