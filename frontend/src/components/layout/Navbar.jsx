import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleTheme } from "@/store/themeSlice";
import { useLogout } from "@/hooks/useLogout";
import NotificationBell from "@/components/ui/NotificationBell";

export default function Navbar() {
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const { mode } = useSelector((s) => s.theme);
  const dispatch = useDispatch();
  const handleLogout = useLogout();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto px-4 h-14 flex items-center justify-between">
        {/* logo — offset on mobile to clear hamburger (hamburger is fixed at left-4) */}
        <Link to="/" className="text-lg font-bold text-primary pl-10 lg:pl-0">
          PlacementOS
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(toggleTheme())}
          >
            {mode === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {isAuthenticated ? (
            <>
              <NotificationBell />

              <span className="text-sm text-muted-foreground hidden sm:block max-w-30 truncate">
                {user?.name}
              </span>

              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
