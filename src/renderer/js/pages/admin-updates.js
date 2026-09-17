import { t } from '../i18n.js';
import { api, onEvent } from '../api.js';
import { state, setState } from '../state.js';
import { h, icon, progress, clear } from '../ui.js';

export async function render(container, params, ctx) {
  ctx.setTitle(t('updates.title'));
  const box = h('div', { class: 'card' });
  function draw(u) {
    clear(box);
    box.append(h('h3', null, `${t('updates.current')}: v${state.boot.version}`));
    const st = u || state.updater || {};
    if (st.status === 'disabled-dev') box.append(h('div', { class: 'alert warn' }, t('updates.disabledDev')));
    else if (st.status === 'checking') box.append(h('div', { class: 'alert info' }, t('updates.checking')));
    else if (st.status === 'available') box.append(h('div', { class: 'alert info' }, t('updates.available', { v: st.version })), st.releaseNotes ? h('details', { class: 'expander' }, h('summary', null, t('updates.releaseNotes')), h('div', { html: st.releaseNotes })) : null, h('button', { class: 'btn primary', onClick: () => api('updater:download') }, icon('download'), t('updates.download')));
    else if (st.status === 'downloading') box.append(h('div', { class: 'alert info' }, t('updates.downloading', { p: st.progress ? st.progress.percent : 0 })), progress(st.progress ? st.progress.percent : 0));
    else if (st.status === 'downloaded') box.append(h('div', { class: 'alert success' }, t('updates.downloaded', { v: st.version })), h('button', { class: 'btn primary', onClick: () => api('updater:install') }, icon('update'), t('updates.install')));
    else if (st.status === 'up-to-date') box.append(h('div', { class: 'alert success' }, t('updates.upToDate')));
    else if (st.status === 'error') box.append(h('div', { class: 'alert error' }, t('updates.error', { e: st.error })));
    box.append(h('div', { class: 'mt' }, h('button', { class: 'btn', disabled: st.status === 'disabled-dev', onClick: () => api('updater:check') }, icon('update'), t('updates.check'))));
  }
  draw();
  const off = onEvent('updater:event', s => { setState({ updater: s }); draw(s); });
  container.append(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('updates.title')))), h('div', { class: 'grid cols-2' }, box, h('div', { class: 'card' }, h('h3', null, t('updates.how')), h('p', null, t('updates.howText')))));
  return off;
}
