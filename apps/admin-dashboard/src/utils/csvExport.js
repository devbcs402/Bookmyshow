/**
 * Converts array of objects to CSV formatted text and triggers browser download
 */
export function exportToCsv(data, filename = 'admin-report.csv', headers = null) {
  if (!data || !data.length) {
    console.warn('No data available for CSV export');
    return;
  }

  const keys = headers ? headers.map(h => h.key) : Object.keys(data[0]);
  const headerLabels = headers ? headers.map(h => h.label) : keys;

  const csvRows = [];
  // 1. Header row
  csvRows.push(headerLabels.map(escapeCsvValue).join(','));

  // 2. Data rows
  for (const item of data) {
    const row = keys.map(key => {
      const val = getNestedValue(item, key);
      return escapeCsvValue(val);
    });
    csvRows.push(row.join(','));
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const exportToCSV = exportToCsv;

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ''), obj);
}

