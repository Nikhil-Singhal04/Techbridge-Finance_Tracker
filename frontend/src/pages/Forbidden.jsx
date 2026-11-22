import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, Home } from 'lucide-react';

const Forbidden = () => {
  return (
    <div className="center-page">
      <div className="card forbidden-card text-center">
        <div className="forbidden-icon-wrapper">
          <ShieldX size={48} className="forbidden-icon" />
        </div>
        <h2>403 - Access Forbidden</h2>
        <p className="text-muted">
          You do not have the required permissions to view this resource.
        </p>
        <Link to="/" className="btn btn-primary mt-4">
          <Home size={18} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default Forbidden;
