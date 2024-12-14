import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext'; // Assuming you have an AuthContext for user authentication
import { auth } from '@/firebase/config';

interface Product {
  _id: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  discount?: number; // Optional discount field
}

interface CartItem extends Product {
  cartQuantity: number;
}

interface ProductContextProps {
  products: Product[];
  cart: CartItem[];
  totalQuantity: number;
  totalAmount: number;
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, newQuantity: number) => void;
}

const ProductContext = createContext<ProductContextProps | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth(); // Get user info from the AuthContext
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const API_URL = import.meta.env.VITE_ALL_PRODUCTS_URL;
  const CART_API_URL = import.meta.env.VITE_CART_API_URL;

  // Fetch products from the API
  const fetchAllProducts = async () => {
    try {
      const response = await axios.get<Product[]>(API_URL || '');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Fetch cart from the API if logged in
  const fetchCartFromAPI = async () => {
    if (user?.uid) {
      try {
        // Fetch the Firebase Auth Token
        const authToken = await auth.currentUser?.getIdToken();
        if (!authToken) {
          throw new Error("User is not authenticated");
        }
  
        // Fetch cart from the API
        const response = await axios.get(`${CART_API_URL}/${user.uid}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        setCart(response.data.items || []);
      } catch (error) {
        // Handle errors gracefully
        if (error.response?.status === 401) {
          console.error('Unauthorized: Please log in again');
          // Optionally log the user out or prompt reauthentication
        } else {
          console.error('Error fetching cart from API:', error);
        }
      }
    }
  };
  


  // Save cart to the API
  const saveCartToAPI = async (updatedCart: CartItem[]) => {
    if (!user?.uid) {
      console.warn('User not authenticated. Cannot save cart.');
      return;
    }
  
    try {
      const payload = {
        userEmail: user.email,
        userName: user.displayName,
        userPhone: user.phoneNumber,
        items: updatedCart,
      };
  
      console.log('Saving cart with payload:', payload); // Debugging log
      const response =await axios.post(`${CART_API_URL}/${user.uid}`, payload);
      console.log('Cart saved successfully:', response.data);
      setCart(updatedCart); // Update local cart state after saving to the API
    } catch (error) {
      console.error('Error saving cart to API:', {
        message: error.message,
        response: error.response?.data,
        config: error.config,
      });
    }
  };
  
  useEffect(() => {
    fetchAllProducts(); // Fetch products when the component mounts
    fetchCartFromAPI(); // Fetch user's cart if logged in
  }, [user?.uid,user]);

  // Load cart from sessionStorage on initialization
  useEffect(() => {
    const storedCart = sessionStorage.getItem('cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  // Save cart to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('cart', JSON.stringify(cart));

    // Calculate total quantity and total amount
    const totalQty = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
    const totalAmt = cart.reduce((sum, item) => {
      const discount = item.discount ? (item.price * item.discount) / 100 : 0;
      return sum + item.cartQuantity * (item.price - discount);
    }, 0);

    setTotalQuantity(totalQty);
    setTotalAmount(totalAmt);
  }, [cart]);

  // Add product to cart
  const addToCart = (productId: string) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item._id === productId);
      let updatedCart;

      if (existingItem) {
        updatedCart = prevCart.map((item) =>
          item._id === productId
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      } else {
        const productToAdd = products.find((product) => product._id === productId);
        if (!productToAdd) return prevCart;
        updatedCart = [...prevCart, { ...productToAdd, cartQuantity: 1 }];
      }

      saveCartToAPI(updatedCart); // Save updated cart to the backend
      return updatedCart;
    });
  };

  // Remove product from cart
  const removeFromCart = (productId: string) => {
    setCart((prevCart) => {
      const updatedCart = prevCart.filter((item) => item._id !== productId);
      saveCartToAPI(updatedCart); // Save updated cart to the backend
      return updatedCart;
    });
  };

  // Update quantity of a product in the cart
  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) =>
        item._id === productId ? { ...item, cartQuantity: newQuantity } : item
      );
      saveCartToAPI(updatedCart); // Save updated cart to the backend
      return updatedCart;
    });
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        cart,
        totalQuantity,
        totalAmount,
        addToCart,
        removeFromCart,
        updateQuantity,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProductContext = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProductContext must be used within a ProductProvider');
  }
  return context;
};
