import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Case from '../models/Case.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/repression-archive'
    );

    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Case.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const admin = await User.create({
      fullName: 'Әкімші',
      email: 'admin@archive.kz',
      password: 'admin123',
      role: 'admin'
    });

    const moderator = await User.create({
      fullName: 'Модератор',
      email: 'moderator@archive.kz',
      password: 'moderator123',
      role: 'moderator'
    });

    const user = await User.create({
      fullName: 'Қолданушы',
      email: 'user@archive.kz',
      password: 'user123',
      role: 'user'
    });

    console.log('Users created:');
    console.log('Admin: admin@archive.kz / admin123');
    console.log('Moderator: moderator@archive.kz / moderator123');
    console.log('User: user@archive.kz / user123');

    // Create sample cases
    const cases = [
      {
        title: 'Дело о конфискации хозяйств гр-на аула №9 Кувского района Каркаралинского округа Такмагамбетова Карабая',
        caseNumber: '001-1928',
        description:
          'Дело о конфискации хозяйства репрессированного гражданина Такмагамбетова Карабая из аула №9 (в заявлении указан аул №5) Кувского района Каркаралинского округа. Рассматривалось в период с 8 сентября по 21 ноября 1928 года.',
        location: 'Аул №9, Кувский район',
        district: 'Кувский район',
        region: 'Каркаралинский округ',
        dateFrom: new Date('1928-09-08'),
        dateTo: new Date('1928-11-21'),
        year: 1928,
        victims: ['Такмагамбетов Карабай'],
        createdBy: moderator._id
      },
      {
        title: 'Дело о конфискации хозяйства Мальгельдина Губая Кувского района',
        caseNumber: '002-1928',
        description:
          'Материалы по делу о конфискации хозяйства Мальгельдина Губая из Кувского района Карагандинской области. Период рассмотрения: с 16 октября по 27 декабря 1928 года.',
        location: 'Кувский район',
        district: 'Кувский район',
        region: 'Карагандинская область',
        dateFrom: new Date('1928-10-16'),
        dateTo: new Date('1928-12-27'),
        year: 1928,
        victims: ['Мальгельдин Губай'],
        createdBy: moderator._id
      },
      {
        title: 'Дело репрессированных жителей Карагандинского округа 1930-1933 гг.',
        caseNumber: '003-1930',
        description:
          'Коллективное дело о репрессиях жителей Карагандинского округа в период массовой коллективизации. Материалы включают протоколы допросов, постановления о конфискации имущества и списки репрессированных.',
        location: 'Карагандинский округ',
        district: 'Различные районы',
        region: 'Карагандинская область',
        dateFrom: new Date('1930-01-01'),
        dateTo: new Date('1933-12-31'),
        year: 1930,
        victims: [
          'Нурманов Сейткали',
          'Абдуллин Мухамед',
          'Жанузакова Райхан',
          'Каримов Есен'
        ],
        createdBy: moderator._id
      },
      {
        title: 'Дело о раскулачивании хозяйств Каркаралинского района',
        caseNumber: '004-1931',
        description:
          'Архивные материалы о проведении политики раскулачивания в Каркаралинском районе. Содержит акты изъятия имущества, списки высланных семей.',
        location: 'Каркаралинский район',
        district: 'Каркаралинский район',
        region: 'Карагандинская область',
        dateFrom: new Date('1931-03-15'),
        dateTo: new Date('1931-08-20'),
        year: 1931,
        victims: ['Досмагамбетов Сапар', 'Байгожина Кунсулу'],
        createdBy: moderator._id
      },
      {
        title: 'Следственное дело о контрреволюционной деятельности',
        caseNumber: '005-1937',
        description:
          'Следственное дело периода 1937 года. Обвинение в контрреволюционной агитации и участии в антисоветской организации. Дело содержит протоколы допросов, показания свидетелей.',
        location: 'г. Караганда',
        district: 'Город Караганда',
        region: 'Карагандинская область',
        dateFrom: new Date('1937-06-10'),
        dateTo: new Date('1937-09-05'),
        year: 1937,
        victims: ['Алимбаев Касым'],
        createdBy: moderator._id
      },
      {
        title: 'Дело о выселении семей спецпереселенцев',
        caseNumber: '006-1932',
        description:
          'Материалы о принудительном переселении семей в Карагандинскую область. Включает списки переселенцев, акты о предоставлении жилья, данные о трудоустройстве.',
        location: 'Различные населенные пункты',
        district: 'Карагандинская область',
        region: 'Карагандинская область',
        dateFrom: new Date('1932-05-01'),
        dateTo: new Date('1932-11-30'),
        year: 1932,
        victims: [
          'Семья Оспановых',
          'Семья Ахметовых',
          'Семья Сейдалиевых'
        ],
        createdBy: moderator._id
      }
    ];

    await Case.insertMany(cases);
    console.log(`\nCreated ${cases.length} sample cases`);

    console.log('\n✅ Seed data created successfully!');
    console.log('\nYou can now login with:');
    console.log('Admin: admin@archive.kz / admin123');
    console.log('Moderator: moderator@archive.kz / moderator123');
    console.log('User: user@archive.kz / user123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

