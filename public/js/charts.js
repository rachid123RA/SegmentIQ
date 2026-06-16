/* ── CHART UTILITIES ── */
const SEG_COLORS = {
  'High income high spending': '#1d4ed8',
  'High income low spending':  '#0891b2',
  'Low income high spending':  '#7c3aed',
  'Low income low spending':   '#94a3b8',
  'Average customers':         '#059669',
};

function clearCanvas(id) {
  const c = document.getElementById(id);
  if (!c) return null;
  c.getContext('2d').clearRect(0, 0, c.width, c.height);
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ── HISTOGRAM ── */
function drawHistogram(canvasId, counts, edges, color) {
  const canvas = clearCanvas(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 20, right: 16, bottom: 36, left: 36 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const max = Math.max(...counts);
  const barW = chartW / counts.length;

  counts.forEach((v, i) => {
    const barH = (v / max) * chartH;
    const x = pad.left + i * barW;
    const y = pad.top + chartH - barH;
    ctx.fillStyle = color + 'cc';
    roundRect(ctx, x + 2, y, barW - 4, barH, 3);
    ctx.fill();
  });

  // Axes
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, H - pad.bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad.left, H - pad.bottom); ctx.lineTo(W - pad.right, H - pad.bottom); ctx.stroke();

  // X labels (first, mid, last)
  ctx.fillStyle = '#94a3b8'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
  [0, Math.floor(edges.length / 2), edges.length - 1].forEach(i => {
    const x = pad.left + (i / (edges.length - 1)) * chartW;
    ctx.fillText(edges[i], x, H - pad.bottom + 12);
  });

  // Y labels
  ctx.textAlign = 'right';
  [0, Math.round(max / 2), max].forEach(v => {
    const y = pad.top + chartH - (v / max) * chartH;
    ctx.fillText(v, pad.left - 4, y + 3);
  });
}

/* ── LINE CHART ── */
function drawLineChart(canvasId, values, labels, color, title) {
  const canvas = clearCanvas(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 28, right: 20, bottom: 36, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const min = Math.min(...values) * 0.95;
  const max = Math.max(...values) * 1.05;
  const n = values.length;

  const px = i => pad.left + (i / (n - 1)) * chartW;
  const py = v => pad.top + chartH - ((v - min) / (max - min)) * chartH;

  // Grid
  ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  }

  // Area fill
  ctx.beginPath();
  ctx.moveTo(px(0), py(values[0]));
  values.forEach((v, i) => ctx.lineTo(px(i), py(v)));
  ctx.lineTo(px(n - 1), pad.top + chartH);
  ctx.lineTo(px(0), pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = color + '18';
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(px(0), py(values[0]));
  values.forEach((v, i) => ctx.lineTo(px(i), py(v)));
  ctx.strokeStyle = color; ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round'; ctx.stroke();

  // Dots
  values.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(px(i), py(v), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
    // value label
    ctx.fillStyle = '#475569'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(v.toFixed(3), px(i), py(v) - 9);
  });

  // X labels
  ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
  labels.forEach((l, i) => ctx.fillText('k=' + l, px(i), H - pad.bottom + 14));

  // Y labels
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = min + (i / 4) * (max - min);
    const y = pad.top + chartH - (i / 4) * chartH;
    ctx.fillText(v.toFixed(2), pad.left - 6, y + 3);
  }

  // Title
  ctx.fillStyle = '#1e293b'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 14);
}

/* ── SCATTER PLOT ── */
function drawScatter(canvasId, xData, yData, colors, centers, xLabel, yLabel) {
  const canvas = clearCanvas(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 20, right: 20, bottom: 44, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const xMin = Math.min(...xData) - 5, xMax = Math.max(...xData) + 5;
  const yMin = Math.min(...yData) - 5, yMax = Math.max(...yData) + 5;
  const px = v => pad.left + ((v - xMin) / (xMax - xMin)) * chartW;
  const py = v => H - pad.bottom - ((v - yMin) / (yMax - yMin)) * chartH;

  // Grid
  ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const x = pad.left + (i / 5) * chartW;
    const y = pad.top + (i / 5) * chartH;
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, H - pad.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, H - pad.bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad.left, H - pad.bottom); ctx.lineTo(W - pad.right, H - pad.bottom); ctx.stroke();

  // Points
  xData.forEach((x, i) => {
    ctx.beginPath();
    ctx.arc(px(x), py(yData[i]), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = (colors[i] || '#94a3b8') + 'bb';
    ctx.fill();
    ctx.strokeStyle = (colors[i] || '#94a3b8') + 'ff';
    ctx.lineWidth = 0.8; ctx.stroke();
  });

  // Centers
  if (centers) {
    centers.forEach(c => {
      const cx = px(c.income), cy = py(c.spending);
      const s = 9;
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s); ctx.stroke();
    });
  }

  // Axis labels
  ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(xLabel, pad.left + chartW / 2, H - 6);
  ctx.save(); ctx.translate(12, pad.top + chartH / 2);
  ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore();

  // X tick labels
  for (let i = 0; i <= 4; i++) {
    const v = xMin + (i / 4) * (xMax - xMin);
    ctx.fillText(Math.round(v), pad.left + (i / 4) * chartW, H - pad.bottom + 14);
  }
}

/* ── HEATMAP ── */
function drawHeatmap(canvasId, values, labels) {
  const canvas = clearCanvas(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 40, right: 20, bottom: 20, left: 60 };
  const n = labels.length;
  const cellW = (W - pad.left - pad.right) / n;
  const cellH = (H - pad.top - pad.bottom) / n;

  values.forEach((row, i) => {
    row.forEach((val, j) => {
      const t = (val + 1) / 2;
      const r = Math.round(29 + (29 - 29) * t + (219 - 29) * (1 - t));
      const g = Math.round(78 + (78 - 78) * t + (234 - 78) * (1 - t));
      const b = Math.round(216 + (216 - 216) * t + (254 - 216) * (1 - t));
      const lightness = val > 0 ? Math.min(255, Math.round(29 + (1 - val) * 180)) : 200;

      const alpha = 0.15 + Math.abs(val) * 0.85;
      const hue = val > 0 ? '#1d4ed8' : '#94a3b8';

      const x = pad.left + j * cellW;
      const y = pad.top + i * cellH;
      ctx.fillStyle = val > 0.5
        ? `rgba(29,78,216,${alpha})`
        : val > 0
        ? `rgba(186,230,253,${alpha * 2})`
        : `rgba(148,163,184,${Math.abs(val) * 0.5 + 0.1})`;
      roundRect(ctx, x + 3, y + 3, cellW - 6, cellH - 6, 5);
      ctx.fill();

      ctx.fillStyle = Math.abs(val) > 0.4 ? '#fff' : '#1e293b';
      ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(val.toFixed(2), x + cellW / 2, y + cellH / 2 + 5);
    });
  });

  // Labels
  ctx.fillStyle = '#475569'; ctx.font = '11px system-ui';
  labels.forEach((l, i) => {
    ctx.textAlign = 'right';
    ctx.fillText(l, pad.left - 8, pad.top + i * cellH + cellH / 2 + 4);
    ctx.textAlign = 'center';
    ctx.fillText(l, pad.left + i * cellW + cellW / 2, pad.top - 10);
  });
}

/* ── PIE CHART ── */
function drawPie(canvasId, data, colors) {
  const canvas = clearCanvas(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2, cy = canvas.height / 2, r = 65;
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  let start = -Math.PI / 2;
  Object.entries(data).forEach(([label, val], i) => {
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + slice);
    ctx.fillStyle = colors[i] || '#ddd';
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    start += slice;
  });
  // Center hole
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.fillStyle = '#1e293b'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 5);
}

/* ── BAR CHART HORIZONTAL ── */
function drawHBarChart(canvasId, labels, values, color) {
  const canvas = clearCanvas(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 16, right: 50, bottom: 16, left: 80 };
  const max = Math.max(...values);
  const barH = (H - pad.top - pad.bottom) / labels.length - 8;

  labels.forEach((label, i) => {
    const y = pad.top + i * ((H - pad.top - pad.bottom) / labels.length);
    const barW = ((values[i] / max) * (W - pad.left - pad.right));
    ctx.fillStyle = color + 'dd';
    roundRect(ctx, pad.left, y + 2, Math.max(barW, 4), barH, 4);
    ctx.fill();
    ctx.fillStyle = '#64748b'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(label, pad.left - 6, y + barH / 2 + 4);
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(values[i], pad.left + barW + 6, y + barH / 2 + 4);
  });
}

/* ── VERTICAL BAR CHART ── */
function drawVBar(canvasId, labels, values, colors) {
  const canvas = clearCanvas(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 24, right: 16, bottom: 56, left: 36 };
  const max = Math.max(...values);
  const n = labels.length;
  const slotW = (W - pad.left - pad.right) / n;
  const barW = slotW * 0.55;

  // Grid
  ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + ((H - pad.top - pad.bottom) / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  }

  values.forEach((v, i) => {
    const bH = (v / max) * (H - pad.top - pad.bottom);
    const x = pad.left + i * slotW + (slotW - barW) / 2;
    const y = H - pad.bottom - bH;
    ctx.fillStyle = (Array.isArray(colors) ? colors[i] : colors) + 'dd';
    roundRect(ctx, x, y, barW, bH, 4);
    ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(v, x + barW / 2, y - 6);
    ctx.fillStyle = '#64748b'; ctx.font = '9px system-ui';
    const words = labels[i].split(' ');
    words.forEach((w, wi) => ctx.fillText(w, x + barW / 2, H - pad.bottom + 13 + wi * 11));
  });
}
