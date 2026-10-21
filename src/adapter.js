/**
 * adapter.js — turns a cinema booking seat-map response into the hall format
 * used by the 3D seat viewer (index.html → HALLS entries).
 *
 * Input shape (a common seat-map structure for cinema ticketing systems):
 *   { maps: [ { roomName, rowCount, colCount, seats: [ [ {rowIndex, seatIndex, rowName,
 *       seatName, seatType: 'STD'|'DUO'|'DIS', status, seatSide: 'L'|'R'|null}, ... ], ... ] } ] }
 *   rowIndex 0 = back row (top of their plan); seatIndex = grid column (gaps are missing indexes).
 *
 * Output: { key, cinema, name, cap, first, rows: ['A:ss.dd..', ...], status: { 'A3': 0, ... } }
 *   rows are back row first; s = seat, d = duo half, w = wheelchair place, . = empty cell.
 *   status keeps the raw per-seat status so the viewer can grey out taken seats.
 *   status 0 = available (observed). Other codes not yet confirmed: treat non-zero as unavailable.
 */
export function seatmapToHall(json, { key, cinema, name } = {}) {
  const map = json.maps ? json.maps[0] : json;
  const code = { STD: 's', DUO: 'd', DIS: 'w' };
  const rows = [], status = {};
  let first = null;
  for (const row of map.seats) {
    if (!row.length) continue;
    const cells = Array(map.colCount).fill('.');
    for (const s of row) {
      cells[s.seatIndex] = code[s.seatType] || 's';
      status[s.rowName + s.seatName] = s.status;
      if (first === null) first = Number(s.seatName);
    }
    rows.push(`${row[0].rowName}:${cells.join('').replace(/\.+$/, '')}`);
  }
  const cap = rows.reduce((a, r) => a + (r.split(':')[1].match(/[sdw]/g) || []).length, 0);
  return { key, cinema, name: name || map.roomName, cap, first, rows, status };
}

/** Reverse: hall format → seat-map shape (used to build test fixtures). */
export function hallToSeatmap(h) {
  const colCount = Math.max(...h.rows.map(r => r.split(':')[1].length));
  const typ = { s: 'STD', d: 'DUO', w: 'DIS' };
  const aisle = [...Array(colCount)].map((_, c) =>
    h.rows.filter(r => r.split(':')[1].length === colCount && r.split(':')[1][c] === '.').length >= 2);
  const nonAisleBefore = c => aisle.slice(0, c).filter(a => !a).length;
  const firstCol = h.rows[0].split(':')[1].search(/[sdw]/);
  const base = h.first - nonAisleBefore(firstCol);
  const seats = h.rows.map((r, ri) => {
    const [L, s] = r.split(':'); const out = []; let side = 'L';
    [...s].forEach((ch, c) => {
      if (ch === '.') return;
      out.push({ rowIndex: ri, seatIndex: c, rowName: L, seatName: String(base + nonAisleBefore(c)),
        seatType: typ[ch], section: 1, status: 0, seatSide: ch === 'd' ? side : null, companion: false, tooltip: null });
      if (ch === 'd') side = side === 'L' ? 'R' : 'L';
    });
    return out;
  });
  return { maps: [{ roomName: h.name, rowCount: h.rows.length, colCount, seatsTotalCount: h.cap, seats }] };
}
