// src/components/layout/NoNavDashboardLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";

const NoNavDashboardLayout: React.FC = () => {
  return (
    <div className="dashboard-main-wrapper p-8 max-w-5xl mx-auto">
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default NoNavDashboardLayout;