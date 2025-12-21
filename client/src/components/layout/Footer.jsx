import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Footer.css';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h4>{t('app.title')}</h4>
            <p className="text-muted">{t('app.subtitle')}</p>
          </div>

          <div className="footer-section">
            <h5>{t('nav.about')}</h5>
            <ul>
              <li>
                <Link to="/about">{t('footer.about')}</Link>
              </li>
              <li>
                <Link to="/contact">{t('footer.contact')}</Link>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h5>{t('nav.archive')}</h5>
            <ul>
              <li>
                <Link to="/archive">{t('cases.title')}</Link>
              </li>
              <li>
                <Link to="/contact">{t('feedback.title')}</Link>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h5>Legal</h5>
            <ul>
              <li>
                <Link to="/privacy">{t('footer.privacy')}</Link>
              </li>
              <li>
                <Link to="/terms">{t('footer.terms')}</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="text-muted">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

