import React, { useState } from 'react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import Trash from '../assets/svg/trash-icon.svg';
import Minus from '../assets/svg/minus.svg';
import Plus from '../assets/svg/plus.svg';
// import Transfer from '../assets/transfer.svg';
// import CreditCard from '../assets/credit-card.svg';
// import ApplePay from '../../assets/svg/apple-pay.svg';
import { useNavigate } from 'react-router-dom';
import { useProductContext } from '../context/ProductContext';

// Define types for individual CartItems
interface CartItem {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl:string;
}

type PaymentMethod = 'bank' | 'credit-card' | 'apple-pay' | null;

const CartPreviewPage: React.FC = () => {
  const { cart, totalPrice, removeFromCart, addToCart } = useProductContext();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [checkAll, setCheckAll] = useState(false);
  const [error, setError] = useState<string>('');

  const navigate = useNavigate();

  const handleRemoveFromCart = (productId: string) => {
    removeFromCart(productId);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity > 0) {
      addToCart(productId);
    }
  };

  const handleCheckAll = () => {
    setCheckAll(!checkAll);
    if (!checkAll) {
      setCheckedItems(cart.map((item) => item._id));
    } else {
      setCheckedItems([]);
    }
  };

  const handleCheckItem = (id: string) => {
    if (checkedItems.includes(id)) {
      setCheckedItems(checkedItems.filter((itemId) => itemId !== id));
    } else {
      setCheckedItems([...checkedItems, id]);
    }
  };

  const handleCheckout = () => {
    if (!selectedPayment) {
      setError('Please select a payment method before proceeding to checkout.');
      return;
    }
    if (cart.length === 0) {
      setError('Your cart is empty. Please add items to your cart before proceeding to checkout.');
      return;
    }
    navigate('/checkout-form');
  };

  return (
    <section className='container mx-auto px-4 py-8'>
      <div className="hidden md:block text-center py-2">
        <p>Free deliveries on all orders within Nigeria</p>
      </div>
      <NavBar />
      <h1 className='text-center text-2xl font-semibold py-8'>Cart</h1>
      <div className="flex justify-between items-start">
        <div className="w-3/5 py-10">
          {cart.length === 0 ? (
            <h3>Your cart is empty</h3>
          ) : (
            <table className="w-full border border-gray-300 rounded-lg">
              <thead>
                <tr>
                  <th className='flex items-center space-x-2'>
                    <input
                      type="checkbox"
                      checked={checkAll}
                      onChange={handleCheckAll}
                      className="w-5 h-5"
                    />
                    <span>Product</span>
                  </th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item: CartItem) => {
                  const image = item?.imageUrl;
                  return (
                    <tr key={item._id} className="border-t border-gray-200">
                      <td className='flex space-x-2 items-center'>
                        <input
                          type="checkbox"
                          checked={checkedItems.includes(item._id)}
                          onChange={() => handleCheckItem(item._id)}
                          className="w-5 h-5"
                        />
                        <img src={`/api/images/${image}`} alt="" className="w-16 h-16" />
                        <div>
                          <h4 className="text-lg font-semibold text-gray-700">{item.name}</h4>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-between border border-gray-200 rounded-lg p-2 w-24">
                          <img onClick={() => handleUpdateQuantity(item._id, item.quantity - 1)} src={Minus} alt="" className="cursor-pointer" />
                          <span>{item.quantity}</span>
                          <img onClick={() => handleUpdateQuantity(item._id, item.quantity + 1)} src={Plus} alt="" className="cursor-pointer" />
                        </div>
                        <button
                          className='flex items-center justify-center gap-2 mt-2 text-sm text-red-600'
                          onClick={() => handleRemoveFromCart(item._id)}
                        >
                          <img src={Trash} alt="trash icon" className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </td>
                      <td className='text-lg font-semibold text-gray-900'>₦{item.price}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="w-2/5 p-10 bg-gray-100 rounded-lg">
          <div>
            <h4 className="text-lg font-semibold text-gray-700">Summary</h4>
            <div className="py-4 flex justify-between">
              <span className="text-lg">Total</span>
              <span className="text-lg font-semibold text-gray-900">₦{totalPrice}</span>
            </div>
            <div className="flex gap-4">
              <button
                className="w-full py-2 bg-green-500 text-white rounded-lg"
                onClick={() => setSelectedPayment('bank')}
              >
                Bank Transfer
              </button>
              <button
                className="w-full py-2 bg-blue-500 text-white rounded-lg"
                onClick={() => setSelectedPayment('credit-card')}
              >
                Credit Card
              </button>
            </div>
            <div className="py-2 flex justify-between">
              <button
                className="w-full py-2 bg-yellow-500 text-white rounded-lg"
                onClick={() => setSelectedPayment('apple-pay')}
              >
                Apple Pay
              </button>
            </div>
            {error && <div className="text-red-500 text-sm py-2">{error}</div>}
            <div className="pt-4">
              <button
                className="w-full py-2 bg-blue-500 text-white rounded-lg"
                onClick={handleCheckout}
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </section>
  );
};

export default CartPreviewPage;
