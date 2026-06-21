import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true, // sends cookies
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
});

let refreshPromise = null;

const PUBLIC_PATHS = new Set([
  '/',
  '/success-stories',
  '/about',
  '/contact',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
]);

const isPublicPath = (path) => PUBLIC_PATHS.has(path);

// Attach access token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((res) => res.data.accessToken)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

// On 401, try the refresh cookie once before treating the session as expired.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        if (!isPublicPath(window.location.pathname)) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && isRefreshRequest) {
      localStorage.removeItem('accessToken');
    }

    return Promise.reject(error);
  }
);

export default api;
