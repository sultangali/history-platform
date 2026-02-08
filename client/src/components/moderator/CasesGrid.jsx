import { useTranslation } from 'react-i18next';
import { 
  Eye, 
  Pencil, 
  Trash, 
  Calendar, 
  GeoAlt,
  FileText,
  CheckCircleFill
} from 'react-bootstrap-icons';
import './CasesGrid.css';

const CasesGrid = ({ 
  cases, 
  selectedCases, 
  onSelectCase, 
  onPreview, 
  onEdit, 
  onDelete,
  onStatusChange 
}) => {
  const { t } = useTranslation();

  const formatDate = (dateString) => {
    if (!dateString) return t('caseDetail.notAvailable');
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const statusClass = status === 'published' ? 'badge-success' : 'badge-warning';
    return (
      <span className={`badge ${statusClass}`}>
        {t(`moderator.${status}`)}
      </span>
    );
  };

  if (cases.length === 0) {
    return (
      <div className="empty-state">
        <FileText size={48} />
        <p>{t('moderator.noResults')}</p>
      </div>
    );
  }

  return (
    <div className="cases-grid">
      {cases.map((caseItem, index) => {
        const isSelected = selectedCases.includes(caseItem._id);
        
        return (
          <div
            key={caseItem._id}
            className={`case-grid-card ${isSelected ? 'selected' : ''}`}
          >
            {/* Selection Checkbox */}
            <div className="card-selection">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelectCase(caseItem._id)}
                className="selection-checkbox"
              />
              {isSelected && (
                <div className="selection-indicator">
                  <CheckCircleFill size={20} />
                </div>
              )}
            </div>

            {/* Status Badge */}
            <button
              className="status-badge-btn"
              onClick={() => onStatusChange(caseItem)}
            >
              {getStatusBadge(caseItem.status)}
            </button>

            {/* Card Content */}
            <div className="card-content" onClick={() => onPreview(caseItem)}>
              <h3 className="card-title">{caseItem.title}</h3>

              {caseItem.caseNumber && (
                <div className="card-meta">
                  <FileText size={16} />
                  <span>{caseItem.caseNumber}</span>
                </div>
              )}

              {(caseItem.location || caseItem.district) && (
                <div className="card-meta">
                  <GeoAlt size={16} />
                  <span>
                    {[caseItem.location, caseItem.district]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}

              {caseItem.year && (
                <div className="card-meta">
                  <Calendar size={16} />
                  <span>{caseItem.year}</span>
                </div>
              )}

              {caseItem.description && (
                <p className="card-description">
                  {caseItem.description.length > 150
                    ? `${caseItem.description.substring(0, 150)}...`
                    : caseItem.description}
                </p>
              )}

              {caseItem.victims && caseItem.victims.length > 0 && (
                <div className="card-victims">
                  <span className="victims-count">
                    {caseItem.victims.length} {t('cases.victims').toLowerCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="card-footer">
              <span className="card-date">
                {formatDate(caseItem.createdAt)}
              </span>
              <div className="card-actions">
                <button
                  className="btn-action btn-preview"
                  onClick={() => onPreview(caseItem)}
                  title={t('moderator.preview')}
                >
                  <Eye size={18} />
                </button>
                <button
                  className="btn-action btn-edit"
                  onClick={() => onEdit(caseItem._id)}
                  title={t('common.edit')}
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="btn-action btn-delete"
                  onClick={() => onDelete(caseItem)}
                  title={t('common.delete')}
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CasesGrid;
