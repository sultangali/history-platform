import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card card">
          <h2 className="text-center">{t('auth.loginTitle')}</h2>

          {error && <div className="error-message">{error}</div>}

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
              <label>{t('auth.password')}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('common.loading') : t('auth.login')}
            </button>
          </form>

          <p className="auth-link text-center mt-md">
            {t('auth.noAccount')}{' '}
            <Link to="/register">{t('auth.registerLink')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

