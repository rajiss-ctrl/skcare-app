// pages/Checkout.tsx
/**
 * Checkout flows:
 *
 * A — Anonymous user (no account):
 *    Single form: registration (name, email, password, confirm) + shipping details.
 *    On submit:
 *      1. Calls POST /api/auth/register-checkout with credentials + sessionStorage cart items.
 *      2. Server creates account, saves cart to DB, returns tokens.
 *      3. User is now signed in. Proceeds to payment.
 *    If email already exists: shows "please sign in" prompt.
 *
 * B — Authenticated user (already signed in):
 *    Only shipping details form.
 *    On submit: saves shipping to DB cart, creates order, proceeds to payment.
 */
import React, { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useCart }  from '@/context/CartContext';
import { useAuth }  from '@/context/AuthContext';

const API = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000';

// ─── Form types ───────────────────────────────────────────────────────────────

interface AnonForm {
  name:        string;
  email:       string;
  password:    string;
  confirmPwd:  string;
  phone:       string;
  street:      string;
  city:        string;
  state:       string;
  postalCode:  string;
  country:     string;
}

interface ShippingForm {
  fullName:   string;
  email:      string;
  phone:      string;
  street:     string;
  city:       string;
  state:      string;
  postalCode: string;
  country:    string;
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

// ─── Icons ────────────────────────────────────────────────────────────────────

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SpinnerIcon = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
);

// ─── Flutterwave global ───────────────────────────────────────────────────────
declare global {
  interface Window {
    FlutterwaveCheckout: (config: Record<string, unknown>) => void;
  }
}

// ─── Pay button ───────────────────────────────────────────────────────────────
const PayButton: React.FC<{
  config:    FlwConfig;
  onSuccess: (tx_ref: string) => void;
  onClose:   () => void;
  disabled:  boolean;
}> = ({ config, onSuccess, onClose, disabled }) => {
  const handlePay = () => {
    if (!window.FlutterwaveCheckout) {
      alert('Payment system is loading. Please try again in a moment.');
      return;
    }
    window.FlutterwaveCheckout({
      public_key:      config.public_key,
      tx_ref:          config.tx_ref,
      amount:          config.amount,
      currency:        config.currency,
      payment_options: 'card',
      customer:        config.customer,
      customizations:  config.customizations,
      callback: (response: { status: string; tx_ref: string }) => {
        onSuccess(response.tx_ref);
      },
      onclose: () => onClose(),
    });
  };

  return (
    <button
      disabled={disabled}
      onClick={handlePay}
      className="w-full py-4 rounded-xl bg-[#4F705B] text-white font-bold text-sm
                 hover:bg-[#3a5344] active:scale-[0.98] transition
                 disabled:opacity-40 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2 shadow-sm"
    >
      <LockIcon />
      Pay ₦{config.amount.toLocaleString()} Securely
    </button>
  );
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ steps: string[]; current: number }> = ({ steps, current }) => (
  <div className="flex items-center justify-center gap-2 mb-8 text-xs">
    {steps.map((label, i) => {
      const isDone   = i < current;
      const isActive = i === current;
      return (
        <React.Fragment key={label}>
          <div className={`flex items-center gap-1.5 font-medium ${
            isActive ? 'text-[#4F705B]' : isDone ? 'text-gray-500' : 'text-gray-300'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center
                              text-[10px] font-bold ${
              isActive ? 'bg-[#4F705B] text-white' :
              isDone   ? 'bg-gray-400 text-white'  :
                         'bg-gray-200 text-gray-400'
            }`}>
              {isDone ? <CheckIcon /> : i + 1}
            </span>
            {label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-10 h-px ${isDone ? 'bg-gray-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Order summary sidebar ────────────────────────────────────────────────────
const OrderSummary: React.FC<{
  items:     { productId: string; name: string; imageUrl: string; price: number; quantity: number }[];
  cartTotal: number;
  step:      string;
}> = ({ items, cartTotal, step }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-6">
    <h3 className="text-sm font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100">
      Order Summary
    </h3>
    <div className="space-y-3 mb-4">
      {items.map((item) => (
        <div key={item.productId} className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <img src={item.imageUrl} alt={item.name}
              className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-600
                             text-white text-[9px] flex items-center justify-center font-bold">
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
    <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
      <div className="flex justify-between text-gray-500">
        <span>Subtotal</span><span>₦{cartTotal.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-gray-500">
        <span>Delivery</span>
        <span className="text-[#4F705B] font-semibold">Free</span>
      </div>
      <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
        <span>Total</span><span>₦{cartTotal.toLocaleString()}</span>
      </div>
    </div>
    {step === 'payment' && (
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center
                      gap-1.5 text-xs text-gray-400">
        <LockIcon /> Secured by Flutterwave
      </div>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const CheckoutForm: React.FC = () => {
  const { cart, cartTotal, updateShippingDetails, checkout, fetchCart, getLocalCartItems } = useCart();
  const { user, getToken, signIn, registerAndCheckout } = useAuth();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  // Guard — must arrive from cart with a payment method selected
  const paymentFromCart = searchParams.get('payment') as 'card' | null;
  useEffect(() => {
    if (!paymentFromCart) navigate('/cartpreview', { replace: true });
  }, [paymentFromCart, navigate]);

  const isAnonymous = !user;

  // Both flows use two steps: details → payment
  const steps    = isAnonymous ? ['Your Details', 'Payment'] : ['Shipping', 'Payment'];
  const stepKeys = ['details', 'payment'];
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = stepKeys[stepIndex];

  const [submitting,        setSubmitting]        = useState(false);
  const [serverError,       setServerError]        = useState('');
  const [emailExistsState,  setEmailExistsState]   = useState(false);
  const [emailForSignIn,    setEmailForSignIn]      = useState('');
  const [signinPwd,         setSigninPwd]           = useState('');
  const [signinErr,         setSigninErr]           = useState('');
  const [flwConfig,         setFlwConfig]           = useState<FlwConfig | null>(null);
  const [verifying,         setVerifying]           = useState(false);
  const [paymentError,      setPaymentError]        = useState('');

  const items = cart?.items ?? [];

  const inputCls = 'w-full border border-gray-200 rounded-lg px-4 py-3 text-sm ' +
                   'focus:outline-none focus:border-[#4F705B] focus:ring-1 ' +
                   'focus:ring-[#4F705B] bg-white transition placeholder:text-gray-400';
  const errCls   = 'text-red-500 text-xs mt-1';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  // ── Anonymous form (registration + shipping combined) ─────────────────────
  const {
    register: regA,
    handleSubmit: submitA,
    watch: watchA,
    formState: { errors: errA },
  } = useForm<AnonForm>();

  // ── Authenticated shipping form ───────────────────────────────────────────
  const {
    register: regS,
    handleSubmit: submitS,
    formState: { errors: errS },
  } = useForm<ShippingForm>({
    defaultValues: {
      fullName: user?.name  || '',
      email:    user?.email || '',
    },
  });

  // ── Auth fetch (authenticated routes) ─────────────────────────────────────
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

  // ── Shared: save shipping + create order + get Flutterwave config ─────────
  const proceedToPayment = async (data: {
    name: string; email: string; phone: string;
    street: string; city: string; state: string; postalCode: string; country: string;
  }) => {
    await updateShippingDetails({
      name:  data.name,
      phone: data.phone,
      shippingAddress: {
        street:  data.street,
        city:    data.city,
        state:   data.state,
        zipCode: data.postalCode,
        country: data.country,
      },
      paymentMethod: 'flutterwave',
    });

    const { orderId } = await checkout();

    const pd = await authFetch('/api/flutterwave/initiate-payment', {
      method: 'POST',
      body:   JSON.stringify({ orderId }),
    });

    setFlwConfig({
      public_key:      pd.public_key,
      tx_ref:          pd.tx_ref,
      amount:          pd.amount,
      currency:        pd.currency,
      payment_options: 'card',
      customer:        pd.customer,
      customizations:  pd.customizations,
    });

    setStepIndex(1); // → payment
  };

  // ── Flow A: anonymous user submits registration + shipping ────────────────
  const onAnonSubmit: SubmitHandler<AnonForm> = async (data) => {
    setServerError('');
    setEmailExistsState(false);
    setSubmitting(true);
    try {
      // 1. Read cart from sessionStorage
      const cartItems = getLocalCartItems();

      // 2. Register account + save cart to DB in one server round-trip
      await registerAndCheckout(data.email, data.password, data.name, cartItems);

      // 3. After registerAndCheckout the user is signed in.
      //    Re-fetch the DB cart so CartContext has the transferred items.
      await fetchCart();

      // 4. Save shipping + create order + payment config
      await proceedToPayment({
        name:       data.name,
        email:      data.email,
        phone:      data.phone,
        street:     data.street,
        city:       data.city,
        state:      data.state,
        postalCode: data.postalCode,
        country:    data.country,
      });
    } catch (err: unknown) {
      const e = err as Error & { emailExists?: boolean };
      if (e.emailExists) {
        // Email already registered — ask them to sign in
        setEmailForSignIn(data.email);
        setEmailExistsState(true);
      } else {
        setServerError(e.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── "Email exists" — sign in with existing account then continue ──────────
  const handleExistingSignIn = async () => {
    setSigninErr('');
    setSubmitting(true);
    try {
      await signIn(emailForSignIn, signinPwd);
      // After sign-in, CartContext will load the DB cart.
      // The sessionStorage items are NOT automatically transferred here —
      // they were not saved to the server yet.
      // Merge local items into DB cart manually.
      const localItems = getLocalCartItems();
      if (localItems.length > 0) {
        await authFetch('/api/carts/items', {
          method: 'POST',
          body:   JSON.stringify({ items: localItems }),
        });
        sessionStorage.removeItem('skcare_local_cart');
      }
      await fetchCart();
      setEmailExistsState(false);
      setEmailForSignIn('');
      setSigninPwd('');
    } catch (err: unknown) {
      setSigninErr(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Flow B: authenticated user submits shipping only ─────────────────────
  const onShippingSubmit: SubmitHandler<ShippingForm> = async (data) => {
    setServerError('');
    setSubmitting(true);
    try {
      await proceedToPayment({
        name:       data.fullName,
        email:      data.email,
        phone:      data.phone,
        street:     data.street,
        city:       data.city,
        state:      data.state,
        postalCode: data.postalCode,
        country:    data.country,
      });
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to prepare order.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Payment verification ──────────────────────────────────────────────────
  const handlePaymentCallback = async (tx_ref: string) => {
    setVerifying(true);
    setPaymentError('');
    const MAX_POLLS = 6;
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
      } catch { /* keep polling */ }
      if (i < MAX_POLLS) await new Promise((r) => setTimeout(r, 10_000));
    }
    setVerifying(false);
    setPaymentError(
      'Verification is taking longer than expected. If your payment was deducted, ' +
      'your order will be confirmed shortly — check your order history.'
    );
  };

  const handleModalClose = () => setPaymentError('Payment was cancelled. You can try again.');

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="min-h-screen bg-[#FAFAFA]">
      <p className="bg-[#4F705B] w-full text-center text-white text-sm py-2 font-medium">
        Free deliveries on all orders within Nigeria
      </p>
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link to="/cartpreview"
          className="inline-flex items-center gap-1 text-sm text-[#4F705B] hover:underline mb-6">
          ← Back to Cart
        </Link>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

        <StepIndicator steps={steps} current={stepIndex} />

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── LEFT PANEL ───────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* ══ DETAILS STEP ════════════════════════════════════════════ */}
            {currentStep === 'details' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">

                {/* Email-already-exists: sign in instead */}
                {emailExistsState ? (
                  <>
                    <div className="mb-5 pb-4 border-b border-gray-100">
                      <h2 className="text-base font-bold text-gray-800">✅ Sign In to Continue</h2>
                      <p className="text-sm text-gray-500 mt-2">
                        <strong>{emailForSignIn}</strong> is already registered.
                        Sign in to continue — your cart items will be saved.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className={labelCls}>Password *</label>
                        <input type="password" className={inputCls} placeholder="Your password"
                          value={signinPwd} onChange={(e) => setSigninPwd(e.target.value)} />
                      </div>
                      {signinErr && (
                        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{signinErr}</p>
                      )}
                      <button onClick={handleExistingSignIn} disabled={submitting || !signinPwd}
                        className="w-full py-3 rounded-xl bg-[#4F705B] text-white font-bold text-sm
                                   hover:bg-[#3a5344] disabled:opacity-50 transition flex items-center justify-center gap-2">
                        {submitting ? <><SpinnerIcon /> Signing in…</> : 'Sign In & Continue →'}
                      </button>
                      <button onClick={() => { setEmailExistsState(false); setEmailForSignIn(''); }}
                        className="w-full text-xs text-gray-400 hover:text-gray-600 transition underline">
                        Use a different email
                      </button>
                    </div>
                  </>

                ) : isAnonymous ? (
                  /* ── ANONYMOUS: registration + shipping combined ─────── */
                  <>
                    <div className="mb-5 pb-4 border-b border-gray-100">
                      <h2 className="text-base font-bold text-gray-800">Your Details</h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Create your account and enter your delivery address.
                        You'll be able to sign in and track orders anytime after checkout.
                      </p>
                    </div>

                    <form onSubmit={submitA(onAnonSubmit)} className="space-y-5">

                      {/* Account */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                          Account
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className={labelCls}>Full Name *</label>
                            <input type="text" className={inputCls} placeholder="John Doe"
                              {...regA('name', { required: 'Full name is required' })} />
                            {errA.name && <p className={errCls}>{errA.name.message}</p>}
                          </div>
                          <div>
                            <label className={labelCls}>Email Address *</label>
                            <input type="email" className={inputCls} placeholder="you@example.com"
                              {...regA('email', { required: 'Email is required' })} />
                            {errA.email && <p className={errCls}>{errA.email.message}</p>}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>Password *</label>
                              <input type="password" className={inputCls} placeholder="••••••••"
                                {...regA('password', {
                                  required: 'Password is required',
                                  minLength: { value: 8, message: 'Min 8 characters' },
                                  validate: {
                                    upper:   (v) => /[A-Z]/.test(v)        || 'Needs an uppercase letter',
                                    number:  (v) => /[0-9]/.test(v)        || 'Needs a number',
                                    special: (v) => /[^A-Za-z0-9]/.test(v) || 'Needs a special character',
                                  },
                                })} />
                              {errA.password && <p className={errCls}>{errA.password.message}</p>}
                            </div>
                            <div>
                              <label className={labelCls}>Confirm Password *</label>
                              <input type="password" className={inputCls} placeholder="••••••••"
                                {...regA('confirmPwd', {
                                  required: 'Please confirm your password',
                                  validate: (v) => v === watchA('password') || 'Passwords do not match',
                                })} />
                              {errA.confirmPwd && <p className={errCls}>{errA.confirmPwd.message}</p>}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400">
                            Min 8 chars · uppercase · number · special character
                          </p>
                        </div>
                      </div>

                      {/* Shipping */}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                          Delivery Address
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className={labelCls}>Phone Number *</label>
                            <input type="tel" className={inputCls} placeholder="08012345678"
                              {...regA('phone', { required: 'Phone number is required' })} />
                            {errA.phone && <p className={errCls}>{errA.phone.message}</p>}
                          </div>
                          <div>
                            <label className={labelCls}>Street Address *</label>
                            <input type="text" className={inputCls} placeholder="12 Lagos Island"
                              {...regA('street', { required: 'Street address is required' })} />
                            {errA.street && <p className={errCls}>{errA.street.message}</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>City *</label>
                              <input type="text" className={inputCls} placeholder="Lagos"
                                {...regA('city', { required: 'City is required' })} />
                              {errA.city && <p className={errCls}>{errA.city.message}</p>}
                            </div>
                            <div>
                              <label className={labelCls}>State *</label>
                              <input type="text" className={inputCls} placeholder="Lagos State"
                                {...regA('state', { required: 'State is required' })} />
                              {errA.state && <p className={errCls}>{errA.state.message}</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>Postal Code *</label>
                              <input type="text" className={inputCls} placeholder="100001"
                                {...regA('postalCode', { required: 'Postal code is required' })} />
                              {errA.postalCode && <p className={errCls}>{errA.postalCode.message}</p>}
                            </div>
                            <div>
                              <label className={labelCls}>Country *</label>
                              <input type="text" className={inputCls} placeholder="Nigeria"
                                {...regA('country', { required: 'Country is required' })} />
                              {errA.country && <p className={errCls}>{errA.country.message}</p>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {serverError && (
                        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
                      )}

                      <button type="submit" disabled={submitting || items.length === 0}
                        className="w-full py-3.5 rounded-xl bg-[#4F705B] text-white font-bold
                                   text-sm hover:bg-[#3a5344] disabled:opacity-50 transition
                                   flex items-center justify-center gap-2">
                        {submitting
                          ? <><SpinnerIcon /> Creating account &amp; preparing order…</>
                          : 'Save & Continue to Payment →'}
                      </button>

                      <p className="text-center text-xs text-gray-400">
                        After checkout you can sign in at any time with your email and password.
                      </p>
                    </form>
                  </>

                ) : (
                  /* ── AUTHENTICATED: shipping only ────────────────────── */
                  <>
                    <div className="mb-5 pb-4 border-b border-gray-100">
                      <h2 className="text-base font-bold text-gray-800">Shipping Information</h2>
                      <p className="text-xs text-gray-400 mt-1">We'll deliver to this address.</p>
                    </div>

                    <form onSubmit={submitS(onShippingSubmit)} className="space-y-4">
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
                        <input type="email" className={inputCls} placeholder="you@example.com"
                          {...regS('email', { required: 'Email is required' })} />
                        {errS.email && <p className={errCls}>{errS.email.message}</p>}
                      </div>
                      <div className="pt-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                          Delivery Address
                        </p>
                      </div>
                      <div>
                        <label className={labelCls}>Street Address *</label>
                        <input type="text" className={inputCls} placeholder="12 Lagos Island"
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
                      {serverError && (
                        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
                      )}
                      <button type="submit" disabled={submitting || items.length === 0}
                        className="w-full py-3.5 rounded-xl bg-[#4F705B] text-white font-bold
                                   text-sm hover:bg-[#3a5344] disabled:opacity-50 transition
                                   flex items-center justify-center gap-2">
                        {submitting ? <><SpinnerIcon /> Preparing order…</> : 'Save & Continue →'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* ══ PAYMENT STEP ════════════════════════════════════════════ */}
            {currentStep === 'payment' && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="mb-5 pb-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-800">Payment</h2>
                  <p className="text-xs text-gray-400 mt-1">Your connection is encrypted and secure.</p>
                </div>

                <div className="mb-5 p-3 bg-[#f0f7f3] rounded-lg border border-[#4F705B]/20
                                flex items-center gap-2 text-sm text-[#4F705B]">
                  <CheckIcon />
                  <span className="font-medium">
                    {isAnonymous ? 'Account created & shipping confirmed' : 'Shipping details confirmed'}
                  </span>
                </div>

                <div className="mb-5 p-4 border border-gray-200 rounded-lg flex items-center gap-3">
                  <div className="p-2 rounded-md bg-[#4F705B] text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Card Payment</p>
                    <p className="text-xs text-gray-400">Debit / Credit card via Flutterwave</p>
                  </div>
                  <span className="ml-auto text-xs bg-[#f0f7f3] text-[#4F705B] border
                                   border-[#4F705B]/20 px-2 py-0.5 rounded-full font-medium">
                    Selected
                  </span>
                </div>

                {verifying && (
                  <div className="mb-4 flex items-center gap-3 text-sm text-gray-600
                                  bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div className="w-5 h-5 border-2 border-[#4F705B] border-t-transparent
                                    rounded-full animate-spin flex-shrink-0" />
                    Verifying your payment — please wait…
                  </div>
                )}

                {paymentError && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200
                                  text-sm text-amber-800">
                    {paymentError}
                  </div>
                )}

                {flwConfig && (
                  <PayButton
                    config={flwConfig}
                    onSuccess={handlePaymentCallback}
                    onClose={handleModalClose}
                    disabled={verifying}
                  />
                )}

                <p className="mt-3 text-center text-xs text-gray-400
                              flex items-center justify-center gap-1">
                  <LockIcon /> 256-bit SSL encryption · Powered by Flutterwave
                </p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Order summary ────────────────────────────────────────── */}
          <div className="w-full lg:w-[340px] flex-shrink-0">
            <OrderSummary items={items} cartTotal={cartTotal} step={currentStep} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CheckoutForm;
