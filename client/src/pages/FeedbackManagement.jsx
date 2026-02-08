import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Eye, Trash, Reply, CheckCircle } from 'react-bootstrap-icons';
import { feedbackAPI } from '../services/api';
import './FeedbackManagement.css';

const FeedbackManagement = () => {
  const { t } = useTranslation();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, [filter]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const response = await feedbackAPI.getAll();
      let filtered = response.data;
      
      if (filter === 'unread') {
        filtered = filtered.filter(f => !f.isRead);
      } else if (filter === 'read') {
        filtered = filtered.filter(f => f.isRead);
      }
      
      setFeedbacks(filtered);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await feedbackAPI.markAsRead(id);
      fetchFeedbacks();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('moderator.confirmDelete'))) {
      try {
        await feedbackAPI.delete(id);
        fetchFeedbacks();
        if (showModal) {
          setShowModal(false);
        }
      } catch (error) {
        console.error('Error deleting feedback:', error);
        alert(t('common.error'));
      }
    }
  };

  const openModal = async (feedback) => {
    setSelectedFeedback(feedback);
    setShowModal(true);
    setReplyText('');
    
    // Mark as read when opened
    if (!feedback.isRead) {
      await markAsRead(feedback._id);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      alert(t('moderator.pleaseEnterReply'));
      return;
    }

    setSending(true);
    try {
      await feedbackAPI.reply(selectedFeedback._id, replyText);
      alert(t('moderator.replySent'));
      setReplyText('');
      fetchFeedbacks();
      setShowModal(false);
    } catch (error) {
      console.error('Error sending reply:', error);
      alert(t('common.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="feedback-management-page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="page-header">
            <h1>{t('moderator.complaints')}</h1>
            <p className="subtitle">{t('moderator.manageFeedback')}</p>
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
                className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                {t('moderator.unread')}
              </button>
              <button
                className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
                onClick={() => setFilter('read')}
              >
                {t('moderator.read')}
              </button>
            </div>
          </div>

          {/* Feedbacks List */}
          {loading ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : feedbacks.length === 0 ? (
            <div className="empty-state">
              {t('moderator.noFeedback')}
            </div>
          ) : (
            <div className="feedbacks-list">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback._id}
                  className={`feedback-card card ${!feedback.isRead ? 'unread' : ''}`}
                >
                  <div className="feedback-header">
                    <div className="feedback-info">
                      <h3>{feedback.name}</h3>
                      {!feedback.isRead && (
                        <span className="badge badge-warning">{t('moderator.new')}</span>
                      )}
                    </div>
                    <div className="feedback-meta">
                      <span className="date">
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="feedback-content">
                    <p className="message">{feedback.message}</p>
                    {feedback.email && (
                      <p className="contact-info">
                        <strong>{t('form.email')}:</strong> {feedback.email}
                      </p>
                    )}
                    {feedback.replied && (
                      <div className="reply-indicator">
                        <CheckCircle size={16} />
                        {t('moderator.replied')}
                      </div>
                    )}
                  </div>

                  <div className="feedback-actions">
                    <button
                      onClick={() => openModal(feedback)}
                      className="btn-action btn-view"
                      title={t('common.view')}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => openModal(feedback)}
                      className="btn-action btn-reply"
                      title={t('moderator.reply')}
                    >
                      <Reply size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(feedback._id)}
                      className="btn-action btn-delete"
                      title={t('common.delete')}
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal */}
      {showModal && selectedFeedback && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <motion.div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <div className="modal-header">
              <h2>{t('moderator.feedbackDetails')}</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>{t('form.name')}:</strong>
                <p>{selectedFeedback.name || selectedFeedback.subject || '—'}</p>
              </div>
              <div className="detail-row">
                <strong>{t('form.email')}:</strong>
                <p>{selectedFeedback.email || '—'}</p>
              </div>
              <div className="detail-row">
                <strong>{t('form.message')}:</strong>
                <p>{selectedFeedback.message || '—'}</p>
              </div>
              <div className="detail-row">
                <strong>{t('moderator.createdAt')}:</strong>
                <p>{selectedFeedback.createdAt ? new Date(selectedFeedback.createdAt).toLocaleString() : '—'}</p>
              </div>

              {/* Reply Form */}
              <div className="reply-section">
                <h3>{t('moderator.sendReply')}</h3>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t('moderator.typeYourReply')}
                  rows="5"
                  className="reply-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={handleSendReply}
                className="btn btn-primary"
                disabled={sending || !replyText.trim()}
              >
                <Reply size={18} />
                {sending ? t('common.sending') : t('moderator.sendReply')}
              </button>
              <button
                onClick={() => handleDelete(selectedFeedback._id)}
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

export default FeedbackManagement;
