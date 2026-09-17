'use strict';
/** Stable per-PC identifier used for optional machine-locked licenses. */
const os = require('node:os');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { formatMachineId } = require('./license');

function rawMachineId() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
      const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/);
      if (m) return 'win:' + m[1].toLowerCase();
    } else if (process.platform === 'linux') {
      for (const f of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
        if (fs.existsSync(f)) return 'linux:' + fs.readFileSync(f, 'utf8').trim();
      }
    } else if (process.platform === 'darwin') {
      const out = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8', timeout: 5000 });
      const m = out.match(/IOPlatformUUID" = "([^"]+)"/);
      if (m) return 'mac:' + m[1];
    }
  } catch { /* fall through */ }
  const cpu = (os.cpus()[0] || {}).model || 'cpu';
  return `fallback:${os.hostname()}:${cpu}:${os.arch()}`;
}

let cached = null;
function getMachineId() {
  if (!cached) cached = formatMachineId(rawMachineId());
  return cached;
}

module.exports = { getMachineId };
