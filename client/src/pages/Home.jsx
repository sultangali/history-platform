import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, Archive, Book, People } from 'react-bootstrap-icons';
import { casesAPI } from '../services/api';
import CaseCard from '../components/cases/CaseCard';
import './Home.css';

const Home = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecentCases();
  }, []);

  const fetchRecentCases = async () => {
    setLoading(true);
    try {
      const response = await casesAPI.getAll({ limit: 6 });
      setRecentCases(response.data.cases || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/archive?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const features = [
    {
      icon: Archive,
      title: t('cases.title'),
      description: 'Comprehensive database of historical documents and cases'
    },
    {
      icon: Search,
      title: t('hero.search'),
      description: 'Search and filter by location, year, and names'
    },
    {
      icon: Book,
      title: t('app.subtitle').split('.')[1],
      description: 'Access to archive documents and historical records'
    },
    {
      icon: People,
      title: t('app.subtitle').split('.')[2],
      description: 'Memories and testimonies from survivors'
    }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
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
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="feature-card card"
              >
                <feature.icon size={40} className="feature-icon" />
                <h3>{feature.title}</h3>
                <p className="text-muted">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Cases Section */}
      <section className="recent-cases-section section">
        <div className="container">
          <div className="section-header">
            <h2>{t('cases.title')}</h2>
            <Link to="/archive" className="btn btn-secondary">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : (
            <div className="cases-grid">
              {recentCases.map((caseItem, index) => (
                <motion.div
                  key={caseItem._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <CaseCard caseData={caseItem} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="about-section section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="about-content"
          >
            <h2>{t('nav.about')}</h2>
            <p>
              This archive is dedicated to preserving the memory of those who suffered
              during the political repressions in Karaganda Region. Our mission is to
              document and make accessible the historical records, providing a resource
              for researchers, families, and anyone interested in this important period
              of history.
            </p>
            <Link to="/about" className="btn btn-primary">
              Learn More
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;

