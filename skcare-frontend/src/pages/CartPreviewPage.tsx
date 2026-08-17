// pages/CartPreviewPage.tsx
import React, { useState } from 'react';
import NavBar    from '../components/NavBar';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

// ─── SVG icons ────────────────────────────────────────────────────────────────

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

const MinusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const CreditCardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

const CartPreviewPage: React.FC = () => {
  const { cart, cartTotal, removeFromCart, updateItemQuantity } = useCart();
  const navigate = useNavigate();

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | null>(null);

  const items = cart?.items ?? [];

  const handleQtyChange = async (productId: string, newQty: number) => {
    if (newQty < 0) return;
    setUpdatingId(productId);
    try {
      await updateItemQuantity(productId, newQty);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    try {
      await removeFromCart(productId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleCheckout = () => {
    if (!paymentMethod) return;
    navigate(`/checkout-form?payment=${paymentMethod}`);
  };

  return (
    <section className="pb-16 min-h-screen bg-[#FAFAFA]">
      <div className="hidden md:block text-center py-2 bg-[#4F705B] text-white text-sm font-medium">
        Free deliveries on all orders within Nigeria
      </div>
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Your Cart</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl">🛒</div>
            <h2 className="text-lg font-semibold text-gray-700">Your cart is empty</h2>
            <p className="text-sm text-gray-400">Add some products to get started.</p>
            <Link to="/"
              className="mt-2 px-6 py-2 rounded-lg bg-[#4F705B] text-white text-sm font-semibold
                         hover:bg-[#3a5344] transition">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* Items */}
            <div className="flex-1 space-y-4">
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-4 pb-2
                              border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span>Product</span>
                <span className="text-center">Quantity</span>
                <span className="text-right">Price</span>
                <span />
              </div>

              {items.map((item) => (
                <div
                  key={item.productId}
                  className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 transition-opacity ${
                    removingId === item.productId ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto_auto_auto]
                                  gap-4 items-center">
                    <img src={item.imageUrl} alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">₦{item.price.toLocaleString()} each</p>
                    </div>
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleQtyChange(item.productId, item.quantity - 1)}
                        disabled={!!updatingId}
                        aria-label="Decrease quantity"
                        className="w-8 h-8 flex items-center justify-center text-gray-600
                                   hover:bg-gray-100 transition disabled:opacity-40"
                      >
                        <MinusIcon />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-gray-800">
                        {updatingId === item.productId ? '…' : item.quantity}
                      </span>
                      <button
                        onClick={() => handleQtyChange(item.productId, item.quantity + 1)}
                        disabled={!!updatingId}
                        aria-label="Increase quantity"
                        className="w-8 h-8 flex items-center justify-center text-gray-600
                                   hover:bg-gray-100 transition disabled:opacity-40"
                      >
                        <PlusIcon />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-gray-800 text-right min-w-[80px]">
                      ₦{(item.price * item.quantity).toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleRemove(item.productId)}
                      disabled={!!removingId}
                      aria-label={`Remove ${item.name}`}
                      className="text-gray-300 hover:text-red-500 transition disabled:opacity-40"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}

              <Link to="/" className="inline-flex items-center gap-1 text-sm text-[#4F705B] hover:underline mt-2">
                ← Continue Shopping
              </Link>
            </div>

            {/* Summary */}
            <div className="w-full lg:w-[360px] flex-shrink-0 space-y-4">

              {/* Totals */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-base font-bold text-gray-800 mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                    <span className="font-medium text-gray-800">₦{cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className="font-semibold text-[#4F705B]">Free</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between
                                  font-bold text-gray-900 text-base">
                    <span>Total</span>
                    <span>₦{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-base font-bold text-gray-800 mb-1">Payment Method</h2>
                <p className="text-xs text-gray-400 mb-4">Select how you'd like to pay</p>

                <div className="space-y-3">
                  {/* Card payment — active */}
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-sm
                                font-medium transition ${
                      paymentMethod === 'card'
                        ? 'border-[#4F705B] bg-[#f0f7f3] text-[#4F705B]'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md ${
                      paymentMethod === 'card' ? 'bg-[#4F705B] text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <CreditCardIcon />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">Card Payment</p>
                      <p className="text-xs text-gray-400 font-normal">Debit / Credit card</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      paymentMethod === 'card' ? 'border-[#4F705B]' : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-[#4F705B]" />}
                    </div>
                  </button>

                  {/* Bank transfer — coming soon */}
                  <div className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-100
                                  bg-gray-50 text-sm cursor-not-allowed opacity-50"
                    aria-disabled="true" title="Bank transfer coming soon">
                    <div className="p-1.5 rounded-md bg-gray-200 text-gray-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/>
                        <line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/>
                        <line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-400">Bank Transfer</p>
                      <p className="text-xs text-gray-400 font-normal">Coming soon</p>
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Soon</span>
                  </div>
                </div>

                {!paymentMethod && (
                  <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                    <span>⚠</span> Please select a payment method to continue.
                  </p>
                )}
              </div>

              {/* Checkout button */}
              <button
                onClick={handleCheckout}
                disabled={items.length === 0 || !paymentMethod}
                className="w-full py-4 rounded-xl bg-[#4F705B] text-white font-bold text-sm
                           hover:bg-[#3a5344] active:scale-[0.98] transition
                           disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                Proceed to Checkout →
              </button>

              <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                🔒 Payments are secured by Flutterwave
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CartPreviewPage;
