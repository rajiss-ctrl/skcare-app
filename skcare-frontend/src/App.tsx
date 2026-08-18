// App.tsx
import { Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
import LandingPage     from './pages/LandingPage';
import Layout          from './outlet/Layout';
import Admin           from './admin/pages/Admin';
import SingleProduct   from './pages/SingleProduct';
import CartPreviewPage from './pages/CartPreviewPage';
import CheckoutForm    from './pages/Checkout';
import AllProducts     from './pages/AllProducts';
import OrdersPage      from './pages/Orders';
import ProtectedRoute  from './components/ProtectedRoute';

function App() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">
        Loading…
      </div>
    }>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index                      element={<LandingPage />} />
          <Route path="/all-products"       element={<AllProducts />} />
          <Route path="/cartpreview"        element={<CartPreviewPage />} />
          <Route path="/product/:productId" element={<SingleProduct />} />
          <Route path="/checkout-form"      element={<CheckoutForm />} />
          <Route path="/orders"             element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          } />

          {/* Admin — requires staff role or higher */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="staff">
                <Admin />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
