import { t, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { h, icon, toast, selectEl, field, confirmDialog, statCard, fmt } from '../ui.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('workspace.title'));
  const info = await api('workspace:info');
  const mode = selectEl([{ value: 'merge', label: t('workspace.merge') }, { value: 'overwrite', label: t('workspace.overwrite') }], 'merge');
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('workspace.title')), h('p', { class: 'mono' }, info.dir))),
    info.error ? h('div', { class: 'alert error' }, t('workspace.error', { e: info.error })) : null,
    h('div', { class: 'grid cols-4 mb' }, statCard('users', fmt.num(info.users), t('workspace.users')), statCard('group', fmt.num(info.groups), t('workspace.groups')), statCard('exam', fmt.num(info.exams), t('workspace.exams')), statCard('results', fmt.num(info.attempts), t('workspace.attempts'))),
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'card' }, h('h3', null, t('workspace.backup')), h('button', { class: 'btn primary', onClick: async () => { try { const r = await api('workspace:backup'); if (!r.canceled) toast(t('common.savedTo', { path: r.path }), 'success', 6000); } catch (err) { toast(errorMessage(err.code), 'error'); } } }, icon('download'), t('workspace.backup'))),
      h('div', { class: 'card' }, h('h3', null, t('workspace.restore')), field(t('workspace.restoreMode'), mode), h('button', { class: 'btn', onClick: async () => {
        const f = await api('app:openFileText', { filters: [{ name: 'JSON', extensions: ['json'] }] }); if (!f) return;
        if (!(await confirmDialog(t('workspace.restore') + '?'))) return;
        try { const r = await api('workspace:restore', { text: f.text, mode: mode.value }); toast(t('workspace.restored', { n: r.restored }), 'success'); } catch (err) { toast(errorMessage(err.code), 'error'); }
      } }, icon('file'), t('workspace.restore')))));
}
