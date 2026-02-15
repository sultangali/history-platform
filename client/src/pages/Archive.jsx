import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, FunnelFill, ListUl, Grid3x3GapFill } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import { casesAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';
import CaseCard from '../components/cases/CaseCard';
import './Archive.css';

const Archive = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    location: '',
    district: '',
    yearFrom: '',
    yearTo: '',
    type: searchParams.get('type') || 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  const getRowTitle = (caseItem) => {
    if (caseItem.type === 'memory') return caseItem.personName || caseItem.title || '-';
    return caseItem.title || (caseItem.caseNumber ? t('cases.caseNumber') + caseItem.caseNumber : '-');
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = {
        status: 'published' // Only show published cases in public archive
      };
      if (filters.search) params.search = filters.search;
      if (filters.location) params.location = filters.location;
      if (filters.district) params.district = filters.district;
      if (filters.yearFrom) params.yearFrom = filters.yearFrom;
      if (filters.yearTo) params.yearTo = filters.yearTo;
      if (filters.type && filters.type !== 'all') params.type = filters.type;

      const response = await casesAPI.getAll(params);
      setCases(response.data.cases || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCases();
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleApplyFilters = () => {
    fetchCases();
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      location: '',
      district: '',
      yearFrom: '',
      yearTo: '',
      type: 'all'
    });
    setTimeout(() => fetchCases(), 100);
  };

  return (
    <div className="archive-page">
      <div className="archive-header">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <h1>{t('cases.title')}</h1>
            <p className="text-muted">{t('app.subtitle')}</p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="archive-search">
              <div className="search-input-wrapper">
                <Search size={20} />
                <input
                  type="text"
                  placeholder={t('hero.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                {t('hero.search')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FunnelFill size={16} />
                {t('filters.title')}
              </button>
            </form>

            {/* Filters Panel */}
            {showFilters && (
              <div className="filters-panel card">
                <h3>{t('filters.title')}</h3>
                <div className="filters-grid">
                  <div className="input-group">
                    <label>{t('filters.type')}</label>
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                    >
                      <option value="all">{t('filters.typeAll')}</option>
                      <option value="case">{t('filters.typeCase')}</option>
                      <option value="memory">{t('filters.typeMemory')}</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>{t('filters.location')}</label>
                    <input
                      type="text"
                      placeholder=""
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label>{t('filters.district')}</label>
                    <input
                      type="text"
                      placeholder=""
                      value={filters.district}
                      onChange={(e) => handleFilterChange('district', e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label>{t('filters.yearFrom')}</label>
                    <input
                      type="number"
                      min="1900"
                      max="2000"
                      value={filters.yearFrom}
                      onChange={(e) => handleFilterChange('yearFrom', e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label>{t('filters.yearTo')}</label>
                    <input
                      type="number"
                      min="1900"
                      max="2000"
                      value={filters.yearTo}
                      onChange={(e) => handleFilterChange('yearTo', e.target.value)}
                    />
                  </div>
                </div>

                <div className="filters-actions">
                  <button onClick={handleApplyFilters} className="btn btn-primary">
                    {t('filters.apply')}
                  </button>
                  <button onClick={handleResetFilters} className="btn btn-secondary">
                    {t('filters.reset')}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="archive-content section">
        <div className="container">
          {loading ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : cases.length === 0 ? (
            <div className="empty-state">
              <p>{t('cases.noResults')}</p>
            </div>
          ) : (
            <>
              <div className="archive-toolbar">
                <p className="results-count text-muted">
                  {t(cases.length === 1 ? 'archive.foundCase' : 'archive.foundCases', { count: cases.length })}
                </p>
                <div className="archive-view-toggle">
                  <button
                    type="button"
                    className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title={t('moderator.table')}
                  >
                    <ListUl size={20} />
                  </button>
                  <button
                    type="button"
                    className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                    onClick={() => setViewMode('cards')}
                    title={t('moderator.cards')}
                  >
                    <Grid3x3GapFill size={20} />
                  </button>
                </div>
              </div>

              {viewMode === 'table' ? (
                <div className="archive-table-wrapper">
                  <table className="archive-table">
                    <thead>
                      <tr>
                        <th>{t('form.caseTitle')}</th>
                        <th>{t('moderator.typeLabel')}</th>
                        <th>{t('filters.location')}</th>
                        <th>{t('form.year')}</th>
                        <th>{t('cases.dateRange')}</th>
                        <th>{t('cases.victims')}</th>
                        <th className="archive-table-actions">{t('moderator.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map((caseItem) => (
                        <tr key={caseItem._id}>
                          <td className="archive-table-title">
                            <span title={getRowTitle(caseItem)}>{getRowTitle(caseItem)}</span>
                          </td>
                          <td>
                            <span className={`archive-badge ${caseItem.type === 'memory' ? 'archive-badge-memory' : 'archive-badge-case'}`}>
                              {caseItem.type === 'memory' ? t('moderator.typeMemory') : t('moderator.typeCase')}
                            </span>
                          </td>
                          <td>{(caseItem.location || caseItem.district) ? [caseItem.location, caseItem.district].filter(Boolean).join(', ') : '-'}</td>
                          <td>{caseItem.year || '-'}</td>
                          <td>
                            {caseItem.dateFrom || caseItem.dateTo
                              ? `${formatDate(caseItem.dateFrom)} - ${formatDate(caseItem.dateTo)}`
                              : '-'}
                          </td>
                          <td>{caseItem.victims?.length ? `${caseItem.victims.length}` : '-'}</td>
                          <td className="archive-table-actions">
                            <Link to={`/cases/${caseItem._id}`} className="btn btn-secondary btn-sm">
                              {t('cases.viewDetails')}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="cases-grid">
                  {cases.map((caseItem) => (
                    <div key={caseItem._id}>
                      <CaseCard caseData={caseItem} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive;

