# قائمة الإصدار خطوة بخطوة (من جهاز البائع) / Vendor release checklist

> الرابط الثابت للعميل يعمل فقط بعد نشر أول إصدار **في مستودع عام**. ما دام لا يوجد إصدار منشور يظهر 404.

## المرة الأولى فقط

### 1) تجهيز الجهاز
- ثبّت **Git** من https://git-scm.com/download/win و**Node.js 22 LTS** من https://nodejs.org (اختر النسخة LTS).
- افتح PowerShell ونفّذ:
```powershell
git clone https://github.com/asfantrading-create/power-plant-for-the-arab-world.git
cd power-plant-for-the-arab-world
git checkout claude/magical-noether-t9t7zw     # أو main بعد الدمج
npm install
```

### 2) توليد مفاتيح الترخيص (إلزامي – بدونها يرفض سير الإصدار البناء)
```powershell
npm run license -- keygen
```
- يُنشئ المفتاح الخاص في `tools\license-cli\keys\vendor-private.pem` (**لا يُرفع إلى GitHub أبداً؛ خذ نسخة احتياطية على قرص خارجي**).
- يضمّن المفتاح العام في `src\main\services\license-keys.js`. ارفعه:
```powershell
git add src/main/services/license-keys.js
git commit -m "Add production license public key"
git push
```

### 3) اختيار مكان نشر الإصدارات (لأن المستودع الحالي خاص)
**الخيار أ – الأبسط:** اجعل المستودع عاماً: Settings → Danger Zone → Change visibility → Public. (الكود سيكون مرئياً للجميع.)

**الخيار ب – الموصى به تجارياً:** أبقِ الكود خاصاً وأنشئ مستودعاً عاماً للإصدارات فقط:
1. على GitHub: New repository → الاسم مثلاً `arab-power-twin-releases` → **Public** → فعّل «Add a README file» (يجب أن يحتوي التزاماً واحداً على الأقل) → Create.
2. أنشئ رمز وصول: Settings (حسابك) → Developer settings → Personal access tokens → Fine-grained tokens → Generate: Repository access = المستودع `arab-power-twin-releases` فقط، Permissions → Contents: **Read and write**. انسخ الرمز.
3. في مستودع الكود: Settings → Secrets and variables → Actions:
   - Secrets → New repository secret: الاسم `GH_RELEASE_TOKEN`، القيمة = الرمز.
   - Variables → New repository variable: الاسم `RELEASE_REPO`، القيمة `arab-power-twin-releases`.
4. يصبح رابط التحميل الثابت:
   `https://github.com/asfantrading-create/arab-power-twin-releases/releases/latest/download/ArabPowerTwin-Setup.exe`

### 4) دمج فرع العمل في main (مرة واحدة)
على GitHub: Pull requests → New pull request → base: `main`، compare: `claude/magical-noether-t9t7zw` → Create → Merge. ثم محلياً: `git checkout main && git pull`.

## عند كل إصدار (الأول والتالية)
```powershell
git checkout main
git pull
# ارفع رقم الإصدار في package.json (مثلاً 1.0.0 ثم 1.0.1 ...)
npm version 1.0.0 --no-git-tag-version
git commit -am "Release 1.0.0"
git push
git tag v1.0.0
git push origin v1.0.0
```
- إن تغيّرت شاشات البرنامج أعد توليد دليل المستخدم قبل الإصدار: `npm run manual:capture` ثم `npm run manual:build` (يتطلب Playwright وChromium: `npm i -g playwright && npx playwright install chromium`) وارفع ملفي `docs/manual/*.pdf` مع التعديلات.
- افتح تبويب **Actions** في المستودع وانتظر اكتمال «Release Windows installer» (10–15 دقيقة).
- **صفحة مولّد التراخيص على جهازك لا تتحدث مع المثبّت**: إن تغيّرت في هذا الإصدار نزّل الملف الواحد `tools/license-generator/ArabPowerTwin-License-Generator.html` من GitHub (main ← الملف ← Download raw file) واستبدل نسختك القديمة.
- بديل بدون أوامر: بعد الدمج في main افتح Actions ← «Release Windows installer» ← **Run workflow** ← Branch: main ← Run؛ يُنشر الإصدار برقم النسخة الموجود في `package.json`.
- بعد الاكتمال تجد في صفحة Releases (في المستودع العام): `ArabPowerTwin-Setup.exe` و`latest.yml` و`.blockmap`. الآن يعمل الرابط الثابت.
- كل نسخة مثبّتة عند العملاء ستكتشف الإصدار الجديد تلقائياً وتعرض «يتوفر تحديث جديد».

## تسليم النظام لعميل
1. أرسل له رابط التحميل الثابت.
2. أصدر له ترخيصاً من جهازك **بصفحة مولّد التراخيص** (بلا أوامر): افتح `tools\license-generator\index.html` بالنقر المزدوج، اختر ملف المفتاح الخاص `tools\license-cli\keys\vendor-private.pem`، أدخل بيانات العميل، خطة الاشتراك (**شهري** أو **سنوي** مع عدد الفترات وتاريخ البدء، أو تاريخ انتهاء محدد)، عدد المقاعد (0 = غير محدود)، معرّف الجهاز إن أردت ربطه بجهاز واحد (يقرأه العميل من شاشة التفعيل `APT-XXXX-...`)، والوحدات والتقنيات المشمولة، ثم «توليد مفتاح الترخيص» و«تنزيل ملف .lic». الشرح الكامل في [LICENSING.md](LICENSING.md).
   البديل بالأوامر:
```powershell
# اشتراك سنوي يبدأ اليوم
npm run license -- issue --name "د. أحمد" --org "جامعة X" --email a@x.edu --plan yearly --seats 40 --out "جامعة-X.lic"
# اشتراك شهري (3 أشهر) يبدأ في تاريخ محدد
npm run license -- issue --org "شركة Y" --plan monthly --periods 3 --start 2026-10-01 --seats 10 --out "Y.lic"
# ينتهي في تاريخ محدد
npm run license -- issue --org "شركة Y" --plan custom --expires 2027-09-30 --seats 10 --out "Y.lic"
# مرتبط بجهاز واحد: اطلب من العميل «معرّف الجهاز» الظاهر في شاشة التفعيل (APT-XXXX-...) ثم:
npm run license -- issue --org "معهد Z" --machine APT-1A2B-3C4D-5E6F-7A8B --out "Z.lic"
# وحدات وتقنيات محددة فقط (الباقي مقفل في البرنامج)
npm run license -- issue --org "كلية W" --modules twin --technologies pv,wind_onshore --out "W.lic"
```
   **لموظفيك فقط**: ترخيص داخلي بلا تاريخ انتهاء (`--plan staff`) لا يظهر في صفحة المولّد إلا في وضع الموظفين: افتح الصفحة بـ `index.html#staff` أو اضغط Ctrl+Shift+S داخلها (واضغطه مرة أخرى لإخفائه قبل مشاركة الشاشة مع عميل). البرنامج لا يعرض للعميل أي خيار «مدى الحياة».
   **التجديد**: أصدر مفتاحاً جديداً بالخطة نفسها (تاريخ البدء = تاريخ انتهاء الاشتراك الحالي) وأرسله للعميل ليفعّله من الإدارة ← الترخيص، أو من شاشة التفعيل إن كان الاشتراك قد انتهى؛ بياناته لا تتأثر.
3. أرسل ملف `.lic` (أو النص الذي يبدأ بـ `APT1.`) للعميل. عند أول تشغيل: يلصق المفتاح → ينشئ حساب المشرف العام (المدرّس/المسؤول) → يضيف الطلاب من «الإدارة ← المستخدمون» (يدوياً أو CSV).
4. لمعمل جامعة بعدة أجهزة: ثبّت البرنامج على كل جهاز وفعّله بنفس المفتاح، وفي «الإعدادات ← مجلد البيانات المشترك» اختر مجلداً على الشبكة نفسه على جميع الأجهزة.
5. للتجديد أو زيادة المقاعد أو إضافة تقنيات/وحدات: أصدر مفتاحاً جديداً ويدخله العميل من «الإدارة ← الترخيص» فيحل محل القديم.

## اختبار المثبّت على جهازك قبل البيع
بعد الخطوة 2 يمكنك بناء المثبّت محلياً على ويندوز دون نشر:
```powershell
npm run dist:win
```
المثبّت في `release\ArabPowerTwin-Setup.exe`. أصدر لنفسك ترخيصاً تجريبياً من صفحة المولّد (أو بالأمر `issue`) وفعّل البرنامج به.
