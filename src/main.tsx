import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from './contexts/AuthProvider'; // --- 1. IMPORT THE PROVIDER ---
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* --- 2. WRAP YOUR APP WITH THE AUTH PROVIDER --- */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);