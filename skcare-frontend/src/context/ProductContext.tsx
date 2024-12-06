import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

interface Product {
  _id: string;
  name: string;
  imageUrl:string;
  price: number;
  quantity: number;
}

interface CartItem extends Product {
  cartQuantity: number;
}

interface ProductContextProps {
  products: Product[];
  cart: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
}

const ProductContext = createContext<ProductContextProps | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const API_URL = import.meta.env.VITE_ALL_PRODUCTS_URL;

  // Middleware function to fetch products
  const fetchAllProducts = async () => {
    try {
      const response = await axios.get<Product[]>(API_URL || '');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Update total price and quantity
  const updateCartSummary = () => {
    const quantity = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
    const price = cart.reduce((sum, item) => sum + item.cartQuantity * item.price, 0);
    setTotalQuantity(quantity);
    setTotalPrice(price);
  };

  // Add product to cart
  const addToCart = (productId: string) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item._id === productId);
      if (existingItem) {
        return prevCart.map((item) =>
          item._id === productId ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        );
      } else {
        const productToAdd = products.find((product) => product._id === productId);
        if (productToAdd) {
          return [...prevCart, { ...productToAdd, cartQuantity: 1 }];
        }
      }
      return prevCart;
    });
  };

  // Remove product from cart
  const removeFromCart = (productId: string) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item._id === productId);
      if (existingItem?.cartQuantity === 1) {
        return prevCart.filter((item) => item._id !== productId);
      } else {
        return prevCart.map((item) =>
          item._id === productId ? { ...item, cartQuantity: item.cartQuantity - 1 } : item
        );
      }
    });
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  useEffect(() => {
    updateCartSummary();
  }, [cart]);

  return (
    <ProductContext.Provider
      value={{ products, cart, totalQuantity, totalPrice, addToCart, removeFromCart }}
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
