import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { People, ShieldCheck } from 'react-bootstrap-icons';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      await usersAPI.update(userId, { role });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleBlockUser = async (userId, blocked) => {
    try {
      await usersAPI.update(userId, { blocked });
      fetchUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="container">
          <div className="empty-state">Access denied</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="admin-header">
            <h1>{t('admin.dashboard')}</h1>
          </div>

          {loading ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : (
            <>
              {/* Stats */}
              <div className="stats-grid">
                <div className="stat-card card">
                  <People size={32} className="stat-icon" />
                  <div className="stat-info">
                    <h3>{users.length}</h3>
                    <p>{t('admin.users')}</p>
                  </div>
                </div>

                <div className="stat-card card">
                  <ShieldCheck size={32} className="stat-icon" />
                  <div className="stat-info">
                    <h3>{users.filter((u) => u.role === 'moderator').length}</h3>
                    <p>{t('admin.moderators')}</p>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="users-section">
                <h2>{t('admin.users')}</h2>
                <div className="users-table-wrapper">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>{t('auth.fullName')}</th>
                        <th>{t('auth.email')}</th>
                        <th>{t('admin.role')}</th>
                        <th>{t('admin.status')}</th>
                        <th>{t('admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td>{user.fullName}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`badge badge-${user.role}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                user.blocked ? 'badge-blocked' : 'badge-active'
                              }`}
                            >
                              {user.blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <select
                                value={user.role}
                                onChange={(e) =>
                                  handleUpdateRole(user._id, e.target.value)
                                }
                                className="role-select"
                              >
                                <option value="user">User</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() =>
                                  handleBlockUser(user._id, !user.blocked)
                                }
                                className={`btn btn-sm ${
                                  user.blocked ? 'btn-success' : 'btn-danger'
                                }`}
                              >
                                {user.blocked
                                  ? t('admin.unblock')
                                  : t('admin.block')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;

