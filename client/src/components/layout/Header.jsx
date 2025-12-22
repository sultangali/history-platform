import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { List, X, PersonCircle, BoxArrowRight, Globe } from 'react-bootstrap-icons';
import './Header.css';

const Header = () => {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLangMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  const getUserRoleLink = () => {
    if (isAdmin) {
      return '/admin';
    } else if (isModerator) {
      return '/moderator';
    }
    return '/';
  };

  const getUserRoleLabel = () => {
    if (isAdmin) {
      return i18n.language === 'kk' ? 'Әкімші' : i18n.language === 'ru' ? 'Администратор' : 'Admin';
    } else if (isModerator) {
      return i18n.language === 'kk' ? 'Модератор' : i18n.language === 'ru' ? 'Модератор' : 'Moderator';
    }
    return i18n.language === 'kk' ? 'Қолданушы' : i18n.language === 'ru' ? 'Пользователь' : 'User';
  };

  const handleUserMenuClick = () => {
    const link = getUserRoleLink();
    navigate(link);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const languages = [
    { code: 'kk', name: 'Қазақша' },
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' }
  ];

  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          <Link to="/" className="logo">
            <h3>{t('app.title')}</h3>
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-links desktop-nav">
            <Link to="/">{t('nav.home')}</Link>
            <Link to="/archive">{t('nav.archive')}</Link>
            <Link to="/about">{t('nav.about')}</Link>
            <Link to="/contact">{t('nav.contact')}</Link>
          </div>

          <div className="nav-actions desktop-nav">
            {/* Language Switcher */}
            <div className="language-switcher">
              <button
                className="btn-icon"
                onClick={() => {
                  setLangMenuOpen(!langMenuOpen);
                  setUserMenuOpen(false);
                }}
              >
                <Globe size={20} />
                <span>{i18n.language.toUpperCase()}</span>
              </button>
              {langMenuOpen && (
                <div className="language-menu">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={i18n.language === lang.code ? 'active' : ''}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <div className="user-menu">
                <div className="user-menu-dropdown" ref={userMenuRef}>
                  <button
                    className="btn-icon"
                    onClick={() => {
                      setUserMenuOpen(!userMenuOpen);
                      setLangMenuOpen(false);
                    }}
                  >
                    <PersonCircle size={24} />
                    <span>{user.fullName}</span>
                  </button>
                  {userMenuOpen && (
                    <div className="user-dropdown-menu">
                      <button
                        onClick={handleUserMenuClick}
                        className="user-dropdown-item"
                      >
                        <PersonCircle size={18} />
                        <span>{getUserRoleLabel()}</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="user-dropdown-item"
                      >
                        <BoxArrowRight size={18} />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn btn-primary">
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </nav>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="mobile-nav">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.home')}
            </Link>
            <Link to="/archive" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.archive')}
            </Link>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.about')}
            </Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.contact')}
            </Link>

            <div className="mobile-lang-select">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setMobileMenuOpen(false);
                  }}
                  className={i18n.language === lang.code ? 'active' : ''}
                >
                  {lang.name}
                </button>
              ))}
            </div>

            {user ? (
              <>
                <button
                  onClick={() => {
                    navigate(getUserRoleLink());
                    setMobileMenuOpen(false);
                  }}
                  className="mobile-user-btn"
                >
                  <PersonCircle size={20} />
                  {user.fullName} ({getUserRoleLabel()})
                </button>
                <button onClick={handleLogout} className="logout-btn">
                  <BoxArrowRight size={20} />
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn btn-secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

