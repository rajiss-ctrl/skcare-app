// middleware/fetchProducts.ts
import axios from 'axios';
// types/Product.ts
interface Product {
    _id: string;
    name: string;
    description?: string;
    imageUrl: { url: string }[];
    price:number
  }
  

// Ensure process.env.VITE_ALL_PRODUCTS_URL is defined in your environment variables
const API_URL = process.env.VITE_ALL_PRODUCTS_URL;

if (!API_URL) {
  throw new Error('VITE_ALL_PRODUCTS_URL environment variable is not defined');
}

export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const response = await axios.get('/api/products');
    return response.data.map((item: any) => ({
      _id: item._id,
      name: item.name,
      price: { NGN: item.price ? [item.price] : [] },
      imageUrl: item.imageUrl || [],
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};
