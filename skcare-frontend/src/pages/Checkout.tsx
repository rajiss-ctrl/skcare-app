import React, { useState } from 'react';
import NavBar from '../components/NavBar';
import Leave from '../assets/svg/leave.svg';
import Map from '../assets/svg/map.svg';
import CreditCard from '../assets/svg/credit-card.svg';
import { useForm, SubmitHandler } from 'react-hook-form';
import { FlutterWaveButton, closePaymentModal } from 'flutterwave-react-v3';
import { useProductContext } from '@/context/ProductContext';
// import AuthButton from '@/components/AuthButton';

interface FormData {
  phoneNumber: string;
  country: string;
  houseAddress: string;
  postalCode: string;
  city: string;
  region: string;
  email: string;
  amount: string;
}


const CheckoutForm: React.FC = () => {
  const { totalAmount } = useProductContext();
  
  const [formData, setFormData] = useState<FormData | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit: SubmitHandler<FormData> = (data) => {
    setFormData(data); // Save the form data
  };

  const handleSuccess = (message: string) => {
    alert(message);
    console.log('Form and user data successfully submitted.');
  };

  const handleError = (error: string) => {
    alert(error);
    console.error('Error during submission:', error);
  };
 
const TEST_FLW_PUBLIC_KEY = import.meta.env.VITE_TEST_FLW_PUBLIC_KEY

   const config = {
    public_key: `${TEST_FLW_PUBLIC_KEY}`,
    tx_ref: Date.now(),
    amount: `${totalAmount}`,
    currency: 'NGN',
    payment_options: 'card,mobilemoney,ussd',
    customer: {
      email: 'user@gmail.com',
      phone_number: '070********',
      name: 'john doe',
    },
    customizations: {
      title: 'My store',
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

//   return (
//     <div className="App">
//      <h1>Hello Test user</h1>
//       <FlutterWaveButton {...fwConfig} />
//     </div>
//   );
// }

  return (
    <section className="relative min-h-screen">
      <p className="bg-[#4F705B] w-full text-center text-white text-sm py-2 font-medium">
        Free deliveries on all orders within Nigeria
      </p>
      <NavBar />
      <div className="relative w-full p-4 lg:py-32 lg:pr-8">
        <img
          className="absolute bottom-0 right-0 w-24 md:w-32"
          src={Leave}
          alt="Background decoration"
        />
        <h1 className="text-center text-2xl font-bold mb-6">Checkout</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col md:flex-row md:space-x-24">
            <div className="w-full md:w-[45%] border rounded-md p-6 mb-6 md:mb-0">
              <div className="flex items-center space-x-2 border-b pb-4 mb-4">
                <img src={Map} alt="Billing Address" className="w-4 h-4" />
                <h4 className="font-bold text-sm">Billing Address</h4>
              </div>
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
                type="number"
                placeholder="Postal Code"
                className="w-full border rounded-md p-3 mb-4"
                {...register('postalCode', {
                  required: 'Postal Code is required',
                  pattern: { value: /^\d{5}$/, message: 'Postal Code must be 5 digits' },
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
            </div>

            <div className="w-full lg:w-[35%] border rounded-md p-6">
              <div className="flex items-center space-x-2 border-b pb-4 mb-4">
                <img src={CreditCard} alt="Credit Card Details" className="w-4 h-4" />
                <h4 className="font-bold text-sm">Credit Card Details</h4>
              </div>
              {/* <div className="mt-6">
                <AuthButton
                  formData={formData}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              </div> */}
              <FlutterWaveButton {...fwConfig} />        
            </div>
          </div>
          </form>
      </div>
    </section>
  );
};

export default CheckoutForm;
