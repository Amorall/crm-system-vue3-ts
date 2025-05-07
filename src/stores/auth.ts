import { ref } from 'vue'
import { defineStore } from 'pinia';
import axiosApiInstance from '../utils/axios-auth';

const apiKey = import.meta.env.VITE_API_KEY_FIREBASE as string;

interface UserInfo {
  token: string;
  email: string;
  userId: string;
  refreshToken: string;
  expiresIn: string;
}

interface AuthPayload {
  email: string;
  password: string;
}

export const useAuthStore = defineStore('auth', () => {
  const userInfo = ref<UserInfo>({
    token: '',
    email: '',
    userId: '',
    refreshToken: '',
    expiresIn: '',
  });

  const error = ref<string>('');
  const loader = ref<boolean>(false);

  const auth = async (payload: AuthPayload, type: 'signup' | 'signin') => {
    const stringUrl = type === 'signup' ? 'signUp' : 'signInWithPassword';
    error.value = '';
    loader.value = true;

    try {
      const response = await axiosApiInstance.post<{
        idToken: string;
        email: string;
        localId: string;
        refreshToken: string;
        expiresIn: string;
      }>(
        `https://identitytoolkit.googleapis.com/v1/accounts:${stringUrl}?key=${apiKey}`,
        {
          ...payload,
          returnSecureToken: true,
        },
      );

      userInfo.value = {
        token: response.data.idToken,
        email: response.data.email,
        userId: response.data.localId,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn,
      };

      localStorage.setItem(
        'userToken',
        JSON.stringify({
          token: userInfo.value.token,
          refreshToken: userInfo.value.refreshToken,
          expiresIn: userInfo.value.expiresIn,
        }),
      );
    } catch (err: any) {
      const errorMessage: string =
        err.response?.data?.error?.message || err.message || 'Произошла неизвестная ошибка';

      switch (errorMessage) {
        case 'EMAIL_EXISTS':
          error.value = 'Этот email уже зарегистрирован';
          break;
        case 'INVALID_LOGIN_CREDENTIALS':
          error.value = 'Неверный email или пароль';
          break;
        case 'USER_DISABLED':
          error.value = 'Пользователь заблокирован';
          break;
        default:
          error.value = 'Произошла ошибка. Попробуйте позже';
          break;
      }
      throw new Error(error.value);
    } finally {
      loader.value = false;
    }
  };

  const logout = () => {
    userInfo.value = {
      token: '',
      email: '',
      userId: '',
      refreshToken: '',
      expiresIn: '',
    };
    localStorage.removeItem('userToken');
  };

  return { auth, userInfo, error, loader, logout };
});