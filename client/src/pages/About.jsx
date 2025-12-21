import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Book, Archive, People, Search } from 'react-bootstrap-icons';
import './About.css';

const About = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Archive,
      title: 'Historical Archive',
      description:
        'Comprehensive collection of documents and records from the period of political repressions in Karaganda Region.'
    },
    {
      icon: Search,
      title: 'Search Database',
      description:
        'Advanced search functionality to help you find information about specific individuals and cases.'
    },
    {
      icon: Book,
      title: 'Research Materials',
      description:
        'Access to historical research, analysis, and documentation of events during the repression period.'
    },
    {
      icon: People,
      title: 'Community Collaboration',
      description:
        'Platform for sharing memories, correcting information, and contributing to historical accuracy.'
    }
  ];

  return (
    <div className="about-page">
      <div className="about-hero">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="hero-content"
          >
            <h1>{t('nav.about')}</h1>
            <p className="hero-subtitle">{t('app.subtitle')}</p>
          </motion.div>
        </div>
      </div>

      <section className="about-content section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="content-section">
              <h2>Our Mission</h2>
              <p>
                This digital archive is dedicated to preserving the memory of those who
                suffered during the political repressions in Karaganda Region. We strive
                to document, research, and make accessible historical records that tell
                the stories of individuals and communities affected by these events.
              </p>
              <p>
                Through careful documentation and community collaboration, we aim to
                ensure that these important historical events are not forgotten and that
                future generations can learn from the past.
              </p>
            </div>

            <div className="features-section">
              <h2>What We Offer</h2>
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
                    <p>{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="content-section">
              <h2>Historical Context</h2>
              <p>
                The Karaganda Region played a significant role during the period of
                political repressions in the Soviet Union. Many individuals were
                subjected to unjust persecution, exile, and imprisonment. This archive
                serves as a testament to their experiences and a resource for
                understanding this complex period of history.
              </p>
              <p>
                We work with historians, researchers, and descendants of those affected
                to continuously improve and expand our database, ensuring accuracy and
                comprehensiveness in our documentation.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;

