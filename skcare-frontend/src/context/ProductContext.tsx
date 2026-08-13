import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext'; // Ensure AuthContext is properly set up


// Define the product interface
interface Product {
  _id: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  discount?: number;
}

// Define the ProductContext interface
interface ProductContextProps {
  products:         Product[];
  fetchAllProducts: () => void;
  isLoading:        boolean;
  fetchError:       string | null;
}

// Create the ProductContext
const ProductContext = createContext<ProductContextProps | undefined>(undefined);

// ProductProvider Component
export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [products,   setProducts]   = useState<Product[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_ALL_PRODUCTS_URL;

  const fetchAllProducts = async () => {
    if (!API_URL) {
      setFetchError('VITE_ALL_PRODUCTS_URL is not set in .env');
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await axios.get<{ data: Product[] } | Product[]>(API_URL);
      const productArray = Array.isArray(response.data)
        ? response.data
        : (response.data as { data: Product[] }).data ?? [];
      setProducts(productArray);
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? `${error.response?.status ?? ''} ${error.message}`
        : 'Failed to fetch products';
      console.error('Error fetching products:', msg);
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProducts();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ProductContext.Provider value={{ products, fetchAllProducts, isLoading, fetchError }}>
      {children}
    </ProductContext.Provider>
  );
};

// Custom hook for using the ProductContext
export const useProductContext = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProductContext must be used within a ProductProvider');
  }
  return context;
};
