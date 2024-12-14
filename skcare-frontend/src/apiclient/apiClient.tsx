import axios from 'axios';
  // Assuming you have AuthContext for user authentication
const url = import.meta.env.VITE_APP_API_BASE_URL
const apiClient = axios.create({
  baseURL: url
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  console.log(token)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
