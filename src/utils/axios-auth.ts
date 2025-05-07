import axios, { AxiosError } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import router from '../router';
import { useAuthStore } from '../stores/auth';

const apiKey = import.meta.env.VITE_API_KEY_FIREBASE as string;
const axiosApiInstance = axios.create();

axiosApiInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const url = config.url || '';
  if (!url.includes('signInWithPassword') && !url.includes('signUp')) {
    const authStore = useAuthStore();
    const params = new URLSearchParams();
    params.append('auth', authStore.userInfo.token);
    config.params = params;
  }
  return config;
});

axiosApiInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const authStore = useAuthStore();
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Получаем refreshToken из хранилища
        const storedTokens = localStorage.getItem('userTokens');
        if (!storedTokens) throw new Error('No tokens found');
        
        const { refreshToken } = JSON.parse(storedTokens);
        if (!refreshToken) throw new Error('No refresh token found');

        // Правильный запрос для обновления токена в Firebase
        const response = await axios.post(
          `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        const { id_token: newToken, refresh_token: newRefreshToken } = response.data;

        authStore.userInfo.token = newToken;
        authStore.userInfo.refreshToken = newRefreshToken;

        localStorage.setItem('userTokens', JSON.stringify({
          token: newToken,
          refreshToken: newRefreshToken
        }));

        originalRequest.params = originalRequest.params || {};
        originalRequest.params.auth = newToken;
        return axiosApiInstance(originalRequest);
        
      } catch (refreshError) {
        console.error('Ошибка при обновлении токена:', refreshError);
        authStore.logout();
        router.push('/login');
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
export default axiosApiInstance;