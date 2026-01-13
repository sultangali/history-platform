import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Case from '../models/Case.js';
import Feedback from '../models/Feedback.js';
import Suggestion from '../models/Suggestion.js';

dotenv.config();

const cleanTestData = async () => {
  try {
    // Подключение к MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/repression-archive'
    );

    console.log('✅ Подключено к MongoDB\n');

    // Список тестовых email адресов
    const testEmails = [
      'admin@karagandymemory.kz',
      'moderator@karagandymemory.kz',
      'user@karagandymemory.kz'
    ];

    // Список тестовых номеров дел
    const testCaseNumbers = [
      '001-1928',
      '002-1928',
      '003-1930',
      '004-1931',
      '005-1937',
      '006-1932'
    ];

    let stats = {
      users: 0,
      cases: 0,
      feedback: 0,
      suggestions: 0
    };

    // 1. Удаление тестовых пользователей
    console.log('🗑️  Удаление тестовых пользователей...');
    const testUsers = await User.find({
      email: { $in: testEmails }
    });
    
    if (testUsers.length > 0) {
      const userIds = testUsers.map(u => u._id);
      
      // Удаление пользователей
      const userResult = await User.deleteMany({
        email: { $in: testEmails }
      });
      stats.users = userResult.deletedCount;
      console.log(`   Удалено пользователей: ${stats.users}`);

      // 2. Находим дела для удаления (сначала находим, потом удаляем)
      console.log('\n🗑️  Удаление тестовых дел...');
      const casesToDelete = await Case.find({
        $or: [
          { createdBy: { $in: userIds } },
          { caseNumber: { $in: testCaseNumbers } }
        ]
      }).select('_id');
      
      const deletedCaseIdArray = casesToDelete.map(c => c._id);
      
      // Удаляем дела
      const caseResult = await Case.deleteMany({
        $or: [
          { createdBy: { $in: userIds } },
          { caseNumber: { $in: testCaseNumbers } }
        ]
      });
      stats.cases = caseResult.deletedCount;
      console.log(`   Удалено дел: ${stats.cases}`);

      // 3. Удаление предложений, связанных с удаленными делами
      if (deletedCaseIdArray.length > 0) {
        console.log('\n🗑️  Удаление предложений...');
        const suggestionResult = await Suggestion.deleteMany({
          caseId: { $in: deletedCaseIdArray }
        });
        stats.suggestions = suggestionResult.deletedCount;
        console.log(`   Удалено предложений: ${stats.suggestions}`);
      } else {
        console.log('\n🗑️  Предложения не найдены для удаления');
      }
    } else {
      console.log('   Тестовые пользователи не найдены');
      
      // Удаляем тестовые дела по номерам, даже если пользователи не найдены
      console.log('\n🗑️  Проверка тестовых дел по номерам...');
      const casesToDelete = await Case.find({
        caseNumber: { $in: testCaseNumbers }
      }).select('_id');
      
      if (casesToDelete.length > 0) {
        const deletedCaseIdArray = casesToDelete.map(c => c._id);
        
        const caseResult = await Case.deleteMany({
          caseNumber: { $in: testCaseNumbers }
        });
        stats.cases = caseResult.deletedCount;
        console.log(`   Удалено дел: ${stats.cases}`);
        
        // Удаляем предложения, связанные с удаленными делами
        if (deletedCaseIdArray.length > 0) {
          const suggestionResult = await Suggestion.deleteMany({
            caseId: { $in: deletedCaseIdArray }
          });
          stats.suggestions = suggestionResult.deletedCount;
          console.log(`   Удалено предложений: ${stats.suggestions}`);
        }
      } else {
        console.log('   Тестовые дела не найдены');
      }
    }

    // 4. Удаление всех отзывов (Feedback) - обычно это тестовые данные
    console.log('\n🗑️  Удаление всех отзывов...');
    const feedbackResult = await Feedback.deleteMany({});
    stats.feedback = feedbackResult.deletedCount;
    console.log(`   Удалено отзывов: ${stats.feedback}`);

    // 5. Дополнительная очистка: удаление всех предложений со статусом pending старше 30 дней
    console.log('\n🗑️  Очистка старых необработанных предложений...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldSuggestionsResult = await Suggestion.deleteMany({
      status: 'pending',
      createdAt: { $lt: thirtyDaysAgo }
    });
    console.log(`   Удалено старых предложений: ${oldSuggestionsResult.deletedCount}`);

    // Итоговая статистика
    console.log('\n' + '='.repeat(50));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(50));
    console.log(`   Пользователей удалено: ${stats.users}`);
    console.log(`   Дел удалено: ${stats.cases}`);
    console.log(`   Отзывов удалено: ${stats.feedback}`);
    console.log(`   Предложений удалено: ${stats.suggestions}`);
    console.log('='.repeat(50));
    console.log('\n✅ Очистка тестовых данных завершена успешно!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при очистке данных:', error);
    process.exit(1);
  }
};

// Запуск скрипта
cleanTestData();
