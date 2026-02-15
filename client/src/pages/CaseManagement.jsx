import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  Search,
  FunnelFill,
  Grid3x3GapFill,
  ListUl,
  Download,
  Trash,
  X,
  ArrowLeft
} from 'react-bootstrap-icons';
import { casesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CasesTable from '../components/moderator/CasesTable';
import CasesGrid from '../components/moderator/CasesGrid';
import CasePreviewModal from '../components/moderator/CasePreviewModal';
import { exportToCSV, exportToXLSX, exportToJSON, exportSelected } from '../utils/exportUtils';
import './CaseManagement.css';

const CaseManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isModerator, user } = useAuth();

  // State
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [selectedCases, setSelectedCases] = useState([]);
  const [previewCase, setPreviewCase] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportSelectedMenu, setShowExportSelectedMenu] = useState(false);

  // Read initial type from URL params (e.g. /moderator/cases?type=memory)
  const initialType = searchParams.get('type') || 'all';

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    yearFrom: '',
    yearTo: '',
    district: '',
    status: 'all',
    type: initialType,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  // Fetch cases
  useEffect(() => {
    if (isModerator) {
      fetchCases();
    }
  }, [isModerator, filters, pagination.page, pagination.pageSize]);

  // Close export menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-dropdown')) {
        setShowExportMenu(false);
      }
      if (showExportSelectedMenu && !event.target.closest('.export-selected-dropdown')) {
        setShowExportSelectedMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu, showExportSelectedMenu]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: pagination.page,
        pageSize: pagination.pageSize
      };

      // Remove empty filters; keep status='all' so backend returns both draft and published
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
        else if (params[key] === 'all' && key !== 'status') delete params[key];
      });

      const response = await casesAPI.getAll(params);
      setCases(response.data.cases);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.totalPages
      }));
    } catch (error) {
      console.error('Error fetching cases:', error);
      alert(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      yearFrom: '',
      yearTo: '',
      district: '',
      status: 'all',
      type: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectCase = (caseId) => {
    setSelectedCases(prev =>
      prev.includes(caseId)
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCases.length === cases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(cases.map(c => c._id));
    }
  };

  const handlePreview = (caseItem) => {
    setPreviewCase(caseItem);
  };

  const handleEdit = (caseId, caseType) => {
    if (caseType === 'memory') {
      navigate(`/moderator/edit-memory/${caseId}`);
    } else {
      navigate(`/moderator/edit-case/${caseId}`);
    }
  };

  const handleDelete = async (caseItem) => {
    const displayTitle = caseItem.type === 'memory' ? (caseItem.personName || caseItem.title) : caseItem.title;
    if (window.confirm(`${t('moderator.confirmDelete')} "${displayTitle}"?`)) {
      try {
        await casesAPI.delete(caseItem._id);
        fetchCases();
        setSelectedCases(prev => prev.filter(id => id !== caseItem._id));
      } catch (error) {
        console.error('Error deleting case:', error);
        alert(t('common.error'));
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCases.length === 0) {
      alert(t('moderator.noCasesSelected'));
      return;
    }

    if (window.confirm(t('moderator.confirmDeleteMultiple'))) {
      try {
        await casesAPI.bulkDelete(selectedCases);
        fetchCases();
        setSelectedCases([]);
      } catch (error) {
        console.error('Error bulk deleting cases:', error);
        alert(t('common.error'));
      }
    }
  };

  const handleStatusChange = async (caseItem) => {
    const newStatus = caseItem.status === 'published' ? 'draft' : 'published';
    try {
      await casesAPI.updateStatus(caseItem._id, newStatus);
      fetchCases();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(t('common.error'));
    }
  };

  const handleExport = (format) => {
    switch (format) {
      case 'xlsx':
        exportToXLSX(cases);
        break;
      case 'json':
        exportToJSON(cases);
        break;
      default:
        exportToCSV(cases);
    }
    setShowExportMenu(false);
  };

  const handleExportSelected = (format) => {
    if (selectedCases.length === 0) {
      alert(t('moderator.noCasesSelected'));
      return;
    }
    exportSelected(cases, selectedCases, format);
    setShowExportSelectedMenu(false);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isModerator) {
    return (
      <div className="case-management-page">
        <div className="container">
          <div className="empty-state">{t('moderator.accessDenied')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="case-management-page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {/* Back to moderator panel */}
          <Link to="/moderator" className="back-to-moderator">
            <ArrowLeft size={20} />
            {t('moderator.backToDashboard')}
          </Link>

          {/* Header - title: Істерді басқару / Естеліктерді басқару / Барлығын басқару */}
          <div className="page-header">
            <div className="header-left">
              <h1>
                {filters.type === 'case'
                  ? t('moderator.manageCases')
                  : filters.type === 'memory'
                    ? t('moderator.manageMemories')
                    : t('moderator.manageAll')}
              </h1>
              <span className="cases-count">
                {pagination.total}{' '}
                {filters.type === 'case'
                  ? t('moderator.totalCases').toLowerCase()
                  : filters.type === 'memory'
                    ? t('moderator.totalMemories').toLowerCase()
                    : t('moderator.totalEntries')}
              </span>
            </div>
            <div className="header-actions">
              <button
                className="btn btn-add-case"
                onClick={() => navigate('/moderator/add-case')}
              >
                <PlusCircle size={20} />
                {t('moderator.addCase')}
              </button>
              <button
                className="btn btn-add-memory"
                onClick={() => navigate('/moderator/add-memory')}
              >
                <PlusCircle size={20} />
                {t('moderator.addMemory')}
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="toolbar-left">
              {/* Search */}
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder={t('hero.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                {filters.search && (
                  <button
                    className="clear-search"
                    onClick={() => handleFilterChange('search', '')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Filter Toggle */}
              <button
                className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <FunnelFill size={18} />
                {t('moderator.filterBy')}
              </button>
            </div>

            <div className="toolbar-right">
              {/* View Mode Toggle */}
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title={t('moderator.table')}
                >
                  <ListUl size={20} />
                </button>
                <button
                  className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                  onClick={() => setViewMode('cards')}
                  title={t('moderator.cards')}
                >
                  <Grid3x3GapFill size={20} />
                </button>
              </div>

              {/* Export Dropdown */}
              <div className="export-dropdown">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <Download size={18} />
                  {t('moderator.export')}
                </button>
                {showExportMenu && (
                  <div className="export-menu">
                    <button onClick={() => handleExport('csv')}>
                      CSV
                    </button>
                    <button onClick={() => handleExport('xlsx')}>
                      Excel (XLSX)
                    </button>
                    <button onClick={() => handleExport('json')}>
                      JSON
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="filters-panel">
              <div className="filters-grid">
                <div className="filter-group">
                  <label>{t('form.year')} ({t('filters.yearFrom')})</label>
                  <input
                    type="number"
                    min="1900"
                    max="2000"
                    value={filters.yearFrom}
                    onChange={(e) => handleFilterChange('yearFrom', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label>{t('form.year')} ({t('filters.yearTo')})</label>
                  <input
                    type="number"
                    min="1900"
                    max="2000"
                    value={filters.yearTo}
                    onChange={(e) => handleFilterChange('yearTo', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label>{t('form.district')}</label>
                  <input
                    type="text"
                    value={filters.district}
                    onChange={(e) => handleFilterChange('district', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label>{t('moderator.status')}</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="all">{t('moderator.allCases')}</option>
                    <option value="published">{t('moderator.published')}</option>
                    <option value="draft">{t('moderator.draft')}</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>{t('moderator.typeLabel')}</label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <option value="all">{t('moderator.typeAll')}</option>
                    <option value="case">{t('moderator.typeCase')}</option>
                    <option value="memory">{t('moderator.typeMemory')}</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>{t('moderator.sortBy')}</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  >
                    <option value="createdAt">{t('moderator.createdAt')}</option>
                    <option value="title">{t('moderator.title')}</option>
                    <option value="year">{t('moderator.year')}</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>{t('common.order')}</label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  >
                    <option value="desc">{t('common.descending')}</option>
                    <option value="asc">{t('common.ascending')}</option>
                  </select>
                </div>
              </div>

              <button className="btn btn-secondary" onClick={handleResetFilters}>
                {t('filters.reset')}
              </button>
            </div>
          )}

          {/* Bulk Actions Bar */}
          {selectedCases.length > 0 && (
            <div className="bulk-actions-bar">
              <span className="selected-count">
                {selectedCases.length} {t('moderator.casesSelected')}
              </span>
              <div className="bulk-actions">
                <div className="export-selected-dropdown">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowExportSelectedMenu(!showExportSelectedMenu)}
                  >
                    <Download size={18} />
                    {t('moderator.exportSelected')}
                  </button>
                  {showExportSelectedMenu && (
                    <div className="export-menu">
                      <button onClick={() => handleExportSelected('csv')}>
                        CSV
                      </button>
                      <button onClick={() => handleExportSelected('xlsx')}>
                        Excel (XLSX)
                      </button>
                      <button onClick={() => handleExportSelected('json')}>
                        JSON
                      </button>
                    </div>
                  )}
                </div>
                <button className="btn btn-danger" onClick={handleBulkDelete}>
                  <Trash size={18} />
                  {t('moderator.deleteSelected')}
                </button>
              </div>
            </div>
          )}

          {/* Cases List */}
          {loading ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : viewMode === 'table' ? (
            <CasesTable
              cases={cases}
              selectedCases={selectedCases}
              onSelectCase={handleSelectCase}
              onSelectAll={handleSelectAll}
              onPreview={handlePreview}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <CasesGrid
              cases={cases}
              selectedCases={selectedCases}
              onSelectCase={handleSelectCase}
              onPreview={handlePreview}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          )}

          {/* Pagination */}
          {!loading && cases.length > 0 && pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                {t('common.previous')}
              </button>

              <span className="page-info">
                {t('common.page')} {pagination.page} {t('common.of')} {pagination.totalPages}
              </span>

              <button
                className="btn btn-secondary"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Preview Modal */}
      <CasePreviewModal
        caseData={previewCase}
        isOpen={!!previewCase}
        onClose={() => setPreviewCase(null)}
      />
    </div>
  );
};

export default CaseManagement;
