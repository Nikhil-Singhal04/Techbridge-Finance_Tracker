import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Wallet,
  LayoutDashboard,
  Receipt,
  Users,
  Sun,
  Moon,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Eye,
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="badge badge-admin">
            <ShieldCheck size={14} className="badge-icon" />
            Admin
          </span>
        );
      case 'read-only':
        return (
          <span className="badge badge-readonly">
            <Eye size={14} className="badge-icon" />
            Read-Only
          </span>
        );
      default:
        return (
          <span className="badge badge-user">
            <ShieldAlert size={14} className="badge-icon" />
            User
          </span>
        );
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand Logo & Name */}
        <div className="navbar-brand">
          <NavLink to="/" className="brand-link">
            <div className="brand-icon-wrapper">
              <Wallet size={24} className="brand-icon" />
            </div>
            <span className="brand-title">FinanceTracker</span>
          </NavLink>
        </div>

        {/* Navigation Links */}
        <div className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/transactions"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Receipt size={18} />
            <span>Transactions</span>
          </NavLink>

          {/* Users link strictly shown only to admin */}
          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Users</span>
            </NavLink>
          )}
        </div>

        {/* Right Action Section */}
        <div className="navbar-actions">
          {/* User profile & badge */}
          {user && (
            <div className="user-profile">
              <span className="user-name">{user.name}</span>
              {getRoleBadge(user.role)}
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="btn-icon theme-toggle"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Logout Button */}
          {user && (
            <button
              onClick={handleLogout}
              className="btn btn-outline btn-logout"
              title="Sign out"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
