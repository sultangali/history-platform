import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, GeoAlt, People } from 'react-bootstrap-icons';
import './CaseCard.css';

const CaseCard = ({ caseData }) => {
  const { t } = useTranslation();

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="case-card card">
      <div className="case-card-header">
        <h3>{caseData.title || t('cases.caseNumber') + caseData.caseNumber}</h3>
      </div>

      <div className="case-card-body">
        {caseData.location && (
          <div className="case-info-item">
            <GeoAlt size={16} />
            <span>{caseData.location}</span>
          </div>
        )}

        {(caseData.dateFrom || caseData.dateTo) && (
          <div className="case-info-item">
            <Calendar size={16} />
            <span>
              {formatDate(caseData.dateFrom)}
              {caseData.dateTo && ` - ${formatDate(caseData.dateTo)}`}
            </span>
          </div>
        )}

        {caseData.victims && caseData.victims.length > 0 && (
          <div className="case-info-item">
            <People size={16} />
            <span>{caseData.victims.length} {t('cases.victims').toLowerCase()}</span>
          </div>
        )}

        {caseData.description && (
          <p className="case-description">
            {caseData.description.length > 150
              ? `${caseData.description.substring(0, 150)}...`
              : caseData.description}
          </p>
        )}
      </div>

      <div className="case-card-footer">
        <Link to={`/cases/${caseData._id}`} className="btn btn-secondary">
          {t('cases.viewDetails')}
        </Link>
      </div>
    </div>
  );
};

export default CaseCard;

