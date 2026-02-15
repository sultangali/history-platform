import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  GeoAlt, 
  FileText, 
  People,
  Pencil
} from 'react-bootstrap-icons';
import { formatDate } from '../../utils/dateFormat';
import './CasePreviewModal.css';

const CasePreviewModal = ({ caseData, isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!caseData) return null;

  const handleEdit = () => {
    navigate(`/moderator/edit-case/${caseData._id}`);
    onClose();
  };

  const getStatusBadge = (status) => {
    const statusClass = status === 'published' ? 'badge-success' : 'badge-warning';
    return (
      <span className={`badge ${statusClass}`}>
        {t(`moderator.${status}`)}
      </span>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div
            className="preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="preview-modal-header">
              <div className="header-content">
                <h2>{caseData.title}</h2>
                {getStatusBadge(caseData.status)}
              </div>
              <button className="close-btn" onClick={onClose}>
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="preview-modal-body">
              {/* Case Number */}
              {caseData.caseNumber && (
                <div className="info-row">
                  <FileText size={20} className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">{t('cases.caseNumber')}:</span>
                    <span className="info-value">{caseData.caseNumber}</span>
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="info-row">
                <GeoAlt size={20} className="info-icon" />
                <div className="info-content">
                  <span className="info-label">{t('form.location')}:</span>
                  <span className="info-value">
                    {[caseData.location, caseData.district, caseData.region]
                      .filter(Boolean)
                      .join(', ') || t('caseDetail.notAvailable')}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="info-row">
                <Calendar size={20} className="info-icon" />
                <div className="info-content">
                  <span className="info-label">{t('cases.date')}:</span>
                  <span className="info-value">
                    {caseData.year || formatDate(caseData.dateFrom)}
                    {caseData.dateTo && ` — ${formatDate(caseData.dateTo)}`}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="description-section">
                <h3>{t('cases.description')}</h3>
                <p>{caseData.description}</p>
              </div>

              {/* Victims */}
              {caseData.victims && caseData.victims.length > 0 && (
                <div className="victims-section">
                  <div className="section-header">
                    <People size={20} />
                    <h3>{t('form.victims')}</h3>
                  </div>
                  <ul className="victims-list">
                    {caseData.victims.map((victim, index) => (
                      <li key={index}>{victim}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Created By */}
              {caseData.createdBy && (
                <div className="meta-info">
                  <span className="text-muted">
                    {t('common.created')}: {caseData.createdBy.fullName || caseData.createdBy.email}
                  </span>
                  <span className="text-muted">
                    {caseData.createdAt ? formatDate(caseData.createdAt) : t('caseDetail.notAvailable')}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="preview-modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                {t('common.close')}
              </button>
              <button className="btn btn-primary" onClick={handleEdit}>
                <Pencil size={18} />
                {t('common.edit')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CasePreviewModal;
