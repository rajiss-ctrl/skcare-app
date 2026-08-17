// components/landingpage/ProductList.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BlackStar from '../../assets/svg/star.svg';
import WhiteStar from '../../assets/svg/star-white.svg';
import Cart      from '../../assets/svg/cart-white.svg';
import CartGreen from '../../assets/svg/cart-green.svg';
import { useProductContext } from '@/context/ProductContext';
import { useCart }           from '@/context/CartContext';

interface Product {
  _id:       string;
  name:      string;
  imageUrl?: string;
  price?:    number;
}

interface ProductListProps {
  filteredProducts?: Product[];
}

const ProductList: React.FC<ProductListProps> = ({ filteredProducts }) => {
  const { products, isLoading, fetchError } = useProductContext();
  const { addToCart, cartItemCount }        = useCart();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [currentPage, setCurrentPage] = useState(1);
  const [addingId,    setAddingId]    = useState<string | null>(null);
  const [addedId,     setAddedId]     = useState<string | null>(null);
  const [isAtTop,     setIsAtTop]     = useState(true);

  const itemsPerPage = 8;
  const displayed    = filteredProducts ?? products;
  const startIndex   = (currentPage - 1) * itemsPerPage;
  const paginated    = displayed.slice(startIndex, startIndex + itemsPerPage);
  const hasMore      = startIndex + itemsPerPage < displayed.length;

  // Add to cart — works for both authenticated and anonymous users.
  // Anonymous: saved to sessionStorage instantly (no network call).
  // Authenticated: saved to DB via API.
  const handleAddToCart = async (product: Product) => {
    if (addingId === product._id) return; // prevent double-click
    setAddingId(product._id);
    try {
      await addToCart({
        productId: product._id,
        name:      product.name,
        imageUrl:  product.imageUrl || '',
        price:     product.price    || 0,
        quantity:  1,
      });
      setAddedId(product._id);
      setTimeout(() => setAddedId(null), 1500);
    } catch (err) {
      console.error('Add to cart failed:', err);
    } finally {
      setAddingId(null);
    }
  };

  useEffect(() => {
    const onScroll = () => setIsAtTop(window.scrollY === 0);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full px-3 sm:px-4 md:px-8 lg:px-16 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-gray-100 animate-pulse">
              <div className="h-44 md:h-52 bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-8 bg-gray-200 rounded mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="w-full px-4 py-12 text-center">
        <p className="text-red-500 text-sm font-medium">Failed to load products</p>
        <p className="text-gray-400 text-xs mt-1">{fetchError}</p>
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <div className="w-full px-4 py-12 text-center text-gray-400 text-sm">
        No products found.
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-3 sm:px-4 md:px-8 lg:px-16 py-6 relative overflow-x-hidden">

      {/* Floating cart badge */}
      {cartItemCount > 0 && (
        <div className={`fixed right-3 top-4 z-40 transition-all duration-300 ${
          isAtTop ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          <Link to="/cartpreview" className="relative flex items-center" aria-label="View cart">
            <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px]
                            font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </div>
            <img
              src={location.pathname === '/cartpreview' ? CartGreen : Cart}
              alt="Cart"
              className="w-8 h-8 drop-shadow-md"
            />
          </Link>
        </div>
      )}

      {/* Section heading */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900">All Products</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {displayed.length} product{displayed.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 lg:gap-6">
        {paginated.map((product) => {
          const image   = product.imageUrl || '/placeholder.jpg';
          const price   = product.price    || 0;
          const loading = addingId === product._id;
          const added   = addedId  === product._id;

          return (
            <article
              key={product._id}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm
                         hover:shadow-md transition-shadow duration-200 flex flex-col"
            >
              {/* Image */}
              <div
                className="relative w-full overflow-hidden bg-gray-50 cursor-pointer"
                style={{ paddingBottom: '100%' }}
                onClick={() => navigate(`/product/${product._id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/product/${product._id}`)}
                aria-label={`View ${product.name}`}
              >
                <img
                  src={image}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover
                             group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>

              {/* Details */}
              <div className="flex flex-col flex-1 p-3 md:p-4">
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <h3 className="text-[13px] md:text-sm font-semibold text-gray-800
                                 line-clamp-2 leading-snug flex-1" title={product.name}>
                    {product.name}
                  </h3>
                  <span className="text-[13px] md:text-sm font-bold text-[#4F705B]
                                   whitespace-nowrap ml-1 flex-shrink-0">
                    ₦{price.toLocaleString()}
                  </span>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-3">
                  {[...Array(4)].map((_, i) => (
                    <img key={i} src={BlackStar} alt="" aria-hidden="true" className="w-3 h-3" />
                  ))}
                  <img src={WhiteStar} alt="" aria-hidden="true" className="w-3 h-3" />
                </div>

                {/* Buttons */}
                <div className="mt-auto flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                    disabled={loading}
                    aria-label={`Add ${product.name} to cart`}
                    className={`flex-1 flex items-center justify-center gap-1.5
                               text-white text-[11px] md:text-xs font-semibold
                               py-2 md:py-2.5 px-2 rounded-lg transition-all active:scale-95 ${
                      added   ? 'bg-green-600' :
                      loading ? 'bg-[#3a5344] opacity-60' :
                                'bg-[#4F705B] hover:bg-[#3a5344]'
                    }`}
                  >
                    {added ? (
                      '✓ Added'
                    ) : loading ? (
                      <span className="w-3 h-3 border border-white border-t-transparent
                                       rounded-full animate-spin" />
                    ) : (
                      <>
                        <img src={Cart} alt="" className="w-3.5 h-3.5" aria-hidden="true" />
                        Add to Cart
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => navigate(`/product/${product._id}`)}
                    aria-label={`View details of ${product.name}`}
                    className="flex-1 flex items-center justify-center
                               border border-gray-200 hover:border-gray-300
                               hover:bg-gray-50 active:scale-95 text-gray-700
                               text-[11px] md:text-xs font-medium py-2 md:py-2.5 px-2
                               rounded-lg transition-all"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            className="bg-[#4F705B] hover:bg-[#3a5344] active:scale-95
                       text-white text-sm font-semibold px-8 py-3 rounded-xl transition-all"
          >
            View More Products
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;
