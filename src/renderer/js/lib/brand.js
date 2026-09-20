// Vendor signature: Asfan company logo and contact details shown on every main screen, the About page and printed reports.
import { t, extend, isAr } from '../i18n.js';
import { api } from '../api.js';
import { h } from '../ui.js';

export const BRAND = {
  nameAr: 'شركة أصفان', nameEn: 'Asfan Co.',
  email: 'info@asfanco.com',
  whatsapp: '+962 77 614 0404', whatsappDigits: '962776140404',
  logo: 'assets/asfan-logo.png', // replace this file with the official logo (PNG, transparent background, ~4:1)
};
export const brandName = () => (isAr() ? BRAND.nameAr : BRAND.nameEn);

extend({
  ar: { 'brand.company': BRAND.nameAr, 'brand.developedBy': 'تطوير وتوزيع', 'brand.rights': 'جميع الحقوق محفوظة', 'brand.contact': 'للتواصل والدعم الفني', 'brand.email': 'البريد الإلكتروني', 'brand.whatsapp': 'واتساب', 'about.company': 'الشركة المطوّرة', 'about.companyText': 'برنامج Arab Power Twin من تطوير وتوزيع شركة أصفان. للاستفسارات والتراخيص والدعم الفني تواصل معنا عبر البريد الإلكتروني أو واتساب.', 'about.manual': 'دليل المستخدم', 'about.manualAr': 'الدليل بالعربية (PDF)', 'about.manualEn': 'الدليل بالإنجليزية (PDF)', 'errors.manual_missing': 'ملف الدليل غير موجود في هذه النسخة' },
  en: { 'brand.company': BRAND.nameEn, 'brand.developedBy': 'Developed and distributed by', 'brand.rights': 'All rights reserved', 'brand.contact': 'Contact and technical support', 'brand.email': 'E-mail', 'brand.whatsapp': 'WhatsApp', 'about.company': 'Developer', 'about.companyText': 'Arab Power Twin is developed and distributed by Asfan Co. For enquiries, licensing and technical support contact us by e-mail or WhatsApp.', 'about.manual': 'User manual', 'about.manualAr': 'Arabic manual (PDF)', 'about.manualEn': 'English manual (PDF)', 'errors.manual_missing': 'The manual file is not included in this copy' },
});

const MAIL_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
const WA_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.2-5.4A8.5 8.5 0 1 1 21 11.5z"/><path d="M9 10.5c.3 1.5 1.5 3 3.5 3.8l1.2-1.1 2 .7-.2 1.6c-3.4.5-7.3-3.3-7.1-6.8l1.6-.2.7 2z"/></svg>';

export function openEmail() { api('app:openExternal', { url: `mailto:${BRAND.email}` }).catch(() => {}); }
export function openWhatsApp() { api('app:openExternal', { url: `https://wa.me/${BRAND.whatsappDigits}` }).catch(() => {}); }
export function contactLinks() {
  return [
    h('a', { href: '#', class: 'brand-link', title: t('brand.email'), onClick: e => { e.preventDefault(); openEmail(); } }, h('span', { class: 'brand-ico', html: MAIL_SVG }), BRAND.email),
    h('a', { href: '#', class: 'brand-link', title: t('brand.whatsapp'), onClick: e => { e.preventDefault(); openWhatsApp(); } }, h('span', { class: 'brand-ico', html: WA_SVG }), BRAND.whatsapp),
  ];
}
/** Signature footer: logo, company name, copyright and contact links. `compact` for the activation/setup/login cards. */
export function brandFooter(opts = {}) {
  return h('footer', { class: 'brand-footer' + (opts.compact ? ' compact' : '') },
    h('div', { class: 'brand-left' }, h('img', { src: BRAND.logo, alt: brandName(), class: 'brand-logo' }), h('div', null, h('b', null, t('brand.company')), h('small', null, `${t('brand.developedBy')} ${t('brand.company')} · © ${new Date().getFullYear()} ${t('brand.rights')}`))),
    h('div', { class: 'brand-contact' }, ...contactLinks()));
}
