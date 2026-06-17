import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, logout } from '@/store/authSlice';
import { authAPI } from '@/api/auth.api';

export function useInitAuth() {
  const dispatch = useDispatch();

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');

      try {
        if (!token) {
          const refreshRes = await authAPI.refresh();
          localStorage.setItem('accessToken', refreshRes.data.accessToken);
        }

        const res = await authAPI.getMe();
        dispatch(setCredentials(res.data.user));
      } catch {
        dispatch(logout());
      }
    };

    init();
  }, [dispatch]);
}