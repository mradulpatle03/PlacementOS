import { Outlet, Link } from "react-router-dom";
import PublicNavbar from "@/components/public/PublicNavbar";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>

      {/* footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PlacementOS. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link
              to="/success-stories"
              className="hover:text-foreground transition-colors"
            >
              Success Stories
            </Link>
            <Link
              to="/about"
              className="hover:text-foreground transition-colors"
            >
              About TPO
            </Link>
            <Link
              to="/contact"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
