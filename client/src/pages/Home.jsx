import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, Archive, People, ChatLeftText } from 'react-bootstrap-icons';
import './Home.css';

const Home = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/archive?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const features = [
    {
      icon: Archive,
      title: t('home.featureCasesTitle'),
      description: t('home.featureArchive'),
      link: '/archive?type=case'
    },
    {
      icon: Search,
      title: t('home.featureSearchTitle'),
      description: t('home.featureSearch'),
      link: '/archive?search='
    },
    {
      icon: People,
      title: t('home.featureMemoriesTitle'),
      description: t('home.featureMemories'),
      link: '/archive?type=memory'
    },
    {
      icon: ChatLeftText,
      title: t('home.featureContactTitle'),
      description: t('home.featureContact'),
      link: '/contact'
    }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="hero-content"
          >
            <h1>{t('hero.title')}</h1>
            <p className="hero-subtitle">{t('hero.description')}</p>

            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <Search size={20} />
                <input
                  type="text"
                  placeholder={t('hero.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-accent">
                {t('hero.search')}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section section">
        <div className="container">
          <div className="features-grid">
            {features.map((feature, index) => (
              <Link key={index} to={feature.link} className="feature-card-link">
                <div className="feature-card card">
                  <feature.icon size={40} className="feature-icon" />
                  <h3>{feature.title}</h3>
                  <p className="text-muted">{feature.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="about-content"
          >
            <h2>{t('nav.about')}</h2>
            <p>
              {t('home.aboutText')}
            </p>
            <Link to="/about" className="btn btn-primary">
              {t('home.learnMore')}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
