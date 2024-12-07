import { Routes, Route } from "react-router-dom";
import { Suspense } from "react";
// import { lazy, Suspense } from "react";
import LandingPage from './pages/LandingPage';
import Layout from "./outlet/Layout";
import Admin from "./admin/pages/Admin";
import SingleProduct from "./pages/SingleProduct";
import CartPreviewPage from "./pages/CartPreviewPage";
import CheckoutForm from "./pages/Checkout";
// import HomePage from "./pages/HomePage";

// import SigninSignup from "./pages/signin-signup/SigninSignup";

function App() {
  return (
    <>
      <Suspense fallback={<div className="">Loading....</div>}>
        <Routes>
          <Route path={"/"} element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="/cartpreview" element={<CartPreviewPage />} />
            <Route path="/product/:productId" element={<SingleProduct />} />
            <Route path={"/checkout-form"} element={<CheckoutForm />} />
            <Route path={"/admin"} element={<Admin />} />
          </Route>
          {/* <Route path={"/"} element={<Layout />}>
            <Route index element={<HomePage />} />
          </Route> */}
          {/* Uncomment and fix the following when you add the Error component */}
          {/* <Route path={"*"} element={<Error />} /> */}
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
