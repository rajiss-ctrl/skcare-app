// pages/Checkout.tsx
import React, { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useCart }  from '@/context/CartContext';
import { useAuth }  from '@/context/AuthContext';

const API = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShippingForm {
  fullName:    string;
  email:       string;
  phone:       string;
  street:      string;
  city:        string;
  state:       string;
  postalCode:  string;
  country:     string;
}

interface AccountForm {
  newName:     string;
  newEmail:    string;
  newPassword: string;
  confirmPwd:  string;
}

interface FlwConfig {
  public_key:      string;
  tx_ref:          string;
  amount:          number;
  currency:        string;
  payment_options: string;
  customer:        { email: string; name: string; phone_number: string };
  customizations:  { title: string; description: string; logo: string };
}

// ─── Inline icon components ───────────────────────────────────────────────────

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SpinnerIcon = () => (
  <div className="w-5 h-5 border-2 border-[#4F705B] border-t-transparent rounded-full animate-spin" />
);

// ─── Flutterwave global type declaration ─────────────────────────────────────
declare global {
  interface Window {
    FlutterwaveCheckout: (config: Record<string, unknown>) => void;
  }
}

// ─── Pay button — uses the official inline script loaded in index.html ────────
const PayButton: React.FC<{
  config:    FlwConfig;
  onSuccess: (tx_ref: string) => void;
  onClose:   () => void;
  disabled:  boolean;
}> = ({ config, onSuccess, onClose, disabled }) => {

  const handlePay = () => {
    if (!window.FlutterwaveCheckout) {
      alert('Payment system is loading, please try again in a moment.');
      return;
    }

    window.FlutterwaveCheckout({
      public_key:      config.public_key,
      tx_ref:          config.tx_ref,
      amount:          config.amount,
      currency:        config.currency,
      payment_options: 'card',          // card only — matches our cart selection
      customer: {
        email:        config.customer.email,
        name:         config.customer.name,
        phone_number: config.customer.phone_number,
      },
      customizations: {
        title:       config.customizations.title,
        description: config.customizations.description,
        logo:        config.customizations.logo,
      },
      callback: (response: { status: string; tx_ref: string; transaction_id: number }) => {
        // Server-side verification — never trust the client callback status
        onSuccess(response.tx_ref);
      },
      onclose: () => {
        onClose();
      },
    });
  };

  return (
    <button
      disabled={disabled}
      onClick={handlePay}
      className="w-full py-4 rounded-xl bg-[#4F705B] text-white font-bold text-sm hover:bg-[#3a5344] active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
    >
      <LockIcon />
      Pay ₦{config.amount.toLocaleString()} Securely
    </button>
  );
};

// ─── Step indicator ───────────────────────────────────────────────────────────

const StepIndicator: React.FC<{
  steps:   string[];
  current: number;
}> = ({ steps, current }) => (
  <div className="flex items-center justify-center gap-2 mb-8 text-xs">
    {steps.map((label, i) => {
      const isDone   = i < current;
      const isActive = i === current;
      return (
        <React.Fragment key={label}>
          <div className={`flex items-center gap-1.5 font-medium ${
            isActive ? 'text-[#4F705B]' : isDone ? 'text-gray-500' : 'text-gray-300'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              isActive ? 'bg-[#4F705B] text-white' :
              isDone   ? 'bg-gray-500 text-white'  :
                         'bg-gray-200 text-gray-400'
            }`}>
              {isDone ? <CheckIcon /> : i + 1}
            </span>
            {label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-10 h-px ${isDone ? 'bg-gray-500' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Order summary sidebar ────────────────────────────────────────────────────

const OrderSummary: React.FC<{
  items:      { productId: string; name: string; imageUrl: string; price: number; quantity: number }[];
  cartTotal:  number;
  step:       string;
}> = ({ items, cartTotal, step }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-6">
    <h3 className="text-sm font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100">
      Order Summary
    </h3>

    {/* Items */}
    <div className="space-y-3 mb-4">
      {items.map((item) => (
        <div key={item.productId} className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img src={item.imageUrl} alt={item.name}
              className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-600 text-white text-[9px] flex items-center justify-center font-bold">
              {item.quantity}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{item.name}</p>
          </div>
          <p className="text-xs font-semibold text-gray-800 flex-shrink-0">
            ₦{(item.price * item.quantity).toLocaleString()}
          </p>
        </div>
      ))}
    </div>

    {/* Totals */}
    <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
      <div className="flex justify-between text-gray-500">
        <span>Subtotal</span>
        <span>₦{cartTotal.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-gray-500">
        <span>Delivery</span>
        <span className="text-[#4F705B] font-semibold">Free</span>
      </div>
      <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
        <span>Total</span>
        <span>₦{cartTotal.toLocaleString()}</span>
      </div>
    </div>

    {/* Security badge */}
    {step === 'payment' && (
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <LockIcon />
        Secured by Flutterwave
      </div>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const CheckoutForm: React.FC = () => {
  const { cart, cartTotal, updateShippingDetails, checkout, fetchCart } = useCart();
  const { user, getToken, convertGuest, signIn }                         = useAuth();
  const navigate                                                          = useNavigate();
  const [searchParams]                                                    = useSearchParams();

  // Redirect to cart if arrived without a payment method selected
  const paymentFromCart = searchParams.get('payment') as 'card' | 'bank_transfer' | null;
  useEffect(() => {
    if (!paymentFromCart) navigate('/cartpreview', { replace: true });
  }, [paymentFromCart, navigate]);

  const isGuest = user?.isGuest ?? false;

  // Steps: guests go account → shipping → payment
  //        signed-in users go shipping → payment
  const steps       = isGuest ? ['Account', 'Shipping', 'Payment'] : ['Shipping', 'Payment'];
  const stepKeys    = isGuest ? ['account', 'shipping', 'payment'] : ['shipping', 'payment'];
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = stepKeys[stepIndex];

  const [submitting,   setSubmitting]   = useState(false);
  const [serverError,  setServerError]  = useState('');
  const [cartMerged,   setCartMerged]   = useState(false);
  const [mergedEmail,  setMergedEmail]  = useState('');
  const [flwConfig,    setFlwConfig]    = useState<FlwConfig | null>(null);
  const [verifying,    setVerifying]    = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const items = cart?.items ?? [];

  const inputCls = 'w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#4F705B] focus:ring-1 focus:ring-[#4F705B] bg-white transition';
  const errCls   = 'text-red-500 text-xs mt-1';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  // ── Account form (guest only) ──────────────────────────────────────────────
  const {
    register: regA,
    handleSubmit: submitA,
    watch: watchA,
    formState: { errors: errA },
  } = useForm<AccountForm>();

  // ── Shipping form ──────────────────────────────────────────────────────────
  const {
    register: regS,
    handleSubmit: submitS,
    formState: { errors: errS },
  } = useForm<ShippingForm>({
    defaultValues: {
      fullName: (!isGuest && user?.name)  || '',
      email:    (!isGuest && user?.email) || '',
    },
  });

  // ── Auth fetch helper ──────────────────────────────────────────────────────
  const authFetch = async (path: string, options: RequestInit = {}) => {
    const token = getToken();
    const res   = await fetch(`${API}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  };

  // ── Step: Account (guest) ──────────────────────────────────────────────────
  const onAccountSubmit: SubmitHandler<AccountForm> = async (data) => {
    setServerError('');
    setSubmitting(true);
    try {
      const result = await convertGuest(data.newEmail, data.newPassword, data.newName);
      if (result.cartMerged) {
        setMergedEmail(data.newEmail);
        setCartMerged(true);
        return;
      }
      await fetchCart();
      setStepIndex(1); // → shipping
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Account creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step: Merged sign-in ───────────────────────────────────────────────────
  const [mergedPwd,    setMergedPwd]    = useState('');
  const [mergedPwdErr, setMergedPwdErr] = useState('');

  const handleMergedSignIn = async () => {
    setMergedPwdErr('');
    setSubmitting(true);
    try {
      await signIn(mergedEmail, mergedPwd);
      await fetchCart();
      setCartMerged(false);
      setStepIndex(1); // → shipping
    } catch (err: unknown) {
      setMergedPwdErr(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step: Shipping ─────────────────────────────────────────────────────────
  const onShippingSubmit: SubmitHandler<ShippingForm> = async (data) => {
    setServerError('');
    setSubmitting(true);
    try {
      // Save shipping details to cart
      await updateShippingDetails({
        name:  data.fullName,
        phone: data.phone,
        shippingAddress: {
          street:  data.street,
          city:    data.city,
          state:   data.state,
          zipCode: data.postalCode,
          country: data.country,
        },
        paymentMethod: paymentFromCart === 'card' ? 'flutterwave' : 'bank_transfer',
      });

      // Create the pending order
      const { orderId } = await checkout();

      // Get Flutterwave config from backend
      const pd = await authFetch('/api/flutterwave/initiate-payment', {
        method: 'POST',
        body:   JSON.stringify({ orderId }),
      });

      setFlwConfig({
        public_key:      pd.public_key,
        tx_ref:          pd.tx_ref,
        amount:          pd.amount,
        currency:        pd.currency,
        payment_options: 'card',  // card only — bank transfer is inactive
        customer:        pd.customer,
        customizations:  pd.customizations,
      });

      setStepIndex(stepKeys.indexOf('payment')); // → payment
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to prepare order.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step: Payment verification ─────────────────────────────────────────────
  const handlePaymentCallback = async (tx_ref: string) => {
    setVerifying(true);
    setPaymentError('');

    const MAX_POLLS  = 6;
    const POLL_DELAY = 10_000;

    for (let i = 1; i <= MAX_POLLS; i++) {
      try {
        const data = await authFetch(`/api/flutterwave/transaction-status/${tx_ref}`);
        if (data.status === 'success') {
          setVerifying(false);
          navigate(`/?order=${data.orderId}`);
          return;
        }
        if (data.status === 'failed') {
          setVerifying(false);
          setPaymentError('Payment was not successful. Please try again.');
          return;
        }
      } catch { /* continue polling */ }

      if (i < MAX_POLLS) await new Promise((r) => setTimeout(r, POLL_DELAY));
    }

    setVerifying(false);
    setPaymentError(
      'Verification is taking longer than expected. If your payment was deducted, ' +
      'your order will be confirmed shortly — check your order history.'
    );
  };

  const handleModalClose = () => setPaymentError('Payment was cancelled. You can try again below.');

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="min-h-screen bg-[#FAFAFA]">
      {/* Top banner */}
      <p className="bg-[#4F705B] w-full text-center text-white text-sm py-2 font-medium">
        Free deliveries on all orders within Nigeria
      </p>
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link to="/cartpreview" className="inline-flex items-center gap-1 text-sm text-[#4F705B] hover:underline mb-6">
          ← Back to Cart
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

        {/* Step indicator */}
        <StepIndicator steps={steps} current={stepIndex} />

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── LEFT: Step panels ──────────────────────────────────────── */}
          <div className="flex-1 space-y-4">

            {/* ── ACCOUNT STEP ─────────────────────────────────────────── */}
            {currentStep === 'account' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                {!cartMerged ? (
                  <>
                    <div className="mb-5 pb-4 border-b border-gray-100">
                      <h2 className="text-base font-bold text-gray-800">Create Your Account</h2>
                      <p className="text-xs text-gray-400 mt-1">Save your details to track orders and check out faster next time.</p>
                    </div>
                    <form onSubmit={submitA(onAccountSubmit)} className="space-y-4">
                      <div>
                        <label className={labelCls}>Full Name *</label>
                        <input type="text" className={inputCls} placeholder="John Doe"
                          {...regA('newName', { required: 'Full name is required' })} />
                        {errA.newName && <p className={errCls}>{errA.newName.message}</p>}
                      </div>
                      <div>
                        <label className={labelCls}>Email Address *</label>
                        <input type="email" className={inputCls} placeholder="you@email.com"
                          {...regA('newEmail', { required: 'Email is required' })} />
                        {errA.newEmail && <p className={errCls}>{errA.newEmail.message}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Password *</label>
                          <input type="password" className={inputCls} placeholder="••••••••"
                            {...regA('newPassword', {
                              required: 'Password is required',
                              minLength: { value: 8, message: 'Min 8 characters' },
                              validate: {
                                upper:   (v) => /[A-Z]/.test(v) || 'Needs an uppercase letter',
                                number:  (v) => /[0-9]/.test(v) || 'Needs a number',
                                special: (v) => /[^A-Za-z0-9]/.test(v) || 'Needs a special character',
                              },
                            })} />
                          {errA.newPassword && <p className={errCls}>{errA.newPassword.message}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Confirm Password *</label>
                          <input type="password" className={inputCls} placeholder="••••••••"
                            {...regA('confirmPwd', {
                              required: 'Please confirm',
                              validate: (v) => v === watchA('newPassword') || 'Passwords do not match',
                            })} />
                          {errA.confirmPwd && <p className={errCls}>{errA.confirmPwd.message}</p>}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">Min 8 chars · one uppercase · one number · one special character</p>
                      {serverError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}
                      <button type="submit" disabled={submitting}
                        className="w-full py-3 rounded-xl bg-[#4F705B] text-white font-bold text-sm hover:bg-[#3a5344] disabled:opacity-50 transition">
                        {submitting ? 'Creating account…' : 'Save & Continue →'}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="mb-5 pb-4 border-b border-gray-100">
                      <h2 className="text-base font-bold text-gray-800">✅ Cart Saved — Sign In to Continue</h2>
                      <p className="text-sm text-gray-500 mt-2">
                        <strong>{mergedEmail}</strong> is already registered. Your cart items have been saved to that account.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>Password *</label>
                        <input type="password" className={inputCls} placeholder="Your password"
                          value={mergedPwd} onChange={(e) => setMergedPwd(e.target.value)} />
                      </div>
                      {mergedPwdErr && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{mergedPwdErr}</p>}
                      <button onClick={handleMergedSignIn} disabled={submitting || !mergedPwd}
                        className="w-full py-3 rounded-xl bg-[#4F705B] text-white font-bold text-sm hover:bg-[#3a5344] disabled:opacity-50 transition">
                        {submitting ? 'Signing in…' : 'Sign In & Continue →'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── SHIPPING STEP ─────────────────────────────────────────── */}
            {currentStep === 'shipping' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="mb-5 pb-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-800">Shipping Information</h2>
                  <p className="text-xs text-gray-400 mt-1">We'll deliver to this address.</p>
                </div>

                <form onSubmit={submitS(onShippingSubmit)} className="space-y-4">
                  {/* Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Full Name *</label>
                      <input type="text" className={inputCls} placeholder="John Doe"
                        {...regS('fullName', { required: 'Full name is required' })} />
                      {errS.fullName && <p className={errCls}>{errS.fullName.message}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Phone Number *</label>
                      <input type="tel" className={inputCls} placeholder="08012345678"
                        {...regS('phone', { required: 'Phone number is required' })} />
                      {errS.phone && <p className={errCls}>{errS.phone.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Email Address *</label>
                    <input type="email" className={inputCls} placeholder="you@email.com"
                      {...regS('email', { required: 'Email is required' })} />
                    {errS.email && <p className={errCls}>{errS.email.message}</p>}
                  </div>

                  {/* Address */}
                  <div className="pt-2 pb-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Delivery Address</p>
                  </div>

                  <div>
                    <label className={labelCls}>Street Address *</label>
                    <input type="text" className={inputCls} placeholder="12 Lagos Island, Suite 4"
                      {...regS('street', { required: 'Street address is required' })} />
                    {errS.street && <p className={errCls}>{errS.street.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>City *</label>
                      <input type="text" className={inputCls} placeholder="Lagos"
                        {...regS('city', { required: 'City is required' })} />
                      {errS.city && <p className={errCls}>{errS.city.message}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>State *</label>
                      <input type="text" className={inputCls} placeholder="Lagos State"
                        {...regS('state', { required: 'State is required' })} />
                      {errS.state && <p className={errCls}>{errS.state.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Postal Code *</label>
                      <input type="text" className={inputCls} placeholder="100001"
                        {...regS('postalCode', { required: 'Postal code is required' })} />
                      {errS.postalCode && <p className={errCls}>{errS.postalCode.message}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Country *</label>
                      <input type="text" className={inputCls} placeholder="Nigeria"
                        {...regS('country', { required: 'Country is required' })} />
                      {errS.country && <p className={errCls}>{errS.country.message}</p>}
                    </div>
                  </div>

                  {serverError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>}

                  <button type="submit" disabled={submitting || items.length === 0}
                    className="w-full py-3 rounded-xl bg-[#4F705B] text-white font-bold text-sm hover:bg-[#3a5344] disabled:opacity-50 transition">
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2"><SpinnerIcon /> Preparing order…</span>
                    ) : (
                      'Continue to Payment →'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ── PAYMENT STEP ──────────────────────────────────────────── */}
            {currentStep === 'payment' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="mb-5 pb-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-800">Payment</h2>
                  <p className="text-xs text-gray-400 mt-1">Your connection is encrypted and secure.</p>
                </div>

                {/* Shipping confirmed summary */}
                <div className="mb-5 p-3 bg-[#f0f7f3] rounded-lg border border-[#4F705B]/20 flex items-center gap-2 text-sm text-[#4F705B]">
                  <CheckIcon />
                  <span className="font-medium">Shipping details confirmed</span>
                </div>

                {/* Payment method display */}
                <div className="mb-5 p-4 border border-gray-200 rounded-lg flex items-center gap-3">
                  <div className="p-2 rounded-md bg-[#4F705B] text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Card Payment</p>
                    <p className="text-xs text-gray-400">Debit / Credit card via Flutterwave</p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs bg-[#f0f7f3] text-[#4F705B] border border-[#4F705B]/20 px-2 py-0.5 rounded-full font-medium">Selected</span>
                  </div>
                </div>

                {/* Verification spinner */}
                {verifying && (
                  <div className="mb-4 flex items-center gap-3 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <SpinnerIcon />
                    Verifying your payment — please wait…
                  </div>
                )}

                {/* Payment error */}
                {paymentError && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    {paymentError}
                  </div>
                )}

                {/* Pay button */}
                {flwConfig && (
                  <PayButton
                    config={flwConfig}
                    onSuccess={handlePaymentCallback}
                    onClose={handleModalClose}
                    disabled={verifying}
                  />
                )}

                <p className="mt-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                  <LockIcon /> 256-bit SSL encryption · Powered by Flutterwave
                </p>
              </div>
            )}

          </div>

          {/* ── RIGHT: Order summary ──────────────────────────────────────── */}
          <div className="w-full lg:w-[340px] flex-shrink-0">
            <OrderSummary items={items} cartTotal={cartTotal} step={currentStep} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CheckoutForm;
