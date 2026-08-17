const buffer = [];
const DEV = !!(import.meta && import.meta.env && import.meta.env.DEV);

export function track(name, data) {
  buffer.push({ t: Date.now(), name, data: data || null });
  if (buffer.length > 50) buffer.shift();
  if (DEV) console.debug('[sort-garden]', name, data || '');
}

export function events() {
  return buffer.slice();
}

if (DEV && typeof window !== 'undefined') {
  window.__sgEvents = events;
}
