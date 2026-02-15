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
  Trash,
  JournalText,
  Eye,
  GraphUp
} from 'react-bootstrap-icons';
import { casesAPI, suggestionsAPI, feedbackAPI, analyticsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateFormat';
import './ModeratorDashboard.css';

const ModeratorDashboard = () => {
  const { t } = useTranslation();
  const { isModerator } = useAuth();
  const [stats, setStats] = useState({
    totalCases: 0,
    totalMemories: 0,
    pendingSuggestions: 0,
    approvedSuggestions: 0,
    rejectedSuggestions: 0,
    totalSuggestions: 0,
    unreadFeedback: 0,
    readFeedback: 0,
    totalFeedback: 0,
    draftCases: 0,
    publishedCases: 0,
    draftMemories: 0,
    publishedMemories: 0
  });
  const [suggestions, setSuggestions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [popularEntries, setPopularEntries] = useState([]);
  const [dailyVisitors, setDailyVisitors] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
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
        // Для статистики модератора показываем все дела (и опубликованные, и черновики)
        casesAPI.getAll({ status: 'all' }),
        suggestionsAPI.getAll(),
        feedbackAPI.getAll(),
        casesAPI.getStatistics()
      ]);

      const allCases = casesRes.data.cases || [];
      const casesOnly = allCases.filter(c => c.type !== 'memory');
      const memoriesOnly = allCases.filter(c => c.type === 'memory');
      const draftCasesCount = casesOnly.filter(c => c.status === 'draft').length;
      const publishedCasesCount = casesOnly.filter(c => c.status === 'published').length;
      const draftMemoriesCount = memoriesOnly.filter(c => c.status === 'draft').length;
      const publishedMemoriesCount = memoriesOnly.filter(c => c.status === 'published').length;

      const suggestionsData = suggestionsRes.data || [];
      const pendingSugg = suggestionsData.filter((s) => s.status === 'pending').length;
      const approvedSugg = suggestionsData.filter((s) => s.status === 'approved').length;
      const rejectedSugg = suggestionsData.filter((s) => s.status === 'rejected').length;

      const feedbackData = feedbackRes.data || [];
      const unreadFb = feedbackData.filter((f) => !(f.isRead || f.read)).length;
      const readFb = feedbackData.length - unreadFb;

      setStats({
        totalCases: casesOnly.length,
        totalMemories: memoriesOnly.length,
        pendingSuggestions: pendingSugg,
        approvedSuggestions: approvedSugg,
        rejectedSuggestions: rejectedSugg,
        totalSuggestions: suggestionsData.length,
        unreadFeedback: unreadFb,
        readFeedback: readFb,
        totalFeedback: feedbackData.length,
        draftCases: draftCasesCount,
        publishedCases: publishedCasesCount,
        draftMemories: draftMemoriesCount,
        publishedMemories: publishedMemoriesCount
      });

      setSuggestions(
        suggestionsRes.data.filter((s) => s.status === 'pending').slice(0, 5)
      );

      setStatistics(statisticsRes.data);
      setRecentCases(statisticsRes.data.recentCases || []);

      // Fetch analytics (non-blocking)
      try {
        const [overviewRes, popularRes, byDateRes] = await Promise.all([
          analyticsAPI.getOverview(),
          analyticsAPI.getPopular(),
          analyticsAPI.getByDate(null, null, selectedPeriod)
        ]);
        setAnalytics(overviewRes.data);
        setPopularEntries(popularRes.data || []);
        setDailyVisitors(byDateRes.data || []);
      } catch (analyticsError) {
        console.error('Error fetching analytics:', analyticsError);
      }
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

  const handlePeriodChange = async (period) => {
    setSelectedPeriod(period);
    try {
      const byDateRes = await analyticsAPI.getByDate(null, null, period);
      setDailyVisitors(byDateRes.data || []);
    } catch (error) {
      console.error('Error fetching daily visitors:', error);
    }
  };

  // Helper: render a pie chart from data array [{_id, count}, ...]
  const renderPieChart = (data, colorMap, labelFn) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return null;
    let currentAngle = 0;

    return (
      <div className="pie-chart-container">
        <svg viewBox="0 0 200 200" className="pie-chart-svg">
          {data.map((item) => {
            const angle = (item.count / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            // For a full circle (single item = 100%), draw a circle instead of an arc
            if (angle >= 359.99) {
              return (
                <circle
                  key={item._id}
                  cx="100"
                  cy="100"
                  r="80"
                  fill={colorMap[item._id] || '#999'}
                  stroke="#fff"
                  strokeWidth="2"
                >
                  <title>{`${labelFn(item._id)}: ${item.count} (100%)`}</title>
                </circle>
              );
            }

            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
            const x1 = 100 + 80 * Math.cos(startRad);
            const y1 = 100 + 80 * Math.sin(startRad);
            const x2 = 100 + 80 * Math.cos(endRad);
            const y2 = 100 + 80 * Math.sin(endRad);
            const largeArc = angle > 180 ? 1 : 0;
            const percentage = ((item.count / total) * 100).toFixed(1);

            return (
              <path
                key={item._id}
                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colorMap[item._id] || '#999'}
                stroke="#fff"
                strokeWidth="2"
              >
                <title>{`${labelFn(item._id)}: ${item.count} (${percentage}%)`}</title>
              </path>
            );
          })}
        </svg>
        <div className="pie-legend">
          {data.map(item => {
            const percentage = ((item.count / total) * 100).toFixed(1);
            return (
              <div key={item._id} className="legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: colorMap[item._id] || '#999' }}
                />
                <span className="legend-label">{labelFn(item._id)}</span>
                <span className="legend-value">{item.count} ({percentage}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    );
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
                  {t('moderator.manageAll')}
                </Link>
                <Link to="/moderator/add-case" className="btn btn-success btn-large">
                  <PlusCircle size={20} />
                  {t('moderator.addCase')}
                </Link>
                <Link to="/moderator/add-memory" className="btn btn-accent btn-large">
                  <JournalText size={20} />
                  {t('moderator.addMemory')}
                </Link>
              </div>

              {/* Stats Cards - uniform size and informative */}
              <div className="stats-grid stats-grid-uniform">
                <Link to="/moderator/cases?type=case" className="stat-card-link">
                  <div className="stat-card card clickable">
                    <FileText size={32} className="stat-icon" />
                    <div className="stat-info">
                      <h3>{stats.totalCases}</h3>
                      <p className="stat-label">{t('moderator.totalCases')}</p>
                      <div className="stat-details">
                        <span className="text-success">{stats.publishedCases} {t('moderator.published').toLowerCase()}</span>
                        <span className="text-warning">{stats.draftCases} {t('moderator.draft').toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link to="/moderator/cases?type=memory" className="stat-card-link">
                  <div className="stat-card card clickable">
                    <JournalText size={32} className="stat-icon" />
                    <div className="stat-info">
                      <h3>{stats.totalMemories}</h3>
                      <p className="stat-label">{t('moderator.totalMemories')}</p>
                      <div className="stat-details">
                        <span className="text-success">{stats.publishedMemories} {t('moderator.published').toLowerCase()}</span>
                        <span className="text-warning">{stats.draftMemories} {t('moderator.draft').toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link to="/moderator/suggestions" className="stat-card-link">
                  <div className="stat-card card clickable">
                    <ExclamationCircle size={32} className="stat-icon" />
                    <div className="stat-info">
                      <h3>{stats.totalSuggestions}</h3>
                      <p className="stat-label">{t('moderator.suggestions')}</p>
                      <div className="stat-details">
                        <span className="text-warning">{stats.pendingSuggestions} {t('moderator.pending').toLowerCase()}</span>
                        <span className="text-success">{stats.approvedSuggestions} {t('moderator.approved').toLowerCase()}</span>
                        <span className="text-muted">{stats.rejectedSuggestions} {t('moderator.rejected').toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link to="/moderator/feedback" className="stat-card-link">
                  <div className="stat-card card clickable">
                    <ChatLeftText size={32} className="stat-icon" />
                    <div className="stat-info">
                      <h3>{stats.totalFeedback}</h3>
                      <p className="stat-label">{t('moderator.complaints')}</p>
                      <div className="stat-details">
                        <span className="text-warning">{stats.unreadFeedback} {t('moderator.unread').toLowerCase()}</span>
                        <span className="text-success">{stats.readFeedback} {t('moderator.read').toLowerCase()}</span>
                      </div>
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
                            <h4>{caseItem.type === 'memory' ? caseItem.personName || caseItem.title : caseItem.title}</h4>
                            <div className="badge-group">
                              <span className={`badge ${caseItem.type === 'memory' ? 'badge-accent' : 'badge-info'}`}>
                                {caseItem.type === 'memory' ? t('moderator.typeMemory') : t('moderator.typeCase')}
                              </span>
                              <span className={`badge ${caseItem.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                                {t(`moderator.${caseItem.status || 'published'}`)}
                              </span>
                            </div>
                          </div>
                          <div className="case-meta">
                            {caseItem.year && <span>{caseItem.year}</span>}
                            {caseItem.district && <span>{caseItem.district}</span>}
                            <span className="text-muted">
                              {formatDate(caseItem.createdAt)}
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
                            to={caseItem.type === 'memory' ? `/moderator/edit-memory/${caseItem._id}` : `/moderator/edit-case/${caseItem._id}`}
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
                    {t('moderator.allEditsAll')}
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

              {/* === Unified Statistics Section === */}
              <div className="statistics-section">
                <h2>
                  <BarChart size={24} style={{ marginRight: '8px' }} />
                  {t('moderator.statistics')}
                </h2>

                {/* Visitor overview cards */}
                {analytics && (
                  <div className="analytics-cards">
                    <div className="analytics-card card">
                      <div className="analytics-number">{analytics.today}</div>
                      <div className="analytics-label">{t('moderator.visitorsToday')}</div>
                    </div>
                    <div className="analytics-card card">
                      <div className="analytics-number">{analytics.week}</div>
                      <div className="analytics-label">{t('moderator.visitorsWeek')}</div>
                    </div>
                    <div className="analytics-card card">
                      <div className="analytics-number">{analytics.month}</div>
                      <div className="analytics-label">{t('moderator.visitorsMonth')}</div>
                    </div>
                    <div className="analytics-card card">
                      <div className="analytics-number">{analytics.quarter}</div>
                      <div className="analytics-label">{t('moderator.visitorsQuarter')}</div>
                    </div>
                    <div className="analytics-card card">
                      <div className="analytics-number">{analytics.halfYear}</div>
                      <div className="analytics-label">{t('moderator.visitorsHalfYear')}</div>
                    </div>
                    <div className="analytics-card card">
                      <div className="analytics-number">{analytics.allTime}</div>
                      <div className="analytics-label">{t('moderator.visitorsAllTime')}</div>
                    </div>
                  </div>
                )}

                {/* Daily Visitors Line Chart */}
                <div className="stat-block card" style={{ marginTop: 'var(--spacing-lg)' }}>
                  <div className="stat-block-header">
                    <h3>{t('moderator.dailyVisitors')}</h3>
                    <div className="period-selector">
                      {[
                        { key: '7days', label: t('moderator.week') },
                        { key: '30days', label: t('moderator.month') },
                        { key: '90days', label: t('moderator.quarter') },
                        { key: '180days', label: t('moderator.halfYear') }
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          className={`period-btn ${selectedPeriod === key ? 'active' : ''}`}
                          onClick={() => handlePeriodChange(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="chart-container">
                    {dailyVisitors.length > 0 ? (() => {
                      const chartLeft = 50;
                      const chartRight = 780;
                      const chartTop = 30;
                      const chartBottom = 250;
                      const chartW = chartRight - chartLeft;
                      const chartH = chartBottom - chartTop;

                      const maxCount = Math.max(...dailyVisitors.map(d => d.count), 1);
                      // Nice Y-axis: round up to nearest nice number
                      const niceMax = maxCount <= 5 ? 5 : Math.ceil(maxCount / 5) * 5;
                      const yTicks = 5;

                      const getX = (i) => dailyVisitors.length === 1
                        ? (chartLeft + chartRight) / 2
                        : chartLeft + (i / (dailyVisitors.length - 1)) * chartW;
                      const getY = (count) => chartBottom - (count / niceMax) * chartH;

                      const points = dailyVisitors.map((d, i) => `${getX(i)},${getY(d.count)}`).join(' ');
                      const areaPoints = dailyVisitors.length > 1
                        ? `${chartLeft},${chartBottom} ${points} ${getX(dailyVisitors.length - 1)},${chartBottom}`
                        : '';

                      // X-axis labels: adaptive count
                      let maxLabels = 7;
                      if (selectedPeriod === '30days') maxLabels = 10;
                      else if (selectedPeriod === '90days') maxLabels = 12;
                      else if (selectedPeriod === '180days') maxLabels = 12;
                      const labelStep = Math.max(1, Math.ceil(dailyVisitors.length / maxLabels));

                      return (
                        <div className="line-chart">
                          <svg viewBox="0 0 820 310" preserveAspectRatio="xMidYMid meet">
                            {/* Y-axis grid lines + labels */}
                            {Array.from({ length: yTicks + 1 }, (_, i) => {
                              const value = Math.round((niceMax / yTicks) * (yTicks - i));
                              const y = chartTop + (i / yTicks) * chartH;
                              return (
                                <g key={`y-${i}`}>
                                  <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke="#e8e8e8" strokeWidth="1" />
                                  <text x={chartLeft - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#888">{value}</text>
                                </g>
                              );
                            })}

                            {/* X-axis base line */}
                            <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#ccc" strokeWidth="1" />

                            {/* Area fill */}
                            {dailyVisitors.length > 1 && (
                              <polygon points={areaPoints} fill="rgba(44, 62, 80, 0.06)" />
                            )}

                            {/* Line */}
                            {dailyVisitors.length > 1 && (
                              <polyline
                                points={points}
                                fill="none"
                                stroke="#2c3e50"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}

                            {/* Data points */}
                            {dailyVisitors.map((d, i) => (
                              <circle key={`pt-${i}`} cx={getX(i)} cy={getY(d.count)} r={dailyVisitors.length > 30 ? 2.5 : 4} fill="#2c3e50">
                                <title>{`${d.date}: ${d.count} ${t('moderator.viewsCount')}`}</title>
                              </circle>
                            ))}

                            {/* Value labels on points (only if few points) */}
                            {dailyVisitors.length <= 14 && dailyVisitors.map((d, i) => (
                              <text key={`val-${i}`} x={getX(i)} y={getY(d.count) - 10} textAnchor="middle" fontSize="10" fill="#2c3e50" fontWeight="600">
                                {d.count}
                              </text>
                            ))}

                            {/* X-axis date labels */}
                            {dailyVisitors.map((d, i) => {
                              const isFirst = i === 0;
                              const isLast = i === dailyVisitors.length - 1;
                              if (!isFirst && !isLast && i % labelStep !== 0) return null;

                              const [, month, day] = d.date.split('-');
                              const x = getX(i);
                              return (
                                <g key={`xl-${i}`}>
                                  <line x1={x} y1={chartBottom} x2={x} y2={chartBottom + 5} stroke="#ccc" strokeWidth="1" />
                                  <text x={x} y={chartBottom + 18} textAnchor="middle" fontSize="10" fill="#888">
                                    {`${day}.${month}`}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      );
                    })() : (
                      <div className="empty-chart-message">{t('moderator.noResults')}</div>
                    )}
                  </div>
                </div>

                {/* Pie Charts Row - Type and Status from Case model data */}
                {statistics && (
                  <div className="pie-charts-row" style={{ marginTop: 'var(--spacing-lg)' }}>
                    {/* Type Distribution Pie (records in DB, not page views) */}
                    {statistics.byType?.length > 0 && (
                      <div className="stat-block card pie-chart-card">
                        <h3>{t('moderator.viewsByType')}</h3>
                        {renderPieChart(
                          statistics.byType,
                          { case: '#4A90E2', memory: '#E2B04A' },
                          (id) => id === 'memory' ? t('moderator.typeMemory') : t('moderator.typeCase')
                        )}
                      </div>
                    )}

                    {/* Status Distribution Pie (records in DB) */}
                    {statistics.byStatus?.length > 0 && (
                      <div className="stat-block card pie-chart-card">
                        <h3>{t('moderator.viewsByStatus')}</h3>
                        {renderPieChart(
                          statistics.byStatus,
                          { published: '#28A745', draft: '#FFC107' },
                          (id) => t(`moderator.${id}`)
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Popular Entries */}
                {popularEntries.length > 0 && (
                  <div className="stat-block card" style={{ marginTop: 'var(--spacing-lg)' }}>
                    <h3>{t('moderator.popularEntries')}</h3>
                    <div className="popular-list">
                      {popularEntries.map((entry, index) => (
                        <div key={entry._id} className="popular-item">
                          <span className="popular-rank">#{index + 1}</span>
                          <div className="popular-info">
                            <Link to={`/cases/${entry._id}`} className="popular-title">
                              {entry.title}
                            </Link>
                            <span className={`badge ${entry.type === 'memory' ? 'badge-accent' : 'badge-info'}`}>
                              {entry.type === 'memory' ? t('moderator.typeMemory') : t('moderator.typeCase')}
                            </span>
                          </div>
                          <span className="popular-views">
                            <Eye size={14} /> {entry.views}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cases by Year bar chart */}
                {statistics?.byYear?.length > 0 && (
                  <div className="stat-block card" style={{ marginTop: 'var(--spacing-lg)' }}>
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

                {/* Cases by District horizontal bars */}
                {statistics?.byDistrict?.length > 0 && (
                  <div className="stat-block card" style={{ marginTop: 'var(--spacing-lg)' }}>
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
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ModeratorDashboard;
