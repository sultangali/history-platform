import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  FileText,
  ChatLeftText,
  ExclamationCircle
} from 'react-bootstrap-icons';
import { casesAPI, suggestionsAPI, feedbackAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ModeratorDashboard.css';

const ModeratorDashboard = () => {
  const { t } = useTranslation();
  const { isModerator } = useAuth();
  const [stats, setStats] = useState({
    totalCases: 0,
    pendingSuggestions: 0,
    unreadFeedback: 0
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isModerator) {
      fetchData();
    }
  }, [isModerator]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [casesRes, suggestionsRes, feedbackRes] = await Promise.all([
        casesAPI.getAll(),
        suggestionsAPI.getAll(),
        feedbackAPI.getAll()
      ]);

      setStats({
        totalCases: casesRes.data.cases?.length || 0,
        pendingSuggestions:
          suggestionsRes.data.filter((s) => s.status === 'pending').length || 0,
        unreadFeedback: feedbackRes.data.filter((f) => !f.read).length || 0
      });

      setSuggestions(
        suggestionsRes.data.filter((s) => s.status === 'pending').slice(0, 5)
      );
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionAction = async (id, status) => {
    try {
      await suggestionsAPI.update(id, status);
      fetchData();
    } catch (error) {
      console.error('Error updating suggestion:', error);
    }
  };

  if (!isModerator) {
    return (
      <div className="moderator-page">
        <div className="container">
          <div className="empty-state">Access denied</div>
        </div>
      </div>
    );
  }

  return (
    <div className="moderator-page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="moderator-header">
            <h1>{t('moderator.dashboard')}</h1>
            <Link to="/moderator/add-case" className="btn btn-primary">
              <PlusCircle size={20} />
              {t('moderator.addCase')}
            </Link>
          </div>

          {loading ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="stats-grid">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="stat-card card"
                >
                  <FileText size={32} className="stat-icon" />
                  <div className="stat-info">
                    <h3>{stats.totalCases}</h3>
                    <p>{t('cases.title')}</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="stat-card card"
                >
                  <ExclamationCircle size={32} className="stat-icon" />
                  <div className="stat-info">
                    <h3>{stats.pendingSuggestions}</h3>
                    <p>{t('moderator.suggestions')}</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="stat-card card"
                >
                  <ChatLeftText size={32} className="stat-icon" />
                  <div className="stat-info">
                    <h3>{stats.unreadFeedback}</h3>
                    <p>{t('moderator.complaints')}</p>
                  </div>
                </motion.div>
              </div>

              {/* Recent Suggestions */}
              {suggestions.length > 0 && (
                <div className="suggestions-section">
                  <h2>{t('moderator.suggestions')}</h2>
                  <div className="suggestions-list">
                    {suggestions.map((suggestion) => (
                      <motion.div
                        key={suggestion._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="suggestion-item card"
                      >
                        <div className="suggestion-header">
                          <h4>{suggestion.subject}</h4>
                          <span className="badge badge-pending">
                            {t('moderator.pending')}
                          </span>
                        </div>
                        <p className="text-muted">{suggestion.message}</p>
                        <div className="suggestion-meta">
                          <span className="text-muted">
                            Case: {suggestion.caseId?.title || 'N/A'}
                          </span>
                        </div>
                        <div className="suggestion-actions">
                          <button
                            onClick={() =>
                              handleSuggestionAction(suggestion._id, 'approved')
                            }
                            className="btn btn-primary btn-sm"
                          >
                            {t('moderator.approved')}
                          </button>
                          <button
                            onClick={() =>
                              handleSuggestionAction(suggestion._id, 'rejected')
                            }
                            className="btn btn-secondary btn-sm"
                          >
                            {t('moderator.rejected')}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                  <Link to="/moderator/add-case" className="action-card card">
                    <PlusCircle size={32} />
                    <h3>{t('moderator.addCase')}</h3>
                  </Link>
                  <Link to="/moderator/suggestions" className="action-card card">
                    <ExclamationCircle size={32} />
                    <h3>{t('moderator.suggestions')}</h3>
                  </Link>
                  <Link to="/moderator/feedback" className="action-card card">
                    <ChatLeftText size={32} />
                    <h3>{t('moderator.complaints')}</h3>
                  </Link>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ModeratorDashboard;

