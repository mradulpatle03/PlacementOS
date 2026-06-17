import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { store } from "./store/store";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";
import ErrorBoundary from "./components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <BrowserRouter>
                <App />
                <Toaster richColors position="top-right" />
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </Provider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
