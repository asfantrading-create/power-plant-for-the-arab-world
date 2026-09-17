import { t, errorMessage } from '../i18n.js';
import { api } from '../api.js';
import { h, icon, toast, field } from '../ui.js';

export function render({ onDone }) {
  const inst = h('input', { type: 'text' });
  const username = h('input', { type: 'text', autocomplete: 'off', placeholder: 'admin' });
  const display = h('input', { type: 'text' });
  const pw = h('input', { type: 'password' });
  const pw2 = h('input', { type: 'password' });
  const msg = h('div');
  async function submit(e) {
    e.preventDefault();
    if (pw.value !== pw2.value) { msg.replaceChildren(h('div', { class: 'alert error' }, t('setup.mismatch'))); return; }
    try {
      await api('setup:createSuperAdmin', { username: username.value, password: pw.value, displayName: display.value, institutionName: inst.value });
      toast(t('common.saved'), 'success'); onDone();
    } catch (err) { msg.replaceChildren(h('div', { class: 'alert error' }, errorMessage(err.code))); }
  }
  return h('form', { class: 'auth-card', onSubmit: submit },
    h('div', { class: 'logo' }, h('img', { src: 'assets/logo.png', alt: '' }), h('div', null, h('h1', null, t('setup.title')), h('p', null, t('app.name')))),
    h('p', null, t('setup.intro')),
    field(t('setup.institution'), inst), field(t('setup.username'), username), field(t('setup.displayName'), display),
    field(t('setup.password'), pw), field(t('setup.password2'), pw2),
    msg,
    h('button', { class: 'btn primary lg block', type: 'submit' }, icon('check'), t('setup.create')));
}
