// src/components/layout/DynamicPublicPageLayout.tsx
import React from 'react';
import MarketingLayout from './MarketingLayout';
import { useAuth } from '@/contexts/AuthProvider';

const DynamicPublicPageLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { loading } = useAuth();

  if (loading) return (
    <div className="loading-screen">
      Loading...
    </div>
  );

  return <MarketingLayout>{children}</MarketingLayout>;
};

export default DynamicPublicPageLayout;
