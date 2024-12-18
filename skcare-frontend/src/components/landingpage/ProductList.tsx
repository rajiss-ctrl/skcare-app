import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BlackStar from '../../assets/svg/star.svg';
import WhiteStar from '../../assets/svg/star-white.svg';
import Cart from '../../assets/svg/cart-white.svg';
import G_SignIn from '../../assets/svg/google-icon.svg';
import CartGreen from '../../assets/svg/cart-green.svg';
import { useProductContext } from '@/context/ProductContext';
import { Button } from '../ui/button';
import { useAuth } from '@/context/AuthContext';

interface Product {
  _id: string;
  name: string;
  imageUrl?: string;
  price?: number;
}

interface ProductListProps {
  filteredProducts?: Product[];
}

const ProductList: React.FC<ProductListProps> = ({ filteredProducts = [] }) => {
  const { user } = useAuth();
  const { cart } = useProductContext();

  const cartItemCount = cart.reduce(
    (count, item) => count + item.cartQuantity,
    0
  );

  const { products, addToCart } = useProductContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Number of products per page
  const [isAtTop, setIsAtTop] = useState(true); // State to track if the user is at the top of the page

  const displayedProducts = filteredProducts.length > 0 ? filteredProducts : products;

  // Pagination Logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = displayedProducts.slice(startIndex, startIndex + itemsPerPage);
  const hasMorePages = startIndex + itemsPerPage < displayedProducts.length;

  const handleAddToCart = (product: Product) => {
    if (!user) {
      setLoginAlertProductId(product._id); // Correct function to set alert for specific product
    } else {
      addToCart(product._id);
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`); // Navigate to the product detail page
  };

  const [loginAlertProductId, setLoginAlertProductId] = useState<string | null>(null);

  const LoginAlert = ({ id }: { id: string }) => {
    if (loginAlertProductId !== id) return null; // Don't show alert unless it's the product clicked

    return (
      <div className="absolute top-0 left-0 z-50 flex items-center justify-center gap-2 h-[50px] text-[#7a7c80] text-xs bg-white shadow px-2 py-1 rounded-[10px]">
        <Button
          onClick={() => setLoginAlertProductId(null)} // Close the alert when clicking 'X'
          className="outline-none border-none shadow-none text-xs p-0 m-0"
        >
          X
        </Button>
        <div className="h-[45px] w-[1px] bg-slate-400"></div>
        <Button className="flex items-center outline-none border-none shadow-none text-xs p-0 m-0">
          <span>Sign In</span>
          <img src={G_SignIn} alt="sign in with google" className="w-3" />
        </Button>
      </div>
    );
  };

  // Track scroll position and update state accordingly
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY === 0) {
        setIsAtTop(true);
      } else {
        setIsAtTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (displayedProducts.length === 0) {
    return <div>No products found</div>;
  }

  return (
    <div className="p-4 md:p-8 relative">
      <div
        className={`${!user ? 'hidden' : 'flex'}  items-center justify-center fixed right-2 top-3 z-50 transition-opacity ${
          isAtTop ? 'opacity-0 animate-ping' : 'opacity-100'
        }`}
      >
        <Link to="/cartpreview" className="relative flex items-center">
          {cartItemCount > 0 && (
            <div className="absolute top-[-3px] right-[-5px] bg-red-500 text-white text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">
              {cartItemCount}
            </div>
          )}
          <img
            src={location.pathname === '/cart-preview-page' ? CartGreen : Cart}
            alt="Cart"
            className="w-8"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedProducts.map((product) => {
          const image = product.imageUrl || 'default-image.jpg';
          const price = product.price || 0;

          return (
            <div
              key={product._id}
              className="bg-white shadow-lg rounded-xl overflow-hidden transition-transform transform hover:scale-105"
            >
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-xl">
                <img src={image} alt={product.name} className="h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 truncate">{product.name}</h3>
                  <h3 className="text-xl font-bold text-[#4F705B]">₦{price}</h3>
                </div>
                <div className="flex space-x-1 mb-4">
                  <img src={BlackStar} alt="black star" />
                  <img src={BlackStar} alt="black star" />
                  <img src={BlackStar} alt="black star" />
                  <img src={BlackStar} alt="black star" />
                  <img src={WhiteStar} alt="white star" />
                </div>
                <div className="flex space-x-2 relative">
                  <LoginAlert id={product._id} />
                  <Button
                    className="flex items-center text-xs justify-center bg-[#4F705B] text-white py-2 rounded-lg hover:bg-[#293f31] transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                  >
                    <img src={Cart} alt="cart icon" className="h-5 w-5 mr-2" />
                    <span>Add To Cart</span>
                  </Button>
                  <Button
                    className="flex items-center justify-center text-xs text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition"
                    onClick={() => handleProductClick(product._id)} // Navigate to single product page
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
