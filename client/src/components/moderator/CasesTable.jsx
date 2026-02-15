import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Trash, CheckCircle, Circle } from 'react-bootstrap-icons';
import { formatDate } from '../../utils/dateFormat';
import './CasesTable.css';

const CasesTable = ({ 
  cases, 
  selectedCases, 
  onSelectCase, 
  onSelectAll, 
  onPreview, 
  onEdit, 
  onDelete,
  onStatusChange 
}) => {
  const { t } = useTranslation();

  const getStatusBadge = (status) => {
    const value = status || 'published';
    const statusClass = value === 'published' ? 'badge-success' : 'badge-warning';
    return (
      <span className={`badge ${statusClass}`}>
        {t(`moderator.${value}`)}
      </span>
    );
  };

  const allSelected = cases.length > 0 && selectedCases.length === cases.length;
  const someSelected = selectedCases.length > 0 && !allSelected;

  return (
    <div className="cases-table-wrapper">
      <table className="cases-table">
        <thead>
          <tr>
            <th className="checkbox-col">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={onSelectAll}
              />
            </th>
            <th>{t('form.caseTitle')}</th>
            <th>{t('moderator.typeLabel')}</th>
            <th>{t('cases.caseNumber')}</th>
            <th>{t('form.year')}</th>
            <th>{t('form.district')}</th>
            <th>{t('moderator.createdBy')}</th>
            <th>{t('moderator.status')}</th>
            <th>{t('moderator.createdAt')}</th>
            <th className="actions-col">{t('moderator.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {cases.length === 0 ? (
            <tr>
              <td colSpan="10" className="empty-state">
                {t('moderator.noResults')}
              </td>
            </tr>
          ) : (
            cases.map((caseItem) => (
              <tr key={caseItem._id}>
                <td className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedCases.includes(caseItem._id)}
                    onChange={() => onSelectCase(caseItem._id)}
                  />
                </td>
                <td className="title-col">
                  <span className="case-title">
                    {caseItem.type === 'memory' ? (caseItem.personName || caseItem.title) : caseItem.title}
                  </span>
                </td>
                <td>
                  <span className={`badge ${caseItem.type === 'memory' ? 'badge-accent' : 'badge-info'}`}>
                    {t(`moderator.${caseItem.type === 'memory' ? 'typeMemory' : 'typeCase'}`)}
                  </span>
                </td>
                <td>{caseItem.caseNumber || '-'}</td>
                <td>{caseItem.year || '-'}</td>
                <td className="district-col">{caseItem.district || '-'}</td>
                <td className="creator-col">
                  {caseItem.createdBy?.fullName || t('caseDetail.notAvailable')}
                </td>
                <td>{getStatusBadge(caseItem.status ?? 'published')}</td>
                <td className="date-col">{caseItem.createdAt ? formatDate(caseItem.createdAt) : t('caseDetail.notAvailable')}</td>
                <td className="actions-col">
                  <div className="action-buttons">
                    <button
                      className="btn-action btn-preview"
                      onClick={() => onPreview(caseItem)}
                      title={t('moderator.preview')}
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      className="btn-action btn-edit"
                      onClick={() => onEdit(caseItem._id, caseItem.type)}
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
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CasesTable;
