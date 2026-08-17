// pages/SingleProduct.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductContext } from '@/context/ProductContext';
import { useCart }           from '@/context/CartContext';
import { Button }            from '@/components/ui/button';

const SingleProduct: React.FC = () => {
  const { productId }   = useParams<{ productId: string }>();
  const { products }    = useProductContext();
  const { addToCart }   = useCart();
  const navigate        = useNavigate();

  const [adding, setAdding] = useState(false);
  const [added,  setAdded]  = useState(false);
  const [error,  setError]  = useState('');

  const product = products.find((p) => p._id === productId);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500">Product not found.</p>
        <Button onClick={() => navigate('/')}>Back to Products</Button>
      </div>
    );
  }

  const handleAddToCart = async () => {
    if (adding) return;
    setAdding(true);
    setError('');
    try {
      await addToCart({
        productId: product._id,
        name:      product.name,
        imageUrl:  product.imageUrl,
        price:     product.price,
        quantity:  1,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-center md:space-x-8">
        <img
          src={product.imageUrl || 'default-image.jpg'}
          alt={product.name}
          className="w-full md:w-1/2 rounded-lg shadow-lg object-cover"
        />
        <div className="flex flex-col space-y-4 mt-6 md:mt-0">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <h2 className="text-xl text-[#4F705B]">₦{product.price?.toLocaleString()}</h2>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button
            className={`py-2 px-4 rounded-lg transition ${
              added ? 'bg-green-600 text-white' : 'bg-[#4F705B] hover:bg-[#3a5344] text-white'
            }`}
            onClick={handleAddToCart}
            disabled={adding}
          >
            {adding ? 'Adding…' : added ? '✓ Added to cart' : 'Add to Cart'}
          </Button>

          <Button
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
            onClick={() => navigate('/')}
          >
            Back to Products
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SingleProduct;
