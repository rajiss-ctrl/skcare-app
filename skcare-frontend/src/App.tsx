// App.tsx
import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout         from './outlet/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// ─── Eager imports ────────────────────────────────────────────────────────────
// LandingPage loads immediately — it is the first thing every visitor sees.
import LandingPage from './pages/LandingPage';

// ─── Lazy imports (route-level code splitting) ────────────────────────────────
// Vite creates a separate JS chunk for each of these.
// The chunk downloads only when the user navigates to that route.
const AllProducts     = lazy(() => import('./pages/AllProducts'));
const CartPreviewPage = lazy(() => import('./pages/CartPreviewPage'));
const SingleProduct   = lazy(() => import('./pages/SingleProduct'));
const CheckoutForm    = lazy(() => import('./pages/Checkout'));
const OrdersPage      = lazy(() => import('./pages/Orders'));

// Admin is the heaviest chunk — regular users never download it.
const Admin = lazy(() => import('./admin/pages/Admin'));

// ─── Inline loading fallback ──────────────────────────────────────────────────
// A subtle spinner shown while a route chunk downloads.
// NOT shown on the landing page (it is eager, so no fallback needed there).
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-7 h-7 border-2 border-[#4F705B] border-t-transparent
                    rounded-full animate-spin" />
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>

        {/* Landing page — eager, renders with zero delay */}
        <Route index element={<LandingPage />} />

        {/* Public lazy routes — each wrapped in its own Suspense so only
            the navigated page shows the spinner, not the whole app */}
        <Route path="/all-products" element={
          <Suspense fallback={<RouteLoader />}>
            <AllProducts />
          </Suspense>
        } />

        <Route path="/product/:productId" element={
          <Suspense fallback={<RouteLoader />}>
            <SingleProduct />
          </Suspense>
        } />

        <Route path="/cartpreview" element={
          <Suspense fallback={<RouteLoader />}>
            <CartPreviewPage />
          </Suspense>
        } />

        <Route path="/checkout-form" element={
          <Suspense fallback={<RouteLoader />}>
            <CheckoutForm />
          </Suspense>
        } />

        {/* Protected — authenticated users only */}
        <Route path="/orders" element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoader />}>
              <OrdersPage />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Protected — staff role or higher */}
        <Route path="/admin" element={
          <ProtectedRoute role="staff">
            <Suspense fallback={<RouteLoader />}>
              <Admin />
            </Suspense>
          </ProtectedRoute>
        } />

      </Route>
    </Routes>
  );
}

export default App;
