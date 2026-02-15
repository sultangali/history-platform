import * as XLSX from 'xlsx';
import { formatDate } from './dateFormat';

/**
 * Подготовка данных для экспорта
 */
const prepareDataForExport = (cases) => {
  return cases.map(caseItem => ({
    'Тип': caseItem.type === 'memory' ? 'Естелік' : 'Іс',
    'Название': caseItem.type === 'memory' ? (caseItem.personName || caseItem.title) : caseItem.title,
    'Номер дела': caseItem.caseNumber || '',
    'Год': caseItem.year || '',
    'Место': caseItem.location || '',
    'Район': caseItem.district || '',
    'Округ': caseItem.region || '',
    'Дата начала': formatDate(caseItem.dateFrom),
    'Дата окончания': formatDate(caseItem.dateTo),
    'Статус': caseItem.status === 'published' ? 'Опубликовано' : 'Черновик',
    'Количество жертв': caseItem.victims ? caseItem.victims.length : 0,
    'Жертвы': caseItem.victims ? caseItem.victims.join('; ') : '',
    'Описание': caseItem.description || '',
    'Дата создания': formatDate(caseItem.createdAt),
    'Создатель': caseItem.createdBy?.fullName || caseItem.createdBy?.email || ''
  }));
};

/**
 * Экспорт в CSV с правильной кодировкой для Windows Excel
 */
export const exportToCSV = (cases, filename) => {
  if (!cases || cases.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  const data = prepareDataForExport(cases);
  const headers = Object.keys(data[0]);

  // Функция для экранирования CSV значений
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // Если есть запятая, кавычки или перенос строки - оборачиваем в кавычки
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Формирование CSV контента
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(header => escapeCSV(row[header])).join(','))
  ];

  const csvContent = csvRows.join('\r\n'); // Windows line endings

  // BOM для UTF-8 (критично для Excel на Windows)
  const BOM = '\uFEFF';
  
  // Создаем Blob с правильной кодировкой
  const blob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });

  downloadBlob(blob, filename || `export_${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Экспорт в Excel (XLSX)
 */
export const exportToXLSX = (cases, filename) => {
  if (!cases || cases.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  const data = prepareDataForExport(cases);

  // Создаем рабочую книгу и лист
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Дела');

  // Автоматическая ширина колонок
  const maxWidth = 50;
  const colWidths = Object.keys(data[0]).map(key => {
    const maxLength = Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, maxWidth) };
  });
  worksheet['!cols'] = colWidths;

  // Генерируем файл
  XLSX.writeFile(workbook, filename || `export_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Экспорт в JSON
 */
export const exportToJSON = (cases, filename) => {
  if (!cases || cases.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  const data = prepareDataForExport(cases);
  const jsonContent = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonContent], { 
    type: 'application/json;charset=utf-8;' 
  });

  downloadBlob(blob, filename || `export_${new Date().toISOString().split('T')[0]}.json`);
};

/**
 * Вспомогательная функция для скачивания Blob
 */
const downloadBlob = (blob, filename) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Экспорт выбранных записей
 */
export const exportSelected = (allCases, selectedIds, format = 'csv') => {
  const selectedCases = allCases.filter(c => selectedIds.includes(c._id));
  const filename = `selected_export_${new Date().toISOString().split('T')[0]}`;

  switch (format) {
    case 'xlsx':
      exportToXLSX(selectedCases, `${filename}.xlsx`);
      break;
    case 'json':
      exportToJSON(selectedCases, `${filename}.json`);
      break;
    default:
      exportToCSV(selectedCases, `${filename}.csv`);
  }
};

export default {
  exportToCSV,
  exportToXLSX,
  exportToJSON,
  exportSelected
};
