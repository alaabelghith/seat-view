import fs from 'fs';
import { seatmapToHall, hallToSeatmap } from '../src/adapter.js';
const H = JSON.parse(fs.readFileSync(new URL('../data/halls.json', import.meta.url)));
let ok = 0;
for (const h of H) {
  const sm = hallToSeatmap(h);
  const back = seatmapToHall(sm, h);
  const same = JSON.stringify(back.rows) === JSON.stringify(h.rows.map(r => r.replace(/\.+$/, '')));
  if (same) ok++; else console.log('MISMATCH', h.key);
}
console.log(`${ok}/${H.length} halls round-trip OK`);
