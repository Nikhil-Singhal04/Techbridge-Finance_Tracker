import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Users as UsersIcon, Shield, AlertCircle } from 'lucide-react';
import Spinner from '../components/Spinner';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await client.get('/users');
        if (res.data.success) {
          setUsers(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Admin-only portal for role assignments and accounts.</p>
        </div>
      </div>

      {loading ? (
        <Spinner text="Loading users..." />
      ) : error ? (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Users ({users.length})</h3>
          </div>
          <div className="card-body table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
