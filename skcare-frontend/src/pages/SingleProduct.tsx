import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductContext } from '@/context/ProductContext';
import { Button } from '@/components/ui/button';


const SingleProduct: React.FC = () => {
  const { productId } = useParams<{ productId: string }>(); // Get the productId from the URL
  const { products, addToCart } = useProductContext();
  const navigate = useNavigate();

  // Find the product by id
  const product = products.find((prod) => prod._id === productId);

  if (!product) {
    return <div>Product not found.</div>;
  }

  const handleAddToCart = () => {
    addToCart(product._id);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-center md:space-x-8">
        <img
          src={product.imageUrl || 'default-image.jpg'}
          alt={product.name}
          className="w-full md:w-1/2 rounded-lg shadow-lg"
        />
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <h2 className="text-xl text-[#4F705B]">₦{product.price}</h2>
          <Button
            className="bg-[#4F705B] text-white py-2 px-4 rounded-lg hover:bg-[#293f31] transition"
            onClick={handleAddToCart}
          >
            Add to Cart
          </Button>
          <Button
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
            onClick={() => navigate('/')} // Navigate back to the main page
          >
            Back to Products
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SingleProduct;
