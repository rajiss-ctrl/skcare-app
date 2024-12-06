import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

interface Product {
  _id: string;
  name: string;
  imageUrl: string;
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
  updateQuantity: (productId: string, newQuantity: number) => void;
}

const ProductContext = createContext<ProductContextProps | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const API_URL = import.meta.env.VITE_ALL_PRODUCTS_URL;

  // Fetch products from the API
  const fetchAllProducts = async () => {
    try {
      const response = await axios.get<Product[]>(API_URL || '');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    fetchAllProducts(); // Call fetchAllProducts to fetch the data on component mount
  }, []);
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
    const totalQty = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.cartQuantity * item.price, 0);
    setTotalQuantity(totalQty);
    setTotalPrice(totalPrice);
  }, [cart]);

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
    setCart((prevCart) =>
      prevCart.filter((item) => item._id !== productId)
    );
  };

  // Update quantity of an item
  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item._id === productId ? { ...item, cartQuantity: newQuantity } : item
      )
    );
  };

  return (
    <ProductContext.Provider
      value={{ products, cart, totalQuantity, totalPrice, addToCart, removeFromCart, updateQuantity }}
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
