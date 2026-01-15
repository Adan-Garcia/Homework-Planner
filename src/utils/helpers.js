export const unfoldLines = (text) => text.replace(/\r\n /g, '');

export const parseICSDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split(';')[0].replace('DTSTART:', '').replace('DTSTART;', '');
  const match = /(\d{4})(\d{2})(\d{2})/.exec(cleanDate);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return '';
};

export const determineType = (summary, description) => {
  const text = (summary + ' ' + description || '').toLowerCase();
  if (text.includes('reading')) return 'Reading';
  if (text.includes('exam') || text.includes('test') || text.includes('midterm') || text.includes('final')) return 'Exam';
  if (text.includes('quiz')) return 'Quiz';
  if (text.includes('homework') || text.includes('hw')) return 'Homework';
  if (text.includes('project') || text.includes('lab')) return 'Project';
  if (text.includes('discussion')) return 'Discussion';
  return 'Assignment';
};

export const determineClass = (location, summary) => {
  let candidate = location || summary || "";
  const separators = [' - ', ' : ', ' | '];
  
  for (const sep of separators) {
    if (candidate.includes(sep)) {
      const parts = candidate.split(sep);
      let name = parts[parts.length - 1].trim();
      name = name.replace(/ - Due$/i, '')
                 .replace(/Zoom Meeting/i, '')
                 .replace(/Assignment/i, '')
                 .trim();
      if (!/^[\w\s]+$/.test(name) && name.length < 3) continue;
      return name;
    }
  }
  return "General";
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const addDaysToDate = (dateStr, days) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export const getWeekDates = (baseDate) => {
  const current = new Date(baseDate);
  const day = current.getDay(); // 0 is Sunday
  const diff = current.getDate() - day; // adjust when day is sunday
  const start = new Date(current.setDate(diff));
  
  const days = [];
  for (let i = 0; i < 7; i++) {
     const d = new Date(start);
     d.setDate(start.getDate() + i);
     days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

export const generateICS = (events) => {
  if (!events || events.length === 0) return '';

  const formatDate = (dateStr) => {
     if (!dateStr) return '';
     return dateStr.replace(/-/g, '');
  };

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Homework Planner//EN',
    'CALSCALE:GREGORIAN'
  ];

  events.forEach(ev => {
    icsLines.push('BEGIN:VEVENT');
    // Ensure UID is present, otherwise generate a simple one
    icsLines.push(`UID:${ev.id || `evt-${Math.random().toString(36).substr(2,9)}`}`);
    icsLines.push(`DTSTAMP:${now}`);
    
    // DTSTART
    if (ev.time) {
        const [h, m] = ev.time.split(':');
        const dt = `${formatDate(ev.date)}T${h}${m}00`;
        icsLines.push(`DTSTART:${dt}`);
    } else {
        icsLines.push(`DTSTART;VALUE=DATE:${formatDate(ev.date)}`);
    }

    icsLines.push(`SUMMARY:${ev.title}`);
    
    if (ev.description) {
        // Escape characters for ICS text fields
        const desc = ev.description.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
        icsLines.push(`DESCRIPTION:${desc}`);
    }
    
    if (ev.class && ev.class !== 'General') {
        icsLines.push(`LOCATION:${ev.class}`);
    }
    
    if (ev.type) {
        icsLines.push(`CATEGORIES:${ev.type}`);
    }

    icsLines.push('END:VEVENT');
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
};

export const generateSyncCode = () => {
    // Generate a random 6-character code (A-Z, 0-9)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking chars (I, 1, O, 0)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};