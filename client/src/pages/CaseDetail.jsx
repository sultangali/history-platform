import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  GeoAlt,
  People,
  ExclamationTriangle
} from 'react-bootstrap-icons';
import { casesAPI, suggestionsAPI } from '../services/api';
import './CaseDetail.css';

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestion, setSuggestion] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCase();
  }, [id]);

  const fetchCase = async () => {
    setLoading(true);
    try {
      const response = await casesAPI.getById(id);
      setCaseData(response.data);
    } catch (error) {
      console.error('Error fetching case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSuggestion = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await suggestionsAPI.create({
        caseId: id,
        subject: suggestion.subject,
        message: suggestion.message
      });
      alert(t('feedback.thankYou'));
      setShowSuggestionForm(false);
      setSuggestion({ subject: '', message: '' });
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      alert(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="case-detail-page">
        <div className="container">
          <div className="loading-state">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="case-detail-page">
        <div className="container">
          <div className="empty-state">Case not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="case-detail-page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <button onClick={() => navigate(-1)} className="btn-back">
            <ArrowLeft size={20} />
            {t('caseDetail.backToArchive')}
          </button>

          <div className="case-detail-card card">
            <div className="case-detail-header">
              <h1>{caseData.title || t('cases.caseNumber') + caseData.caseNumber}</h1>
            </div>

            <div className="case-detail-body">
              <div className="case-meta">
                {caseData.location && (
                  <div className="meta-item">
                    <GeoAlt size={20} />
                    <div>
                      <strong>{t('cases.location')}</strong>
                      <p>{caseData.location}</p>
                      {caseData.district && <p className="text-muted">{caseData.district}</p>}
                      {caseData.region && <p className="text-muted">{caseData.region}</p>}
                    </div>
                  </div>
                )}

                {(caseData.dateFrom || caseData.dateTo) && (
                  <div className="meta-item">
                    <Calendar size={20} />
                    <div>
                      <strong>{t('cases.date')}</strong>
                      <p>
                        {formatDate(caseData.dateFrom)}
                        {caseData.dateTo && ` - ${formatDate(caseData.dateTo)}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {caseData.victims && caseData.victims.length > 0 && (
                <div className="case-section">
                  <h2>
                    <People size={24} />
                    {t('cases.victims')}
                  </h2>
                  <ul className="victims-list">
                    {caseData.victims.map((victim, index) => (
                      <li key={index} className="victim-item">
                        {victim}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {caseData.description && (
                <div className="case-section">
                  <h2>{t('cases.description')}</h2>
                  <div className="case-description">{caseData.description}</div>
                </div>
              )}

              {caseData.documents && caseData.documents.length > 0 && (
                <div className="case-section">
                  <h2>{t('caseDetail.documents')}</h2>
                  <div className="documents-list">
                    {caseData.documents.map((doc, index) => (
                      <div key={index} className="document-item">
                        {doc.name || `Document ${index + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="case-detail-footer">
              <button
                onClick={() => setShowSuggestionForm(!showSuggestionForm)}
                className="btn btn-secondary"
              >
                <ExclamationTriangle size={16} />
                {t('caseDetail.suggestEdit')}
              </button>
            </div>

            {showSuggestionForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="suggestion-form card"
              >
                <h3>{t('caseDetail.suggestEdit')}</h3>
                <form onSubmit={handleSubmitSuggestion}>
                  <div className="input-group">
                    <label>{t('feedback.subject')}</label>
                    <input
                      type="text"
                      value={suggestion.subject}
                      onChange={(e) =>
                        setSuggestion({ ...suggestion, subject: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>{t('feedback.message')}</label>
                    <textarea
                      rows="4"
                      value={suggestion.message}
                      onChange={(e) =>
                        setSuggestion({ ...suggestion, message: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? t('common.loading') : t('form.submit')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowSuggestionForm(false)}
                    >
                      {t('form.cancel')}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CaseDetail;

