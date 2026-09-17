import { t, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { state, setState } from '../state.js';
import { h, icon, toast, field, confirmDialog } from '../ui.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('admin.settings.title'));
  const s = await api('settings:get');
  const inst = h('input', { type: 'text', value: s.institutionName || '' });
  const ws = h('input', { type: 'text', value: s.workspaceDir || '', placeholder: state.boot.workspaceDir, class: 'mono' });
  const feed = h('input', { type: 'text', value: s.updateFeedUrl || '', placeholder: 'https://example.com/arab-power-twin/updates/', class: 'ltr' });
  const auto = h('input', { type: 'checkbox', checked: s.autoCheckUpdates !== false });
  const save = async (key, value) => { try { const all = await api('settings:set', { key, value }); setState({ settings: all }); toast(t('common.saved'), 'success'); } catch (err) { toast(errorMessage(err.code), 'error'); } };
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('admin.settings.title')))),
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'card' }, h('h3', null, t('admin.settings.institution')), field(t('admin.settings.institution'), inst), h('button', { class: 'btn primary', onClick: () => save('institutionName', inst.value) }, icon('check'), t('common.save')),
        h('h3', { class: 'mt-lg' }, t('admin.settings.workspace')), h('p', { class: 'muted small' }, t('admin.settings.workspaceHelp')), field(t('workspace.dir'), ws), state.boot.workspaceError ? h('div', { class: 'alert error' }, t('workspace.error', { e: state.boot.workspaceError })) : null,
        h('div', { class: 'flex wrap' }, h('button', { class: 'btn', onClick: async () => { const d = await api('app:chooseDirectory'); if (d) ws.value = d; } }, icon('file'), t('admin.settings.choose')),
          h('button', { class: 'btn primary', onClick: async () => { if (!(await confirmDialog(t('admin.settings.workspaceChanged')))) return; await save('workspaceDir', ws.value.trim() || null); } }, icon('check'), t('common.apply')),
          h('button', { class: 'btn ghost', onClick: async () => { ws.value = ''; if (await confirmDialog(t('admin.settings.workspaceChanged'))) await save('workspaceDir', null); } }, t('admin.settings.useDefault')))),
      h('div', { class: 'card' }, h('h3', null, t('updates.title')), field(t('admin.settings.updateFeed'), feed, t('admin.settings.updateFeedHelp')), h('label', { class: 'check mb' }, auto, t('admin.settings.autoCheck')), h('p', { class: 'muted small' }, t('admin.settings.restartNote')),
        h('button', { class: 'btn primary', onClick: async () => { await save('updateFeedUrl', feed.value.trim() || null); await save('autoCheckUpdates', auto.checked); } }, icon('check'), t('common.save')))));
}
