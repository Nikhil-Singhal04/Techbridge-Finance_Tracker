import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Receipt, ArrowRight, ShieldCheck } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name}!</h1>
          <p className="page-subtitle">Here is your financial overview.</p>
        </div>
        <Link to="/transactions" className="btn btn-primary">
          <Receipt size={18} />
          <span>View Transactions</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="cards-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Account Profile</h3>
          </div>
          <div className="card-body">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> <span className={`badge badge-${user?.role}`}>{user?.role}</span></p>
            <p className="text-muted mt-2">
              Full interactive analytics dashboard with Recharts is coming in Phase 9.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="action-links">
              <Link to="/transactions" className="action-item">
                <Receipt size={20} />
                <div>
                  <strong>Transactions</strong>
                  <p className="text-muted">Browse and manage personal income & expenses</p>
                </div>
              </Link>
              {user?.role === 'admin' && (
                <Link to="/users" className="action-item">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>User Management</strong>
                    <p className="text-muted">Manage roles, accounts, and system access</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
