import { useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '@/store/authSlice';
import { authAPI } from '@/api/auth.api';
import { showSuccess } from '@/lib/toast';

export function useLogout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // even if server call fails, clear client state
    }
    queryClient.clear();
    dispatch(logout());
    showSuccess('Logged out');
    navigate('/');
  };

  return handleLogout;
}
