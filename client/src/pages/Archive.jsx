import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, FunnelFill } from 'react-bootstrap-icons';
import { casesAPI } from '../services/api';
import CaseCard from '../components/cases/CaseCard';
import './Archive.css';

const Archive = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    location: '',
    yearFrom: '',
    yearTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.location) params.location = filters.location;
      if (filters.yearFrom) params.yearFrom = filters.yearFrom;
      if (filters.yearTo) params.yearTo = filters.yearTo;

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
      yearFrom: '',
      yearTo: ''
    });
    setTimeout(() => fetchCases(), 100);
  };

  return (
    <div className="archive-page">
      <div className="archive-header">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="filters-panel card"
              >
                <h3>{t('filters.title')}</h3>
                <div className="filters-grid">
                  <div className="input-group">
                    <label>{t('filters.location')}</label>
                    <input
                      type="text"
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
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
              </motion.div>
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
              <div className="results-count">
                <p className="text-muted">
                  Found {cases.length} {cases.length === 1 ? 'case' : 'cases'}
                </p>
              </div>
              <div className="cases-grid">
                {cases.map((caseItem, index) => (
                  <motion.div
                    key={caseItem._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <CaseCard caseData={caseItem} />
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive;

