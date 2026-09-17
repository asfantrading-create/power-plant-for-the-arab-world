import { t, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { state, isRole } from '../state.js';
import { h, icon, toast, modal, confirmDialog, field, selectEl, dataTable, badge, fmt, promptDialog } from '../ui.js';
import { navigate } from '../app.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('admin.users.title'));
  let users = [], groups = [];
  const tableBox = h('div');
  const search = h('input', { type: 'search', placeholder: t('common.search'), class: 'search' });
  const roleSel = selectEl([{ value: '', label: t('common.all') }, { value: 'student', label: t('role.student') }, { value: 'instructor', label: t('role.instructor') }, { value: 'superadmin', label: t('role.superadmin') }], '');
  const groupSel = h('select');
  async function load() {
    [users, groups] = await Promise.all([api('users:list'), api('groups:list')]);
    groupSel.replaceChildren(h('option', { value: '' }, t('common.all') + ' – ' + t('admin.users.group')), ...groups.map(g => h('option', { value: g.id }, g.name)));
    draw();
  }
  const gname = id => (groups.find(g => g.id === id) || {}).name || '—';
  function draw() {
    const q = search.value.trim().toLowerCase();
    const rows = users.filter(u => (!roleSel.value || u.role === roleSel.value) && (!groupSel.value || u.groupId === groupSel.value) && (!q || u.username.toLowerCase().includes(q) || (u.displayName || '').toLowerCase().includes(q) || (u.studentNumber || '').includes(q)));
    tableBox.replaceChildren(dataTable({ rows, pageSize: 25, initialSort: { key: 'displayName', dir: 1 }, columns: [
      { key: 'displayName', label: t('admin.users.displayName'), render: (v, u) => h('span', null, h('b', null, v || u.username), h('div', { class: 'muted small mono' }, u.username)) },
      { key: 'role', label: t('admin.users.role'), render: v => badge(t('role.' + v), v === 'superadmin' ? 'danger' : v === 'instructor' ? 'primary' : '') },
      { key: 'groupId', label: t('admin.users.group'), get: u => gname(u.groupId) },
      { key: 'studentNumber', label: t('admin.users.studentNumber') },
      { key: 'lastLoginAt', label: t('admin.users.lastLogin'), render: v => fmt.datetime(v) },
      { key: 'active', label: t('common.status'), render: v => badge(v === false ? t('admin.users.inactive') : t('admin.users.active'), v === false ? 'warning' : 'success') },
      { key: 'actions', label: t('common.actions'), sort: false, class: 'actions', render: (_, u) => h('div', { class: 'flex' },
        h('button', { class: 'btn sm', title: t('admin.users.viewResults'), onClick: () => navigate(`/admin/results?userId=${u.id}`) }, icon('results')),
        (isRole('superadmin') || u.role === 'student') ? h('button', { class: 'btn sm', title: t('common.edit'), onClick: () => editUser(u) }, icon('settings')) : null,
        (isRole('superadmin') || u.role === 'student') ? h('button', { class: 'btn sm', title: t('admin.users.resetPassword'), onClick: async () => { const pw = await promptDialog(t('admin.users.resetPassword'), { label: t('admin.users.newPassword'), type: 'text' }); if (!pw) return; try { await api('users:resetPassword', { id: u.id, newPassword: pw }); toast(t('common.saved'), 'success'); } catch (err) { toast(errorMessage(err.code), 'error'); } } }, icon('key')) : null,
        isRole('superadmin') && u.id !== state.user.id ? h('button', { class: 'btn sm danger', onClick: async () => { if (!(await confirmDialog(t('common.confirmDelete'), { danger: true }))) return; try { await api('users:remove', { id: u.id }); await load(); } catch (err) { toast(errorMessage(err.code), 'error'); } } }, icon('x')) : null) },
    ] }));
  }
  function userForm(u) {
    const f = { username: h('input', { type: 'text', value: u ? u.username : '', disabled: !!u }), password: h('input', { type: 'text', placeholder: u ? '' : 'student123' }), displayName: h('input', { type: 'text', value: u ? u.displayName : '' }), studentNumber: h('input', { type: 'text', value: u ? u.studentNumber || '' : '' }), email: h('input', { type: 'email', value: u ? u.email || '' : '' }),
      role: selectEl([{ value: 'student', label: t('role.student') }, ...(isRole('superadmin') ? [{ value: 'instructor', label: t('role.instructor') }, { value: 'superadmin', label: t('role.superadmin') }] : [])], u ? u.role : 'student'),
      groupId: selectEl([{ value: '', label: '—' }, ...groups.map(g => ({ value: g.id, label: g.name }))], u ? u.groupId || '' : ''), active: selectEl([{ value: 'true', label: t('admin.users.active') }, { value: 'false', label: t('admin.users.inactive') }], u ? String(u.active !== false) : 'true') };
    const body = h('div', null, field(t('admin.users.username'), f.username), !u ? field(t('admin.users.password'), f.password) : null, field(t('admin.users.displayName'), f.displayName), field(t('admin.users.role'), f.role), field(t('admin.users.group'), f.groupId), field(t('admin.users.studentNumber'), f.studentNumber), field(t('admin.users.email'), f.email), u ? field(t('common.status'), f.active) : null);
    return { body, f };
  }
  function editUser(u) {
    const { body, f } = userForm(u);
    modal({ title: u ? t('common.edit') : t('admin.users.add'), body, actions: [{ label: t('common.cancel'), class: 'ghost' }, { label: t('common.save'), class: 'primary', onClick: async () => {
      try {
        if (u) await api('users:update', { id: u.id, patch: { displayName: f.displayName.value, role: f.role.value, groupId: f.groupId.value || null, studentNumber: f.studentNumber.value, email: f.email.value, active: f.active.value === 'true' } });
        else await api('users:create', { username: f.username.value, password: f.password.value || 'student123', displayName: f.displayName.value, role: f.role.value, groupId: f.groupId.value || null, studentNumber: f.studentNumber.value, email: f.email.value });
        toast(u ? t('common.saved') : t('admin.users.created'), 'success'); await load();
      } catch (err) { toast(errorMessage(err.code), 'error'); return false; }
    } }] });
  }
  function importCsv() {
    const ta = h('textarea', { placeholder: 'username,password,displayName,studentNumber,groupName,email', style: { minHeight: '160px', direction: 'ltr', fontFamily: 'monospace' } });
    const result = h('div');
    modal({ title: t('admin.users.import'), wide: true, body: h('div', null, h('p', { class: 'muted small' }, t('admin.users.importHelp')), h('button', { class: 'btn mb', onClick: async () => { const f = await api('app:openFileText', { filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }] }); if (f) ta.value = f.text; } }, icon('file'), t('admin.users.selectFile')), field(t('admin.users.pasteCsv'), ta), result),
      actions: [{ label: t('common.close'), class: 'ghost' }, { label: t('admin.users.import'), class: 'primary', close: false, onClick: async () => {
        try { const r = await api('users:importCsv', { text: ta.value }); result.replaceChildren(h('div', { class: 'alert success' }, t('admin.users.imported', { c: r.created, s: r.skipped })), r.errors.length ? h('code', { class: 'block' }, r.errors.map(e => `${e.username}: ${errorMessage(e.error)}`).join('\n')) : null); await load(); }
        catch (err) { toast(errorMessage(err.code), 'error'); }
      } }] });
  }
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('admin.users.title'))), h('div', { class: 'flex' }, h('button', { class: 'btn', onClick: importCsv }, icon('download'), t('admin.users.import')), h('button', { class: 'btn primary', onClick: () => editUser(null) }, icon('plus'), t('admin.users.add')))),
    h('div', { class: 'toolbar' }, search, roleSel, groupSel), tableBox);
  search.addEventListener('input', draw); roleSel.addEventListener('change', draw); groupSel.addEventListener('change', draw);
  await load();
}
