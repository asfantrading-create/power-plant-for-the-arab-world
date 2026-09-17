'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const INVOKE_RE = /^(app|settings|license|setup|auth|users|groups|data|exams|attempts|practice|export|twin|updater|audit|workspace):[a-zA-Z]+$/;
const EVENTS = new Set(['updater:event', 'workspace:changed']);

contextBridge.exposeInMainWorld('api', {
  invoke(channel, payload) {
    if (!INVOKE_RE.test(channel)) return Promise.resolve({ ok: false, error: 'channel_not_allowed' });
    return ipcRenderer.invoke(channel, payload);
  },
  on(channel, callback) {
    if (!EVENTS.has(channel)) return () => {};
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
