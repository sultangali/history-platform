import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { EnvelopeAt, ChatLeftText } from 'react-bootstrap-icons';
import { feedbackAPI } from '../services/api';
import './Contact.css';

const Contact = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    email: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await feedbackAPI.create(formData);
      setSubmitted(true);
      setFormData({ subject: '', message: '', email: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="contact-content"
        >
          <div className="contact-header">
            <h1>{t('feedback.title')}</h1>
            <p className="text-muted">
              We appreciate your feedback and suggestions to improve our archive.
            </p>
          </div>

          <div className="contact-grid">
            <div className="contact-info">
              <div className="info-card card">
                <EnvelopeAt size={32} className="info-icon" />
                <h3>Email</h3>
                <p>archive@karaganda.kz</p>
              </div>

              <div className="info-card card">
                <ChatLeftText size={32} className="info-icon" />
                <h3>{t('feedback.title')}</h3>
                <p>
                  Share your thoughts, report errors, or suggest improvements to our
                  database.
                </p>
              </div>
            </div>

            <div className="contact-form-wrapper card">
              {submitted && (
                <div className="success-message">{t('feedback.thankYou')}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>{t('auth.email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="input-group">
                  <label>{t('feedback.subject')}</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="input-group">
                  <label>{t('feedback.message')}</label>
                  <textarea
                    rows="6"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? t('common.loading') : t('feedback.send')}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;

