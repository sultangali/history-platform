import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Eye, Trash, ArrowLeft } from 'react-bootstrap-icons';
import { suggestionsAPI } from '../services/api';
import { formatDate, formatDateTime } from '../utils/dateFormat';
import './SuggestionsManagement.css';

const SuggestionsManagement = () => {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, [filter]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await suggestionsAPI.getAll();
      let filtered = response.data;
      
      if (filter !== 'all') {
        filtered = filtered.filter(s => s.status === filter);
      }
      
      setSuggestions(filtered);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    try {
      await suggestionsAPI.update(id, status);
      fetchSuggestions();
      if (showModal) {
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error updating suggestion:', error);
      alert(t('common.error'));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('moderator.confirmDelete'))) {
      try {
        await suggestionsAPI.delete(id);
        fetchSuggestions();
        if (showModal) {
          setShowModal(false);
        }
      } catch (error) {
        console.error('Error deleting suggestion:', error);
        alert(t('common.error'));
      }
    }
  };

  const openModal = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-warning', text: t('moderator.pending') },
      approved: { class: 'badge-success', text: t('moderator.approved') },
      rejected: { class: 'badge-danger', text: t('moderator.rejected') }
    };
    return badges[status] || badges.pending;
  };

  return (
    <div className="suggestions-management-page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <Link to="/moderator" className="back-to-moderator">
            <ArrowLeft size={20} />
            {t('moderator.backToDashboard')}
          </Link>

          <div className="page-header">
            <h1>{t('moderator.suggestions')}</h1>
            <p className="subtitle">{t('moderator.manageSuggestions')}</p>
          </div>

          {/* Filters */}
          <div className="filters-bar">
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                {t('moderator.all')}
              </button>
              <button
                className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                onClick={() => setFilter('pending')}
              >
                {t('moderator.pending')}
              </button>
              <button
                className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
                onClick={() => setFilter('approved')}
              >
                {t('moderator.approved')}
              </button>
              <button
                className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
                onClick={() => setFilter('rejected')}
              >
                {t('moderator.rejected')}
              </button>
            </div>
          </div>

          {/* Suggestions List */}
          {loading ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : suggestions.length === 0 ? (
            <div className="empty-state">
              {t('moderator.noSuggestions')}
            </div>
          ) : (
            <div className="suggestions-list">
              {suggestions.map((suggestion) => {
                const badge = getStatusBadge(suggestion.status);
                return (
                  <div key={suggestion._id} className="suggestion-card card">
                    <div className="suggestion-header">
                      <div className="suggestion-info">
                        <h3>{suggestion.subject || suggestion.title}</h3>
                        <span className={`badge ${badge.class}`}>{badge.text}</span>
                      </div>
                      <div className="suggestion-meta">
                        <span className="date">
                          {suggestion.createdAt && formatDate(suggestion.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="suggestion-content">
                      <p className="description">{suggestion.message || suggestion.description}</p>
                      {(suggestion.submittedBy || suggestion.email) && (
                        <p className="contact-info">
                          <strong>{t('moderator.submittedBy')}:</strong> {suggestion.submittedBy || suggestion.email}
                        </p>
                      )}
                    </div>

                    <div className="suggestion-actions">
                      <button
                        onClick={() => openModal(suggestion)}
                        className="btn-action btn-view"
                        title={t('common.view')}
                      >
                        <Eye size={18} />
                      </button>
                      {suggestion.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAction(suggestion._id, 'approved')}
                            className="btn-action btn-approve"
                            title={t('moderator.approve')}
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleAction(suggestion._id, 'rejected')}
                            className="btn-action btn-reject"
                            title={t('moderator.reject')}
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(suggestion._id)}
                        className="btn-action btn-delete"
                        title={t('common.delete')}
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal */}
      {showModal && selectedSuggestion && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <motion.div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <div className="modal-header">
              <h2>{selectedSuggestion.subject || selectedSuggestion.title}</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>{t('moderator.status')}:</strong>
                <span className={`badge ${getStatusBadge(selectedSuggestion.status).class}`}>
                  {getStatusBadge(selectedSuggestion.status).text}
                </span>
              </div>
              <div className="detail-row">
                <strong>{t('feedback.message')}:</strong>
                <p>{selectedSuggestion.message || selectedSuggestion.description || '-'}</p>
              </div>
              {(selectedSuggestion.submittedBy || selectedSuggestion.email) && (
                <div className="detail-row">
                  <strong>{t('moderator.submittedBy')}:</strong>
                  <p>{selectedSuggestion.submittedBy || selectedSuggestion.email}</p>
                </div>
              )}
              <div className="detail-row">
                <strong>{t('moderator.createdAt')}:</strong>
                <p>{selectedSuggestion.createdAt ? formatDateTime(selectedSuggestion.createdAt) : '-'}</p>
              </div>
            </div>
            <div className="modal-footer">
              {selectedSuggestion.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleAction(selectedSuggestion._id, 'approved')}
                    className="btn btn-success"
                  >
                    <CheckCircle size={18} />
                    {t('moderator.approve')}
                  </button>
                  <button
                    onClick={() => handleAction(selectedSuggestion._id, 'rejected')}
                    className="btn btn-danger"
                  >
                    <XCircle size={18} />
                    {t('moderator.reject')}
                  </button>
                </>
              )}
              <button
                onClick={() => handleDelete(selectedSuggestion._id)}
                className="btn btn-outline"
              >
                <Trash size={18} />
                {t('common.delete')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SuggestionsManagement;
