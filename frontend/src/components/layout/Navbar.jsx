import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LogOut, Bell, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/store/authSlice';
import { toggleTheme } from '@/store/themeSlice';
import { useLogout } from '@/hooks/useLogout';

export default function Navbar() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleLogout = useLogout();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary">
          PlacementOS
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => dispatch(toggleTheme())}>
            {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.name}
              </span>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}