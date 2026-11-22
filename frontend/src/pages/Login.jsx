import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, LogIn, AlertCircle, Sparkles, Shield, UserCheck, Eye } from 'lucide-react';
import Spinner from '../components/Spinner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.friendlyMessage ||
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to log in. Please check your credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill helper for demo accounts
  const fillDemo = (demoEmail, demoPassword = 'Demo@1234') => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <Wallet size={32} />
          </div>
          <h2>Welcome back</h2>
          <p className="auth-subtitle">Sign in to your Personal Finance Tracker</p>
        </div>

        {/* Demo Credentials Box */}
        <div className="demo-credentials-box">
          <div className="demo-title">
            <Sparkles size={16} />
            <span>Click to fill demo account:</span>
          </div>
          <div className="demo-buttons">
            <button
              type="button"
              className="btn-demo btn-demo-admin"
              onClick={() => fillDemo('admin@demo.com')}
            >
              <Shield size={14} />
              <span>Admin</span>
            </button>
            <button
              type="button"
              className="btn-demo btn-demo-user"
              onClick={() => fillDemo('user@demo.com')}
            >
              <UserCheck size={14} />
              <span>User</span>
            </button>
            <button
              type="button"
              className="btn-demo btn-demo-readonly"
              onClick={() => fillDemo('readonly@demo.com')}
            >
              <Eye size={14} />
              <span>Read-Only</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Spinner size="small" text="" />
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
