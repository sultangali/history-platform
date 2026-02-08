import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  FileText,
  ChatLeftText,
  ExclamationCircle,
  ListCheck,
  BarChart,
  Pencil,
  Trash
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
    unreadFeedback: 0,
    draftCases: 0,
    publishedCases: 0
  });
  const [suggestions, setSuggestions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isModerator) {
      fetchData();
    }
  }, [isModerator]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [casesRes, suggestionsRes, feedbackRes, statisticsRes] = await Promise.all([
        casesAPI.getAll(),
        suggestionsAPI.getAll(),
        feedbackAPI.getAll(),
        casesAPI.getStatistics()
      ]);

      const allCases = casesRes.data.cases || [];
      const draftCount = allCases.filter(c => c.status === 'draft').length;
      const publishedCount = allCases.filter(c => c.status === 'published').length;

      setStats({
        totalCases: allCases.length,
        pendingSuggestions:
          suggestionsRes.data.filter((s) => s.status === 'pending').length || 0,
        unreadFeedback: feedbackRes.data.filter((f) => !f.read).length || 0,
        draftCases: draftCount,
        publishedCases: publishedCount
      });

      setSuggestions(
        suggestionsRes.data.filter((s) => s.status === 'pending').slice(0, 5)
      );

      setStatistics(statisticsRes.data);
      setRecentCases(statisticsRes.data.recentCases || []);
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
          <div className="empty-state">{t('moderator.accessDenied')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="moderator-page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="moderator-header">
            <h1>{t('moderator.dashboard')}</h1>
          </div>

          {loading ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : (
            <>
              {/* Quick Actions - moved to top */}
              <div className="quick-actions-top">
                <Link to="/moderator/cases" className="btn btn-primary btn-large">
                  <ListCheck size={20} />
                  {t('moderator.manageCases')}
                </Link>
                <Link to="/moderator/add-case" className="btn btn-success btn-large">
                  <PlusCircle size={20} />
                  {t('moderator.addCase')}
                </Link>
              </div>

              {/* Stats Cards */}
              <div className="stats-grid">
                <Link to="/moderator/cases" className="stat-card-link">
                  <div className="stat-card card clickable">
                    <FileText size={32} className="stat-icon" />
                    <div className="stat-info">
                      <h3>{stats.totalCases}</h3>
                      <p>{t('moderator.totalCases')}</p>
                      <div className="stat-details">
                        <span className="text-success">{stats.publishedCases} {t('moderator.published').toLowerCase()}</span>
                        <span className="text-warning">{stats.draftCases} {t('moderator.draft').toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link to="/moderator/suggestions" className="stat-card-link">
                  <div className="stat-card card clickable">
                    <ExclamationCircle size={32} className="stat-icon" />
                    <div className="stat-info">
                      <h3>{stats.pendingSuggestions}</h3>
                      <p>{t('moderator.suggestions')}</p>
                    </div>
                  </div>
                </Link>

                <Link to="/moderator/feedback" className="stat-card-link">
                  <div className="stat-card card clickable">
                    <ChatLeftText size={32} className="stat-icon" />
                    <div className="stat-info">
                      <h3>{stats.unreadFeedback}</h3>
                      <p>{t('moderator.complaints')}</p>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Recent Cases */}
              {recentCases.length > 0 && (
                <div className="recent-cases-section">
                  <h2>{t('moderator.recentCases')}</h2>
                  <div className="recent-cases-list">
                    {recentCases.map((caseItem) => (
                      <div key={caseItem._id} className="recent-case-item card">
                        <div className="case-content">
                          <div className="case-header">
                            <h4>{caseItem.title}</h4>
                            <span className={`badge ${caseItem.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                              {t(`moderator.${caseItem.status}`)}
                            </span>
                          </div>
                          <div className="case-meta">
                            {caseItem.year && <span>{caseItem.year}</span>}
                            {caseItem.district && <span>{caseItem.district}</span>}
                            <span className="text-muted">
                              {new Date(caseItem.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="case-actions">
                          <Link
                            to={`/cases/${caseItem._id}`}
                            className="btn-action btn-view"
                            title={t('common.view')}
                          >
                            <FileText size={18} />
                          </Link>
                          <Link
                            to={`/moderator/edit-case/${caseItem._id}`}
                            className="btn-action btn-edit"
                            title={t('common.edit')}
                          >
                            <Pencil size={18} />
                          </Link>
                          <button
                            onClick={async () => {
                              if (window.confirm(`${t('moderator.confirmDelete')} "${caseItem.title}"?`)) {
                                try {
                                  await casesAPI.delete(caseItem._id);
                                  fetchData();
                                } catch (error) {
                                  console.error('Error deleting case:', error);
                                  alert(t('common.error'));
                                }
                              }
                            }}
                            className="btn-action btn-delete"
                            title={t('common.delete')}
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to="/moderator/cases" className="btn btn-secondary view-all-btn">
                    {t('moderator.allCases')}
                  </Link>
                </div>
              )}

              {/* Recent Suggestions */}
              {suggestions.length > 0 && (
                <div className="suggestions-section">
                  <h2>{t('moderator.suggestions')}</h2>
                  <div className="suggestions-list">
                    {suggestions.map((suggestion) => (
                      <div key={suggestion._id} className="suggestion-item card">
                        <div className="suggestion-header">
                          <h4>{suggestion.subject}</h4>
                          <span className="badge badge-pending">
                            {t('moderator.pending')}
                          </span>
                        </div>
                        <p className="text-muted">{suggestion.message}</p>
                        <div className="suggestion-meta">
                          <span className="text-muted">
                            {t('cases.title')}: {suggestion.caseId?.title || t('caseDetail.notAvailable')}
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
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistics with Charts */}
              {statistics && (statistics.byYear?.length > 0 || statistics.byDistrict?.length > 0) && (
                <div className="statistics-section">
                  <h2>
                    <BarChart size={24} style={{ marginRight: '8px' }} />
                    {t('moderator.statistics')}
                  </h2>
                  <div className="statistics-grid">
                    {statistics.byYear?.length > 0 && (
                      <div className="stat-block card">
                        <h3>{t('moderator.casesByYear')}</h3>
                        <div className="chart-container">
                          <div className="bar-chart">
                            {statistics.byYear.slice(0, 10).map((item) => {
                              const maxCount = Math.max(...statistics.byYear.map(i => i.count));
                              const height = (item.count / maxCount) * 100;
                              return (
                                <div key={item._id} className="chart-bar-wrapper">
                                  <div className="chart-bar-container">
                                    <div 
                                      className="chart-bar" 
                                      style={{ height: `${height}%` }}
                                      title={`${item._id}: ${item.count}`}
                                    >
                                      <span className="bar-value">{item.count}</span>
                                    </div>
                                  </div>
                                  <span className="chart-label">{item._id || 'N/A'}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {statistics.byDistrict?.length > 0 && (
                      <div className="stat-block card">
                        <h3>{t('moderator.casesByDistrict')}</h3>
                        <div className="stat-list">
                          {statistics.byDistrict.slice(0, 8).map((item) => (
                            <div key={item._id} className="stat-item">
                              <span className="stat-label">{item._id || t('caseDetail.notAvailable')}</span>
                              <div className="stat-bar-wrapper">
                                <div 
                                  className="stat-bar" 
                                  style={{ width: `${(item.count / Math.max(...statistics.byDistrict.map(i => i.count))) * 100}%` }}
                                />
                                <span className="stat-value">{item.count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ModeratorDashboard;

