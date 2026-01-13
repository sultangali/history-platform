import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Book, Archive, People, Search } from 'react-bootstrap-icons';
import './About.css';

const About = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Archive,
      title: t('about.historicalArchive'),
      description: t('about.historicalArchiveDesc')
    },
    {
      icon: Search,
      title: t('about.searchDatabase'),
      description: t('about.searchDatabaseDesc')
    },
    {
      icon: Book,
      title: t('about.researchMaterials'),
      description: t('about.researchMaterialsDesc')
    },
    {
      icon: People,
      title: t('about.communityCollaboration'),
      description: t('about.communityCollaborationDesc')
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
              <h2>{t('about.mission')}</h2>
              <p>
                {t('about.missionText1')}
              </p>
              <p>
                {t('about.missionText2')}
              </p>
            </div>

            <div className="features-section">
              <h2>{t('about.whatWeOffer')}</h2>
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
              <h2>{t('about.historicalContext')}</h2>
              <p>
                {t('about.historicalContextText1')}
              </p>
              <p>
                {t('about.historicalContextText2')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;

