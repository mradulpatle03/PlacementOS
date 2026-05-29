import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Must be logged in
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// Must NOT be logged in
export function GuestRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

// Must have one of the given roles
export function RoleRoute({ children, roles }) {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}