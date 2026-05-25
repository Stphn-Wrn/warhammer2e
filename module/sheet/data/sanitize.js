export function sanitizeNumberFields(obj, keys = []) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of keys) {
    if (obj[k] === undefined || obj[k] === null) continue;
    try {
      const raw = String(obj[k]).replace(/,/g, '.').trim();
      const n = Number(raw);
      if (Number.isFinite(n)) { obj[k] = n; continue; }
      const digits = raw.replace(/[^0-9-]/g, '');
      obj[k] = digits.length > 0 ? (parseInt(digits, 10) || 0) : 0;
    } catch (e) {}
  }
}

function sanitizeNumericStringsRecursive(node) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) sanitizeNumericStringsRecursive(node[i]); return; }
  if (typeof node !== 'object') return;
  for (const key of Object.keys(node)) {
    try {
      const val = node[key];
      if (val === null || val === undefined) continue;
      if (typeof val === 'string') {
        if (/^[\s0-9.,-]+$/.test(val)) {
          const raw = val.replace(/\s/g, '').replace(/,/g, '.');
          const n = Number(raw);
          if (Number.isFinite(n)) { node[key] = n; continue; }
          const digits = raw.replace(/[^0-9-]/g, '');
          node[key] = digits.length > 0 ? (parseInt(digits, 10) || 0) : 0;
        }
        continue;
      }
      if (typeof val === 'object') sanitizeNumericStringsRecursive(val);
    } catch (e) {}
  }
}

export function sanitizeSystem(sys) {
  try { sanitizeNumericStringsRecursive(sys); } catch (e) {}
}
