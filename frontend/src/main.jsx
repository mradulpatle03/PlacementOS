import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { store } from './store/store';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';
import '@fullcalendar/core/main.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);