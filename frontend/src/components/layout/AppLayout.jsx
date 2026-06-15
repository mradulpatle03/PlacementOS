import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";

export default function AppLayout() {
  useNotificationSocket();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {/* pt-14 on mobile to clear the hamburger button; pt-0 on desktop */}
          <div className="px-4 sm:px-6 py-6 pt-16 lg:pt-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
