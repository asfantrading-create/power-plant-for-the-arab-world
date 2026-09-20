<div dir="rtl">

# التوأم الرقمي لمحطات الطاقة في الوطن العربي — Arab Power Twin

برنامج تعليمي لأنظمة ويندوز (ملف `.exe` واحد) يقدّم **محاكاة رقمية (Digital Twin)** لمحطات طاقة حقيقية في **22 دولة عربية**، مع بيانات حقيقية لأكثر من **620 محطة** (غاز، بخار، نووي، شمسي كهروضوئي، شمسي مركّز، رياح، كهرومائي، ديزل، فحم، نفايات)، ونماذج ثلاثية الأبعاد، وبنك أسئلة واختبارات لتقييم الطلاب، ونظام مستخدمين بصلاحيات (مشرف عام / مدرّس / طالب)، وترخيص تجاري (مدى الحياة أو محدد المدة)، وتحديثات تلقائية.

## المزايا الرئيسية

| المجال | ما يقدمه البرنامج |
|---|---|
| **قاعدة بيانات المحطات** | 620 محطة حقيقية من قاعدة WRI العالمية (CC BY 4.0) + إضافات منسّقة حتى 2026 (براكة، الضبعة، بني سويف/البرلس/العاصمة، الظفرة، مجمع محمد بن راشد، نور ورزازات، بنبان، سدير، الشعيبة، دومة الجندل، جازان، العطارات…) مع الإحداثيات والقدرة والتقنية وسنة التشغيل والمالك والمصدر |
| **الخريطة والمستكشف** | خريطة تفاعلية دون اتصال بالإنترنت، تصفية حسب الدولة/التقنية/القدرة، صفحة تفصيلية لكل محطة مع شرح التقنية |
| **التوأم الرقمي** | محاكاة فيزيائية مبسّطة لكل تقنية (موقع الشمس الفعلي من الإحداثيات والوقت، منحنى قدرة توربينات الرياح، معادلة الطاقة الكهرومائية، الكفاءة والوقود وانبعاثات CO₂، الإقلاع والفصل، تردد الشبكة) + مشهد ثلاثي الأبعاد مفصّل لكل تقنية (مداخن، أبراج تبريد، غلايات، قاعات توربينات، خزانات، محطات تحويل، حقول شمسية ورياح، سدود) على موقع واقعي بسماء فيزيائية وظلال وتضاريس وبحر للمحطات الساحلية، ونماذج مخصصة للمحطات المميزة (براكة، السد العالي، نور ورزازات، مجمع محمد بن راشد…) + سيناريوهات تدريبية (فصل مفاجئ، موجة حر، عاصفة غبار…) |
| **التقييم** | بنك أسئلة ثنائي اللغة (120+ سؤالاً في 10 موضوعات) + أسئلة مولّدة تلقائياً من بيانات المحطات الحقيقية، اختبارات رسمية يعدّها المدرّس (مدة، درجة نجاح، عدد محاولات، مجموعات) واختبارات تدريبية ذاتية |
| **الإدارة** | المشرف العام (مثل أستاذ المقرر) يضيف الطلاب (يدوياً أو من CSV) والمجموعات، ويرى نتائج كل طالب وإحصاءات الصف وجلسات المحاكاة، ويصدّر النتائج كملفات CSV/JSON/PDF على الجهاز |
| **الترخيص** | مفاتيح موقّعة رقمياً (Ed25519) يصدرها البائع من صفحة مولّد تراخيص تعمل في المتصفح: مدى الحياة أو بتاريخ انتهاء، مع إمكانية ربطها بجهاز معيّن، وتحدد الوحدات والتقنيات المشمولة وعدد المقاعد، والتحقق يتم دون إنترنت |
| **التحديثات** | يتحقق البرنامج تلقائياً من إصدارات GitHub؛ عند وجود إصدار أحدث يظهر إشعار ويُثبَّت بنقرة واحدة |
| **اللغة** | عربي (افتراضي، RTL) وإنجليزي، مظهر داكن/فاتح |
| **دليل المستخدم** | دليلا مستخدم PDF بالعربية والإنجليزية مع صور لكل شاشة، مضمّنان في البرنامج (قائمة «مساعدة» وصفحة «حول البرنامج») وفي `docs/manual/` |
| **الدعم** | توقيع شركة أصفان في أسفل كل شاشة: `info@asfanco.com` · واتساب `+962 77 614 0404` |

## رابط التحميل الثابت للعملاء

بعد أول إصدار (انظر أدناه) يكون رابط التحميل الدائم:

`https://github.com/asfantrading-create/power-plant-for-the-arab-world/releases/latest/download/ArabPowerTwin-Setup.exe`

الرابط لا يتغير مع الإصدارات الجديدة لأن اسم ملف المثبّت ثابت.

## خطوات البائع (مرة واحدة قبل أول إصدار)

1. استنسخ المستودع على جهازك وثبّت Node.js 22 ثم `npm install`.
2. ولّد مفاتيح الترخيص: `npm run license -- keygen` — يُنشئ المفتاح الخاص في `tools/license-cli/keys/vendor-private.pem` (**لا يُرفع إلى git، احتفظ بنسخة احتياطية**) ويضمّن المفتاح العام في `src/main/services/license-keys.js`.
3. ارفع التغيير: `git add src/main/services/license-keys.js && git commit -m "Add production license key" && git push`.
4. أصدر النسخة: عدّل `"version"` في `package.json` ثم:
   `git tag v1.0.0 && git push origin v1.0.0`
   سيبني GitHub Actions المثبّت على ويندوز وينشره في صفحة Releases مع ملف `latest.yml` الذي تعتمد عليه التحديثات التلقائية. (يجب أن يكون المستودع **عاماً** أو تستخدم خادم تحديثات خاصاً — انظر `docs/RELEASES.md`).

## إصدار ترخيص لعميل

**الطريقة الأسهل – صفحة مولّد التراخيص:** افتح `tools\license-generator\index.html` بالنقر المزدوج (يعمل في المتصفح دون إنترنت)، حمّل المفتاح الخاص `vendor-private.pem`، أدخل بيانات العميل ونوع الترخيص (مدى الحياة أو تاريخ انتهاء) وعدد المقاعد ومعرّف الجهاز إن أردت، وحدد الوحدات (التوأم الرقمي / الاختبارات) والتقنيات المشمولة، ثم «توليد» و«تنزيل ملف .lic». الصلاحيات تُفرض داخل البرنامج: الوحدة غير المشمولة تختفي، ومحطات التقنيات غير المشمولة تظهر مقفلة 🔒، والمقاعد حد أقصى للحسابات النشطة. التفاصيل في [docs/LICENSING.md](docs/LICENSING.md).

**أو بالأوامر:**
```bash
# مدى الحياة
npm run license -- issue --name "د. أحمد" --org "جامعة الملك سعود" --email a@ksu.edu.sa --seats 40 --out ksu.lic
# محدد المدة (ينتهي 30-09-2027)
npm run license -- issue --org "شركة كهرباء X" --type term --expires 2027-09-30 --seats 10 --out x.lic
# مرتبط بجهاز واحد (يظهر معرّف الجهاز في شاشة التفعيل عند العميل)
npm run license -- issue --org "معهد Y" --machine APT-1A2B-3C4D-5E6F-7A8B --out y.lic
# وحدات وتقنيات محددة (الباقي يظهر مقفلاً في البرنامج)
npm run license -- issue --org "كلية Z" --modules twin --technologies pv,csp_tower,wind_onshore --out z.lic
```
يرسل العميل مفتاحه (نص يبدأ بـ `APT1.`) في شاشة التفعيل، ثم يُنشئ حساب المشرف العام، ثم يضيف الطلاب.

## التطوير المحلي

```bash
npm install
npm start              # يبني الواجهة ويشغّل Electron (تُقبل مفاتيح التطوير في هذا الوضع)
npm test               # اختبارات الوحدات
npm run dist:win       # بناء المثبّت محلياً على ويندوز
npm run manual:capture # جولة تصوير آلية لكل الشاشات (Playwright + Chromium) إلى .tmp/manual-shots
npm run manual:build   # بناء دليلي المستخدم PDF في docs/manual
```
مفتاح تطوير جاهز للتجربة: `tools/license-cli/dev-keys/dev-license.lic` (لا يعمل في النسخة المثبّتة).

المزيد: [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md) (خطوات البائع كاملة) · [docs/INSTALL.md](docs/INSTALL.md) · [docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md) · [docs/LICENSING.md](docs/LICENSING.md) · [docs/RELEASES.md](docs/RELEASES.md) · [docs/DATA.md](docs/DATA.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

</div>

---

# Arab Power Twin (English)

An educational Windows desktop application (single `.exe` installer) that provides a **digital twin** of real power plants across the **22 Arab League countries**: a database of **620+ real plants** (WRI Global Power Plant Database + curated 2019–2026 additions), an offline interactive map, plant information pages, a physics-based simulation with detailed procedural 3D scenes per technology on realistic sites (physical sky, shadows, terrain, coastline) and bespoke models for landmark plants, a bilingual question bank with auto-generated questions from real data, formal and practice exams, role-based accounts (super admin / instructor / student), per-student results with CSV/JSON/PDF export, signed offline licensing (lifetime or term, optional machine lock, licensed modules, technologies and seats) and automatic updates from GitHub Releases.

**Permanent customer download link** (after the first release):
`https://github.com/asfantrading-create/power-plant-for-the-arab-world/releases/latest/download/ArabPowerTwin-Setup.exe`

**Vendor one-time setup:** `npm install` → `npm run license -- keygen` → commit `src/main/services/license-keys.js` → bump `version` in `package.json` → `git tag vX.Y.Z && git push origin vX.Y.Z`. GitHub Actions builds the Windows installer and publishes it together with `latest.yml` (the auto-update feed).

**Issue a license:** double-click `tools/license-generator/index.html` (runs offline in the browser), load `vendor-private.pem`, fill in the customer, type, seats, optional machine ID, modules and technologies, then download the `.lic` file. CLI equivalent: `npm run license -- issue --org "University X" [--type term --expires 2027-09-30] [--seats 40] [--machine APT-....] [--modules twin,exams] [--technologies pv,wind_onshore] --out x.lic`. The app enforces the licensed modules (twin / exams), technologies (others show locked) and seats (maximum active accounts).

**Develop:** `npm start` (dev license keys accepted), `npm test`, `npm run dist:win` (on Windows).

**User manuals:** Arabic and English PDF manuals with a screenshot of every screen live in `docs/manual/`, ship inside the installer and open from the Help menu or the About page. Regenerate them after UI changes with `npm run manual:capture && npm run manual:build` (needs Playwright with Chromium). Every screen carries the Asfan Co. signature (`info@asfanco.com`, WhatsApp +962 77 614 0404).

See the `docs/` folder for installation, administration, licensing, release/update and data-source guides. Data: WRI GPPD v1.3.0 (CC BY 4.0), Natural Earth (public domain), Cairo font (OFL). This is an educational product; simulations are simplified models, not live plant data.
