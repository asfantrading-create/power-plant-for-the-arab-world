import { t, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { state } from '../state.js';
import { h, icon, field } from '../ui.js';

export function render({ onLogin }) {
  const username = h('input', { type: 'text', autocomplete: 'username', autofocus: true });
  const pw = h('input', { type: 'password', autocomplete: 'current-password' });
  const msg = h('div');
  const lic = state.license || {};
  async function submit(e) {
    e.preventDefault();
    try { await api('auth:login', { username: username.value, password: pw.value }); onLogin(); }
    catch (err) { msg.replaceChildren(h('div', { class: 'alert error' }, errorMessage(err.code))); }
  }
  const daysLeft = lic.daysLeft;
  return h('form', { class: 'auth-card', onSubmit: submit },
    h('div', { class: 'logo' }, h('img', { src: 'assets/logo.png', alt: '' }), h('div', null, h('h1', null, t('app.name')), h('p', null, state.settings.institutionName || t('app.tagline')))),
    daysLeft !== null && daysLeft !== undefined && daysLeft <= 30 ? h('div', { class: 'alert warn small' }, t('license.expiringSoon', { n: daysLeft })) : null,
    field(t('login.username'), username), field(t('login.password'), pw), msg,
    h('button', { class: 'btn primary lg block', type: 'submit' }, icon('arrow'), t('login.submit')),
    h('div', { class: 'muted small mt', style: { lineHeight: 1.8 } },
      lic.license ? h('div', null, `${t('login.licensedTo')}: ${lic.license.licensee.org || lic.license.licensee.name}`) : null,
      h('div', null, `${t('login.workspace')}: `, h('span', { class: 'mono' }, state.boot.workspaceDir)),
      h('div', null, `v${state.boot.version}`)));
}
