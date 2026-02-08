import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Trash, CheckCircle, Circle } from 'react-bootstrap-icons';
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
            <th>{t('cases.caseNumber')}</th>
            <th>{t('form.year')}</th>
            <th>{t('form.district')}</th>
            <th>{t('moderator.status')}</th>
            <th>{t('moderator.createdAt')}</th>
            <th className="actions-col">{t('moderator.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {cases.length === 0 ? (
            <tr>
              <td colSpan="8" className="empty-state">
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
                  <span className="case-title">{caseItem.title}</span>
                </td>
                <td>{caseItem.caseNumber || '-'}</td>
                <td>{caseItem.year || '-'}</td>
                <td>{caseItem.district || '-'}</td>
                <td>
                  <button
                    className="status-badge-btn"
                    onClick={() => onStatusChange(caseItem)}
                    title={t('moderator.changeStatus')}
                  >
                    {getStatusBadge(caseItem.status)}
                  </button>
                </td>
                <td className="date-col">{formatDate(caseItem.createdAt)}</td>
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
