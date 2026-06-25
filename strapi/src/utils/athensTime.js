'use strict';

const ATHENS_TZ = 'Europe/Athens';

/** Offset Europe/Athens για συγκεκριμένη ημερομηνία (+02:00 / +03:00). */
function getAthensUtcOffset(y, month, day) {
  const utcNoon = Date.UTC(y, month - 1, day, 12, 0, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ATHENS_TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(utcNoon));
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || '';
  const m = tzName.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
  if (m) {
    const sign = m[1];
    const hh = String(m[2]).padStart(2, '0');
    const mm = String(m[3] || '00').padStart(2, '0');
    return `${sign}${hh}:${mm}`;
  }
  const athensHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ATHENS_TZ,
      hour: 'numeric',
      hour12: false,
    }).format(new Date(utcNoon)),
  );
  const offsetH = athensHour - 12;
  const sign = offsetH >= 0 ? '+' : '-';
  return `${sign}${String(Math.abs(offsetH)).padStart(2, '0')}:00`;
}

/**
 * Ημερομηνία+ώρα τοπικής Αθήνας → Date (UTC instant για αποθήκευση).
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeStr HH:MM
 */
function buildAthensDatetimeFromParts(dateStr, timeStr) {
  const dateMatch = String(dateStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(timeStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const y = Number(dateMatch[1]);
  const m = Number(dateMatch[2]);
  const d = Number(dateMatch[3]);
  const hh = Number(timeMatch[1]);
  const mm = Number(timeMatch[2]);
  if (hh > 23 || mm > 59) return null;
  const offset = getAthensUtcOffset(y, m, d);
  return new Date(
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00${offset}`,
  );
}

/** Ημερομηνία (τοπική) + ώρα από Date objects (regex parser). */
function buildAthensDatetime(date, hour, minute) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const offset = getAthensUtcOffset(y, m, d);
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return new Date(
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${hh}:${mm}:00${offset}`,
  );
}

function athensStartOfDay(y, m, d) {
  const offset = getAthensUtcOffset(y, m, d);
  return new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00${offset}`);
}

function athensEndOfDay(y, m, d) {
  const offset = getAthensUtcOffset(y, m, d);
  return new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T23:59:59${offset}`);
}

/** Εμφάνιση ώρας/ημερομηνίας πάντα σε Europe/Athens (όχι UTC του server). */
function formatAthensWallClock(datetime) {
  const d = datetime instanceof Date ? datetime : new Date(datetime);
  if (Number.isNaN(d.getTime())) {
    return { dateLabel: '—', timeLabel: '—', dayLabel: '—' };
  }
  return {
    dayLabel: d.toLocaleDateString('el-GR', { timeZone: ATHENS_TZ, weekday: 'long' }),
    dateLabel: d.toLocaleDateString('el-GR', {
      timeZone: ATHENS_TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }),
    timeLabel: d.toLocaleTimeString('el-GR', {
      timeZone: ATHENS_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

module.exports = {
  ATHENS_TZ,
  getAthensUtcOffset,
  buildAthensDatetimeFromParts,
  buildAthensDatetime,
  athensStartOfDay,
  athensEndOfDay,
  formatAthensWallClock,
};
