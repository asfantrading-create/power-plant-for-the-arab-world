'use strict';
/** CSV / JSON / PDF / HTML export helpers (files are written where the user chooses). */
const fs = require('node:fs');
const path = require('node:path');
const { dialog, BrowserWindow, app } = require('electron');

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** rows: array of objects; columns: [{key, label}] */
function toCsv(rows, columns) {
  const header = columns.map(c => csvEscape(c.label)).join(',');
  const body = rows.map(r => columns.map(c => csvEscape(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','));
  return '﻿' + [header, ...body].join('\r\n') + '\r\n'; // BOM so Excel opens Arabic correctly
}

async function chooseSavePath(win, { suggestedName, filters }) {
  const res = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('documents'), suggestedName),
    filters,
  });
  return res.canceled ? null : res.filePath;
}

async function exportCsv(win, { rows, columns, suggestedName }) {
  const file = await chooseSavePath(win, { suggestedName: suggestedName || 'export.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (!file) return { canceled: true };
  fs.writeFileSync(file, toCsv(rows, columns), 'utf8');
  return { canceled: false, path: file };
}

async function exportJson(win, { data, suggestedName }) {
  const file = await chooseSavePath(win, { suggestedName: suggestedName || 'export.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (!file) return { canceled: true };
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return { canceled: false, path: file };
}

async function exportHtml(win, { html, suggestedName }) {
  const file = await chooseSavePath(win, { suggestedName: suggestedName || 'report.html', filters: [{ name: 'HTML', extensions: ['html'] }] });
  if (!file) return { canceled: true };
  fs.writeFileSync(file, html, 'utf8');
  return { canceled: false, path: file };
}

async function renderPdf(html, { landscape = false } = {}) {
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, offscreen: true } });
  try {
    await w.loadURL('data:text/html;charset=utf-8;base64,' + Buffer.from(html, 'utf8').toString('base64'));
    await new Promise(r => setTimeout(r, 250));
    return await w.webContents.printToPDF({ landscape, printBackground: true, pageSize: 'A4', margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 } });
  } finally { w.destroy(); }
}

async function exportPdf(win, { html, suggestedName, landscape }) {
  const file = await chooseSavePath(win, { suggestedName: suggestedName || 'report.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (!file) return { canceled: true };
  const buf = await renderPdf(html, { landscape });
  fs.writeFileSync(file, buf);
  return { canceled: false, path: file };
}

async function saveTextFile(win, { text, suggestedName, filters }) {
  const file = await chooseSavePath(win, { suggestedName, filters: filters || [{ name: 'All files', extensions: ['*'] }] });
  if (!file) return { canceled: true };
  fs.writeFileSync(file, text, 'utf8');
  return { canceled: false, path: file };
}

module.exports = { toCsv, exportCsv, exportJson, exportHtml, exportPdf, renderPdf, saveTextFile, csvEscape };
