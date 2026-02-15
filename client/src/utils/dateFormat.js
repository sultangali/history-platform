/**
 * Европейский формат даты: ДД.ММ.ГГГГ (день, месяц, год)
 * Используется по всему сайту для единообразия.
 */
export const formatDate = (date) => {
  if (date === null || date === undefined) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

/**
 * Дата и время в европейском формате: ДД.ММ.ГГГГ, ЧЧ:ММ
 */
export const formatDateTime = (date) => {
  if (date === null || date === undefined) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const datePart = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${datePart}, ${hours}:${minutes}`;
};

export default { formatDate, formatDateTime };
