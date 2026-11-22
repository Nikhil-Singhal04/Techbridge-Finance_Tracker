import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';
import { Info } from 'lucide-react';

const Layout = () => {
  const { isReadOnly } = useAuth();

  return (
    <div className="app-layout">
      <Navbar />

      {/* Read-Only Informational Banner */}
      {isReadOnly && (
        <div className="readonly-banner">
          <Info size={16} />
          <span>
            <strong>Read-only mode:</strong> You have viewing privileges for your transactions and analytics. Modifications are disabled.
          </span>
        </div>
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
