import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, setInitialized, logout } from '@/store/authSlice';
import { authAPI } from '@/api/auth.api';

export function useInitAuth() {
  const dispatch = useDispatch();

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        dispatch(setInitialized());
        return;
      }

      try {
        // token exists — verify it's still valid
        const res = await authAPI.getMe();
        dispatch(setCredentials(res.data.user));
      } catch {
        // access token expired — try refresh
        try {
          const refreshRes = await authAPI.refresh();
          const newToken = refreshRes.data.accessToken;
          localStorage.setItem('accessToken', newToken);

          const meRes = await authAPI.getMe();
          dispatch(setCredentials(meRes.data.user));
        } catch {
          // refresh also failed — clear everything
          dispatch(logout());
        }
      }
    };

    init();
  }, [dispatch]);
}