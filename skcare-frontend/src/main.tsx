import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { disableReactDevTools } from "@fvilers/disable-react-devtools";
import { ProductProvider } from './context/ProductContext';
import { AuthProvider } from './context/AuthContext';

if (process.env.NODE_ENV === "production") {
  disableReactDevTools();
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
    <ProductProvider>
      <BrowserRouter>
        <Routes>
          <Route path={"/*"} element={<App />} />
        </Routes>
      </BrowserRouter>
    </ProductProvider>
  </AuthProvider>
  </StrictMode>
)
