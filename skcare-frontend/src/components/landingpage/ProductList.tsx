// components/landingpage/ProductList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BlackStar  from '../../assets/svg/star.svg';
import WhiteStar  from '../../assets/svg/star-white.svg';
import Cart       from '../../assets/svg/cart-white.svg';
import CartGreen  from '../../assets/svg/cart-green.svg';
import { useProductContext } from '@/context/ProductContext';
import { Button }            from '../ui/button';
import { useAuth }           from '@/context/AuthContext';
import { useCart }           from '@/context/CartContext';

interface Product {
  _id:      string;
  name:     string;
  imageUrl?: string;
  price?:   number;
}

interface ProductListProps {
  filteredProducts?: Product[];
}

const ProductList: React.FC<ProductListProps> = ({ filteredProducts = [] }) => {
  const { user, guestSignIn }                 = useAuth();
  const { products, isLoading, fetchError }   = useProductContext();
  const { addToCart, cartItemCount }    = useCart();

  const navigate = useNavigate();
  const location = useLocation();

  const [currentPage,  setCurrentPage]  = useState(1);
  const [addingId,     setAddingId]     = useState<string | null>(null);
  const [isAtTop,      setIsAtTop]      = useState(true);

  const itemsPerPage       = 8;
  const displayedProducts  = filteredProducts.length > 0 ? filteredProducts : products;
  const startIndex         = (currentPage - 1) * itemsPerPage;
  const paginatedProducts  = displayedProducts.slice(startIndex, startIndex + itemsPerPage);
  const hasMorePages       = startIndex + itemsPerPage < displayedProducts.length;

  const handleAddToCart = async (product: Product) => {
    setAddingId(product._id);
    try {
      // If no session exists, silently create a guest session first
      if (!user) {
        await guestSignIn();
      }
      await addToCart({
        productId: product._id,
        name:      product.name,
        imageUrl:  product.imageUrl || '',
        price:     product.price    || 0,
        quantity:  1,
      });
    } catch (err) {
      console.error('Add to cart failed:', err);
    } finally {
      setAddingId(null);
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsAtTop(window.scrollY === 0);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 text-sm mb-2">Failed to load products</p>
        <p className="text-gray-400 text-xs">{fetchError}</p>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (displayedProducts.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        No products found. Add some products from the admin panel.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 relative">

      {/* Floating cart icon (visible when scrolled + has items) */}
      <div
        className={`${cartItemCount === 0 ? 'hidden' : 'flex'} items-center justify-center fixed right-2 top-3 z-40 transition-opacity ${
          isAtTop ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <Link to="/cartpreview" className="relative flex items-center">
          {cartItemCount > 0 && (
            <div className="absolute top-[-3px] right-[-5px] bg-red-500 text-white text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">
              {cartItemCount}
            </div>
          )}
          <img
            src={location.pathname === '/cartpreview' ? CartGreen : Cart}
            alt="Cart"
            className="w-8"
          />
        </Link>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedProducts.map((product) => {
          const image = product.imageUrl || 'default-image.jpg';
          const price = product.price    || 0;

          return (
            <div
              key={product._id}
              className="bg-white shadow-lg rounded-xl overflow-hidden transition-transform transform hover:scale-105"
            >
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-t-xl">
                <img src={image} alt={product.name} className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-semibold text-gray-800 truncate">{product.name}</h3>
                  <h3 className="text-base font-bold text-[#4F705B]">₦{price.toLocaleString()}</h3>
                </div>
                <div className="flex space-x-1 mb-4">
                  {[...Array(4)].map((_, i) => <img key={i} src={BlackStar} alt="★" />)}
                  <img src={WhiteStar} alt="☆" />
                </div>
                <div className="flex space-x-2">
                  <Button
                    className="flex items-center text-xs justify-center bg-[#4F705B] text-white py-2 rounded-lg hover:bg-[#293f31] transition"
                    disabled={addingId === product._id}
                    onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                  >
                    <img src={Cart} alt="" className="h-4 w-4 mr-1" aria-hidden="true" />
                    {addingId === product._id ? 'Adding…' : 'Add To Cart'}
                  </Button>
                  <Button
                    className="flex items-center justify-center text-xs text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
                    onClick={() => navigate(`/product/${product._id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMorePages && (
        <div className="flex justify-center mt-8">
          <button
            className="bg-[#4F705B] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#71a584] text-xs transition"
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            View More Products
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;
