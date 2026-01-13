import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const seedUsers = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/repression-archive'
    );

    console.log('✅ Подключено к MongoDB\n');

    // Создание админа
    console.log('👤 Создание администратора...');
    const adminEmail = 'admin@karagandymemory.kz';
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log(`   ⚠️  Администратор с email ${adminEmail} уже существует`);
    } else {
      admin = await User.create({
        fullName: 'Администратор',
        email: adminEmail,
        password: 'KRG_MEMadmin1122',
        role: 'admin'
      });
      console.log(`   ✅ Администратор создан: ${adminEmail}`);
    }

    // Создание 5 модераторов
    console.log('\n👥 Создание модераторов...');
    const moderators = [
      {
        fullName: 'Модератор 1',
        email: 'moderator1@karagandymemory.kz',
        password: 'KRG_MEMmoderator1',
        role: 'moderator'
      },
      {
        fullName: 'Модератор 2',
        email: 'moderator2@karagandymemory.kz',
        password: 'KRG_MEMmoderator2',
        role: 'moderator'
      },
      {
        fullName: 'Модератор 3',
        email: 'moderator3@karagandymemory.kz',
        password: 'KRG_MEMmoderator3',
        role: 'moderator'
      },
      {
        fullName: 'Модератор 4',
        email: 'moderator4@karagandymemory.kz',
        password: 'KRG_MEMmoderator4',
        role: 'moderator'
      },
      {
        fullName: 'Модератор 5',
        email: 'moderator5@karagandymemory.kz',
        password: 'KRG_MEMmoderator5',
        role: 'moderator'
      }
    ];

    let createdCount = 0;
    let existingCount = 0;

    for (const moderatorData of moderators) {
      const existingModerator = await User.findOne({ email: moderatorData.email });
      
      if (existingModerator) {
        console.log(`   ⚠️  Модератор с email ${moderatorData.email} уже существует`);
        existingCount++;
      } else {
        await User.create(moderatorData);
        console.log(`   ✅ Модератор создан: ${moderatorData.email}`);
        createdCount++;
      }
    }

    // Итоговая информация
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`   Администраторов: ${admin ? '1 (создан или уже существует)' : '0'}`);
    console.log(`   Модераторов создано: ${createdCount}`);
    console.log(`   Модераторов уже существует: ${existingCount}`);
    console.log('='.repeat(60));

    console.log('\n📋 УЧЕТНЫЕ ДАННЫЕ:');
    console.log('─'.repeat(60));
    console.log('Администратор:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Пароль: KRG_MEMadmin1122`);
    console.log('\nМодераторы:');
    moderators.forEach((mod, index) => {
      console.log(`   ${index + 1}. Email: ${mod.email} | Пароль: ${mod.password}`);
    });
    console.log('─'.repeat(60));

    console.log('\n✅ Seed пользователей завершен успешно!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при создании пользователей:', error);
    process.exit(1);
  }
};

// Запуск скрипта
seedUsers();
