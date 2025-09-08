// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // This should correctly point to your App component
import '@/styles/app.css'; // Your global styles
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthProvider'; // Your AuthProvider

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider> {/* This MUST wrap your entire application */}
      <BrowserRouter> {/* This is typically high-level for routing */}
        <QueryClientProvider client={queryClient}> {/* QueryClientProvider also wraps your app */}
          <AuthProvider> {/* Your AuthProvider also wraps your app */}
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);