import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Trash } from 'react-bootstrap-icons';
import { casesAPI } from '../../services/api';
import './CaseForm.css';

const MemoryForm = ({ isEdit = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    personName: '',
    description: '',
    location: '',
    district: '',
    region: '',
    dateFrom: '',
    dateTo: '',
    year: '',
    victims: [''],
    status: 'published'
  });

  useEffect(() => {
    if (isEdit && id) {
      fetchMemory();
    }
  }, [isEdit, id]);

  const fetchMemory = async () => {
    try {
      const response = await casesAPI.getById(id);
      const data = response.data;
      setFormData({
        personName: data.personName || '',
        description: data.description || '',
        location: data.location || '',
        district: data.district || '',
        region: data.region || '',
        dateFrom: data.dateFrom ? data.dateFrom.split('T')[0] : '',
        dateTo: data.dateTo ? data.dateTo.split('T')[0] : '',
        year: data.year || '',
        victims: data.victims || [''],
        status: data.status || 'published'
      });
    } catch (error) {
      console.error('Error fetching memory:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        type: 'memory',
        title: formData.personName,
        victims: formData.victims.filter((v) => v.trim() !== '')
      };

      if (isEdit) {
        await casesAPI.update(id, data);
      } else {
        await casesAPI.create(data);
      }

      alert(t('common.success'));
      navigate('/moderator');
    } catch (error) {
      console.error('Error saving memory:', error);
      alert(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleVictimChange = (index, value) => {
    const newVictims = [...formData.victims];
    newVictims[index] = value;
    setFormData({ ...formData, victims: newVictims });
  };

  const addVictim = () => {
    setFormData({ ...formData, victims: [...formData.victims, ''] });
  };

  const removeVictim = (index) => {
    const newVictims = formData.victims.filter((_, i) => i !== index);
    setFormData({ ...formData, victims: newVictims });
  };

  return (
    <div className="case-form-page">
      <div className="container">
        <div className="case-form-card card">
          <h1>{isEdit ? t('moderator.editMemory') : t('moderator.addMemory')}</h1>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="input-group full-width">
                <label>
                  {t('moderator.personName')} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.personName}
                  onChange={(e) => handleChange('personName', e.target.value)}
                  placeholder={t('moderator.personNamePlaceholder')}
                  required
                />
              </div>

              <div className="input-group full-width">
                <label>
                  {t('moderator.memoryDescription')} <span className="required">*</span>
                </label>
                <textarea
                  rows="6"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>{t('form.location')}</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>{t('form.district')}</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>{t('form.region')}</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => handleChange('region', e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>{t('form.year')}</label>
                <input
                  type="number"
                  min="1900"
                  max="2000"
                  value={formData.year}
                  onChange={(e) => handleChange('year', e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>{t('form.dateFrom')}</label>
                <input
                  type="date"
                  value={formData.dateFrom}
                  onChange={(e) => handleChange('dateFrom', e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>{t('form.dateTo')}</label>
                <input
                  type="date"
                  value={formData.dateTo}
                  onChange={(e) => handleChange('dateTo', e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>
                  {t('moderator.status')} <span className="required">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  required
                >
                  <option value="published">{t('moderator.published')}</option>
                  <option value="draft">{t('moderator.draft')}</option>
                </select>
              </div>
            </div>

            {/* Victims Section */}
            <div className="victims-section">
              <div className="section-header">
                <h3>{t('form.victims')}</h3>
                <button type="button" onClick={addVictim} className="btn btn-secondary btn-sm">
                  <PlusCircle size={16} />
                  {t('form.addVictim')}
                </button>
              </div>

              <div className="victims-list">
                {formData.victims.map((victim, index) => (
                  <div key={index} className="victim-input-group">
                    <input
                      type="text"
                      placeholder={t('form.fullName')}
                      value={victim}
                      onChange={(e) => handleVictimChange(index, e.target.value)}
                    />
                    {formData.victims.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVictim(index)}
                        className="btn-remove"
                      >
                        <Trash size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('common.loading') : t('form.save')}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-secondary"
              >
                {t('form.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MemoryForm;
