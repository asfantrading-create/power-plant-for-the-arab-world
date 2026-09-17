import { t, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { isRole } from '../state.js';
import { h, icon, toast, modal, confirmDialog, field, dataTable } from '../ui.js';
import { navigate } from '../app.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('admin.groups.title'));
  const box = h('div');
  async function load() {
    const [groups, users] = await Promise.all([api('groups:list'), api('users:list')]);
    box.replaceChildren(dataTable({ rows: groups, columns: [
      { key: 'name', label: t('common.name'), render: v => h('b', null, v) }, { key: 'description', label: t('admin.groups.desc') },
      { key: 'members', label: t('admin.groups.members'), get: g => users.filter(u => u.groupId === g.id).length, render: (v, g) => h('a', { href: `#/admin/users?group=${g.id}` }, String(v)) },
      { key: 'actions', label: t('common.actions'), sort: false, render: (_, g) => h('div', { class: 'flex' }, h('button', { class: 'btn sm', onClick: () => edit(g) }, icon('settings')), h('button', { class: 'btn sm', onClick: () => navigate(`/admin/results?groupId=${g.id}`) }, icon('results')), isRole('superadmin') ? h('button', { class: 'btn sm danger', onClick: async () => { if (await confirmDialog(t('common.confirmDelete'), { danger: true })) { await api('groups:remove', { id: g.id }); load(); } } }, icon('x')) : null) },
    ] }));
  }
  function edit(g) {
    const name = h('input', { type: 'text', value: g ? g.name : '' }); const desc = h('textarea', null, g ? g.description : '');
    modal({ title: g ? t('common.edit') : t('admin.groups.add'), body: h('div', null, field(t('common.name'), name), field(t('admin.groups.desc'), desc)), actions: [{ label: t('common.cancel'), class: 'ghost' }, { label: t('common.save'), class: 'primary', onClick: async () => { try { if (g) await api('groups:update', { id: g.id, patch: { name: name.value, description: desc.value } }); else await api('groups:create', { name: name.value, description: desc.value }); toast(t('common.saved'), 'success'); load(); } catch (err) { toast(errorMessage(err.code), 'error'); return false; } } }] });
  }
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('admin.groups.title'))), h('button', { class: 'btn primary', onClick: () => edit(null) }, icon('plus'), t('admin.groups.add'))), box);
  await load();
}
