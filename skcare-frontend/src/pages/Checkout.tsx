import React from 'react';
import NavBar from '../components/NavBar';
import Leave from '../assets/svg/leave.svg';
import Map from '../assets/svg/map.svg';
import CreditCard from '../assets/svg/credit-card.svg';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { FlutterWaveButton, closePaymentModal } from 'flutterwave-react-v3';


interface FormData {
  phoneNumber: string;
  country: string;
  houseAddress: string;
  postalCode: string;
  city: string;
  region: string;
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}

const CheckoutForm: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();




  const onSubmit: SubmitHandler<FormData> = (data) => {
    console.log(data);
    navigate('/order-confirmation');
  };

 

   function Flutter() {
     const config = {
      public_key: 'FLWPUBK_TEST-6cbe1fbc89c44ff6f9e9a61a16b599e3-X',
      tx_ref: Date.now(),
      amount: 100,
      currency: 'NGN',
      payment_options: 'card,mobilemoney,ussd',
      customer: {
        email: 'omosanjos77@gmail.com',
        phone_number: '07038699659',
        name: 'Raji',
      },
      customizations: {
        title: 'SKCare',
        description: 'Payment for items in cart',
        logo: 'https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-online-shop-log.jpg',
      },
    };
  
    const fwConfig = {
      ...config,
      text: 'Pay with Flutterwave!',
      callback: (response) => {
         console.log(response);
        closePaymentModal() // this will close the modal programmatically
      },
      onClose: () => {},
    };
  
    return (
      <div className="">
        <FlutterWaveButton {...fwConfig} />
      </div>
    );
  }


  return (
    <section className="relative min-h-screen ">
     <p className='bg-[#4F705B] w-full text-center text-white text-xm md:text-sm py-2 leading-[21.6px] font-medium font-[Satoshi]'>
          Free deliveries on all orders within Nigeria
      </p>
      <NavBar />
      <div className="relative w-full  p-2  lg:py-32 lg:pr-8">
        <img
          className="absolute bottom-0 right-0 w-24 md:w-32"
          src={Leave}
          alt="Background decoration"
        />
        <h1 className="text-center text-2xl font-bold mb-6">Checkout</h1>
        <div className="flex flex-col md:flex-row md:space-x-24">
          <div className="w-full md:w-[45%] border rounded-[8px] p-6 mb-6 md:mb-0">
            <div className="flex items-center space-x-2 border-b pb-4 mb-4">
              <img src={Map} alt="Billing Address" className="w-4 h-4" />
              <h4 className="font-bold text-sm">Billing Address</h4>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full border rounded-md p-3 mb-4"
                {...register('phoneNumber', {
                  required: 'Phone Number is required',
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'Phone Number must be 10 digits',
                  },
                })}
              />
             

              <input
                type="text"
                placeholder="Country"
                className="w-full border rounded-md p-3 mb-4"
                {...register('country', { required: 'Country is required' })}
              />
              {errors.country && (
                <p className="text-red-500 text-xs">{errors.country.message}</p>
              )}

              <input
                type="text"
                placeholder="House Address"
                className="w-full border rounded-md p-3 mb-4"
                {...register('houseAddress', { required: 'House Address is required' })}
              />
              {errors.houseAddress && (
                <p className="text-red-500 text-xs">{errors.houseAddress.message}</p>
              )}

              <input
                type="text"
                placeholder="Postal Code"
                className="w-full border rounded-md p-3 mb-4"
                {...register('postalCode', {
                  required: 'Postal Code is required',
                  pattern: {
                    value: /^\d{5}$/,
                    message: 'Postal Code must be 5 digits',
                  },
                })}
              />
              {errors.postalCode && (
                <p className="text-red-500 text-xs">{errors.postalCode.message}</p>
              )}

              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="City"
                  className="w-full border rounded-md p-3 mb-4"
                  {...register('city', { required: 'City is required' })}
                />
                <input
                  type="text"
                  placeholder="Region"
                  className="w-full border rounded-md p-3 mb-4"
                  {...register('region', { required: 'Region is required' })}
                />
              </div>
              {(errors.city || errors.region) && (
                <p className="text-red-500 text-xs">City and Region are required</p>
              )}

              <div className="flex items-center space-x-2">
                <input type="checkbox" className="w-4 h-4" />
                <p className="text-sm">
                  Enter these details automatically for future transactions
                </p>
              </div>
            </form>
          </div>
      
          {/* Flutterwave Payment Form */}
          <div className="w-full lg:w-[35%] border rounded-[8px] p-6">
            <div className="flex items-center space-x-2 border-b pb-4 mb-4">
              <img src={CreditCard} alt="Credit Card Details" className="w-4 h-4" />
              <h4 className="font-bold text-sm">Credit Card Details</h4>
            </div>
            <input
                type="email"
                placeholder="Email Add"
                className="w-full border rounded-md p-3 mb-4"
                {...register('phoneNumber', {
                  required: 'Phone Number is required',
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'Phone Number must be 10 digits',
                  },
                })}
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-xs">{errors.phoneNumber.message}</p>
              )}
              <input
                type="phone"
                placeholder="Phone Number"
                className="w-full border rounded-md p-3 mb-4"
                {...register('phoneNumber', {
                  required: 'Phone Number is required',
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'Phone Number must be 10 digits',
                  },
                })}
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-xs">{errors.phoneNumber.message}</p>
              )}
              <input
                type="number"
                placeholder="Amount"
                className="w-full border rounded-md p-3 mb-4"
                {...register('phoneNumber', {
                  required: 'Phone Number is required',
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'Phone Number must be 10 digits',
                  },
                })}
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-xs">{errors.phoneNumber.message}</p>
              )}
            <button
              className="w-full py-3 text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              <Flutter/>
            </button>
          </div>
        </div>
      </div>
    
    </section>
  );
};

export default CheckoutForm;
