/**
 * Экспорт дел в CSV формат
 * @param {Array} cases - Массив дел для экспорта
 * @param {string} filename - Имя файла (опционально)
 */
export const exportCasesToCSV = (cases, filename) => {
  if (!cases || cases.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  // Заголовки CSV
  const headers = [
    'Название',
    'Номер дела',
    'Год',
    'Место',
    'Район',
    'Округ',
    'Дата начала',
    'Дата окончания',
    'Статус',
    'Жертвы',
    'Описание',
    'Дата создания',
    'Создатель'
  ];

  // Функция для экранирования CSV значений
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    
    const stringValue = String(value);
    
    // Если есть запятая, кавычки или перенос строки - оборачиваем в кавычки
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch (e) {
      return '';
    }
  };

  // Формирование строк данных
  const rows = cases.map(caseItem => [
    escapeCSV(caseItem.title),
    escapeCSV(caseItem.caseNumber),
    escapeCSV(caseItem.year),
    escapeCSV(caseItem.location),
    escapeCSV(caseItem.district),
    escapeCSV(caseItem.region),
    formatDate(caseItem.dateFrom),
    formatDate(caseItem.dateTo),
    escapeCSV(caseItem.status === 'published' ? 'Опубликовано' : 'Черновик'),
    escapeCSV(caseItem.victims ? caseItem.victims.join('; ') : ''),
    escapeCSV(caseItem.description),
    formatDate(caseItem.createdAt),
    escapeCSV(caseItem.createdBy?.fullName || caseItem.createdBy?.email || '')
  ]);

  // Собираем CSV контент
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Создаем Blob с BOM для корректной кодировки UTF-8 в Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });

  // Создаем ссылку и скачиваем файл
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `cases_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Очищаем URL объект
  URL.revokeObjectURL(url);
};

/**
 * Экспорт выбранных дел в CSV
 * @param {Array} allCases - Все дела
 * @param {Array} selectedIds - ID выбранных дел
 * @param {string} filename - Имя файла (опционально)
 */
export const exportSelectedCasesToCSV = (allCases, selectedIds, filename) => {
  const selectedCases = allCases.filter(c => selectedIds.includes(c._id));
  exportCasesToCSV(selectedCases, filename || `selected_cases_${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Экспорт статистики в CSV
 * @param {Object} statistics - Объект со статистикой
 */
export const exportStatisticsToCSV = (statistics) => {
  if (!statistics) {
    alert('Нет данных статистики для экспорта');
    return;
  }

  let csvContent = '';

  // Дела по годам
  if (statistics.byYear && statistics.byYear.length > 0) {
    csvContent += 'Дела по годам\n';
    csvContent += 'Год,Количество\n';
    statistics.byYear.forEach(item => {
      csvContent += `${item._id},${item.count}\n`;
    });
    csvContent += '\n';
  }

  // Дела по районам
  if (statistics.byDistrict && statistics.byDistrict.length > 0) {
    csvContent += 'Дела по районам\n';
    csvContent += 'Район,Количество\n';
    statistics.byDistrict.forEach(item => {
      csvContent += `${item._id},${item.count}\n`;
    });
    csvContent += '\n';
  }

  // Дела по статусам
  if (statistics.byStatus && statistics.byStatus.length > 0) {
    csvContent += 'Дела по статусам\n';
    csvContent += 'Статус,Количество\n';
    statistics.byStatus.forEach(item => {
      const status = item._id === 'published' ? 'Опубликовано' : 'Черновик';
      csvContent += `${status},${item.count}\n`;
    });
  }

  // Создаем и скачиваем файл
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `statistics_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export default {
  exportCasesToCSV,
  exportSelectedCasesToCSV,
  exportStatisticsToCSV
};
