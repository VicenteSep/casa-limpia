// Utilidades de fechas en formato 'YYYY-MM-DD' (hora local).
const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => iso(new Date());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5); // b - a
export const dow = s => (parse(s).getDay() + 6) % 7; // 0 = lunes … 6 = domingo
export const mondayOf = s => addDays(s, -dow(s));
export const saturdayOf = s => addDays(mondayOf(s), 5);
export const sundayOf = s => addDays(mondayOf(s), 6);
export function addInterval(s, n, unit) {
  if (unit === 'day') return addDays(s, n);
  if (unit === 'week') return addDays(s, 7 * n);
  const d = parse(s); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return iso(d);
}
export const intervalDays = (n, unit) => n * ({ day: 1, week: 7, month: 30 }[unit] || 7);

const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fmtShort = s => { const d = parse(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
export const unitLabel = (n, unit) => ({ day: n === 1 ? 'día' : 'días', week: n === 1 ? 'semana' : 'semanas', month: n === 1 ? 'mes' : 'meses' }[unit]);
export const everyLabel = (n, unit) => n === 1 ? `Cada ${unitLabel(1, unit)}` : `Cada ${n} ${unitLabel(n, unit)}`;
