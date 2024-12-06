import React, { useState } from 'react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import Trash from '../assets/svg/trash-icon.svg';
import CCApple from '../assets/svg/la_cc-apple-pay.svg';
import CreditCard from '../assets/svg/credit-card.svg';
import Send from '../assets/svg/send.svg';
import Minus from '../assets/svg/minus.svg';
import Plus from '../assets/svg/plus.svg';
import { useNavigate } from 'react-router-dom';
import { useProductContext } from '../context/ProductContext';

type PaymentMethod = 'bank' | 'credit-card' | 'apple-pay' | null;

const CartPreviewPage: React.FC = () => {
  const { cart, totalPrice, removeFromCart, updateQuantity } = useProductContext();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [checkAll, setCheckAll] = useState(false);
  const [error, setError] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0); // Discount state

  const navigate = useNavigate();

  const handleRemoveFromCart = (productId: string) => {
    removeFromCart(productId);
  };

  const handleCheckItem = (id: string) => {
    if (checkedItems.includes(id)) {
      setCheckedItems(checkedItems.filter((itemId) => itemId !== id));
    } else {
      setCheckedItems([...checkedItems, id]);
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

  // Calculate grand total
  const grandTotal = totalPrice - discount;

  return (
    <section className='pb-10'>
      <div className="hidden md:block text-center py-2 bg-[#4F705B] text-white">
        <p>Free deliveries on all orders within Nigeria</p>
      </div>
      <NavBar />
      <h1 className='text-center text-2xl font-semibold py-8'>Cart</h1>
      <div className="flex flex-col lg:flex-row justify-between items-start">
        <div className="w-full lg:w-3/5 py-10 px-3 lg:px-4 ">
          {cart.length === 0 ? (
            <h3>Your cart is empty</h3>
          ) : (
            <table className="w-full border border-gray-300 rounded-t-[10px]">
              <thead>
                <tr className='border-b border-gray-300  '>
                  <th className='flex items-center gap-2 pl-14 py-4 '>
                    <input
                      type="checkbox"
                      checked={checkAll}
                      onChange={handleCheckAll}
                      className="w-5 h-5"
                    />
                    <span className='text-xs font-medium'>Product</span>
                  </th>
                  <th className='text-xs font-medium'>Quantity</th>
                  <th className='text-xs font-medium'>Price</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item._id} className=' border-b border-[#0000000D]'>
                    <td className='flex gap-2 py-4 pl-14'>
                      <input
                        type="checkbox"
                        checked={checkedItems.includes(item._id)}
                        onChange={() => handleCheckItem(item._id)}
                        className="w-5 h-5"
                      />
                      <div className="flex gap-2">
                        <img src={item.imageUrl} alt={item.name} className='w-[60px] rounded-[5px]' />
                        <div className="flex flex-col">
                          <span className='text-[#000000B2] text-sm lg:text-[16px] bold'>{item.name}</span>
                          <span className='text-[#000000B2] text-sm lg:text-[16px] font-normal'>Size</span>
                        </div>
                      </div>
                    </td>
                    <td className=''>
                      <div className="flex justify-between items-center p-2 border border-[#0000000D] rounded-[5px]">
                        <button onClick={() => updateQuantity(item._id, item.cartQuantity - 1)} className='text-[16px] font-bold'>-</button>
                        <span>{item.cartQuantity}</span>
                        <button onClick={() => updateQuantity(item._id, item.cartQuantity + 1)} className='text-[16px] font-bold'>+</button>
                      </div>
                      <button onClick={() => handleRemoveFromCart(item._id)} className="text-[#000000] mt-1 flex items-center justify-center w-full gap-[2px]">
                        <img src={Trash} alt="trash icon" className='w-[16px]' />
                        <p className='text-xs'>Delete</p>
                      </button>
                    </td>
                    <td className='flex items-center justify-center'>
                      ₦{item.price * item.cartQuantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="w-full lg:w-[35%] pl-3 pr-3 lg:pr-8">
          <div className=" shadow-sm border border-[#0000000D] rounded-[10px]">
            <div className="py-2 flex justify-between px-4 border-b border-[#0000000D]">
              <span className="text-lg">Sub-total</span>
              <span className="text-lg font-semibold ">₦{totalPrice}</span>
            </div>
            <div className="py-2 flex justify-between px-4 border-b border-[#0000000D]">
              <span className="text-lg">Discount</span>
              <span className="text-lg font-semibold ">
                ₦{discount > 0 ? discount : '0000'}
              </span>
            </div>
            <div className="py-2 flex justify-between px-4 border-b border-[#0000000D]">
              <span className="text-lg">Grand total</span>
              <span className="text-lg font-semibold ">
                ₦{grandTotal > 0 ? grandTotal : '0000'}
              </span>
            </div>
            <div className="pt-[80px] pb-2 flex justify-center items-center border-b border-[#0000000D]">
              <span className="text-lg">Mode of payment</span>
            </div>
            <div className="py-2 flex hover:bg-[#E4E8E74D] justify-between px-4 hover:border-t hover:boder-[2px solid] cursor-pointer border-b border-[#0000000D]">
              <span className="text-lg">Bank Transfer</span>
              <img src={Send} alt="send icon" />
            </div>
            <div className="py-2 flex hover:bg-[#E4E8E74D] justify-between px-4 hover:border-t hover:boder-[2px solid] cursor-pointer border-b border-[#0000000D]">
              <span className="text-lg">Credit Card</span>
              <img src={CreditCard} alt="credit card icon" />
            </div>
            <div className="py-2 flex hover:bg-[#E4E8E74D] justify-between px-4 hover:border-t hover:boder-[2px solid] cursor-pointer border-b border-[#0000000D]">
              <span className="text-lg">Apple Pay</span>
              <img src={CCApple} alt="apple pay icon" />
            </div>
            {error && <div className="text-sm py-2">{error}</div>}
            <div className="py-6 px-10">
              <button
                className="w-full py-2 rounded-[8px] bg-[#4F705B] text-white font-bold"
                onClick={handleCheckout}
              >
                Proceed to checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CartPreviewPage;
