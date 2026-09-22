# نظام الترخيص / Licensing

## كيف يعمل
- كل ترخيص هو **مفتاح نصي موقّع رقمياً** (Ed25519) بصيغة `APT1.<payload>.<signature>` يحتوي: اسم المرخَّص له، الجهة، البريد، خطة الاشتراك (`monthly` / `yearly` / `custom` / `staff`)، تاريخ الإصدار، تاريخ الانتهاء، عدد المقاعد، معرّف الجهاز (اختياري)، الصلاحيات (الوحدات والتقنيات المشمولة)، وملاحظات.
- البرنامج يتحقق من التوقيع **دون اتصال** بالمفتاح العام المضمّن فيه. لا يمكن تزوير مفتاح أو تعديل تاريخ الانتهاء أو الصلاحيات دون المفتاح الخاص للبائع.
- تراخيص العملاء **اشتراكات** (شهرية أو سنوية أو بتاريخ محدد) تتوقف بعد تاريخ الانتهاء وتظهر شاشة التفعيل لإدخال مفتاح التجديد؛ ويرصد البرنامج إرجاع ساعة النظام للوراء ويعلّق الاشتراك حتى تصحيح التاريخ.
- الترخيص **الداخلي** (`staff`) بلا تاريخ انتهاء مخصص لموظفي الشركة فقط ولا يُباع؛ البرنامج لا يعرض للعميل أي خيار أو عبارة «مدى الحياة».
- الترخيص المرتبط بجهاز يعمل فقط على الجهاز الذي يطابق معرّفه (`APT-XXXX-…`) المستخرج من معرّف الجهاز في ويندوز.

## الصلاحيات التي يتحكم بها الترخيص
| الحقل | القيم | الأثر داخل البرنامج |
|---|---|---|
| **الخطة** `plan` | `monthly` أو `yearly` (اشتراك بعدد فترات وتاريخ بدء، يُحسب منه `expiresAt`)، `custom` (تاريخ انتهاء صريح)، `staff` (داخلي بلا انتهاء) | الاشتراك يتوقف بعد تاريخ الانتهاء وتظهر شاشة التفعيل من جديد؛ تنبيه عند الدخول قبل 30 يوماً وشريط أعلى البرنامج قبل 14 يوماً مع روابط التواصل. البرنامج يعرض «اشتراك شهري / سنوي / محدد المدة» أو «ترخيص داخلي» ولا يعرض «مدى الحياة» أبداً |
| **المقاعد** `seats` | `0` = غير محدود، أو رقم | الحد الأقصى لعدد الحسابات **النشطة** بجميع الأدوار. عند بلوغه يرفض البرنامج إضافة مستخدم أو استيراده أو إعادة تفعيل حساب معطَّل (رسالة «تم بلوغ الحد الأقصى للمقاعد») |
| **الجهاز** `machineId` | فارغ أو `APT-XXXX-XXXX-XXXX-XXXX` | يعمل فقط على الجهاز المطابق |
| **الوحدات** `features.modules` | `twin` و/أو `exams` | `twin` = التوأم الرقمي والمحاكاة ثلاثية الأبعاد وجلسات المحاكاة؛ `exams` = الاختبارات الرسمية والتدريب الذاتي والنتائج. الوحدة غير المشمولة تختفي من القوائم ويرفض البرنامج تشغيلها |
| **التقنيات** `features.technologies` | فارغ (= جميع التقنيات) أو قائمة أكواد | محطات التقنيات غير المشمولة تظهر بعلامة 🔒: يمكن تصفح بياناتها لكن لا يمكن تشغيل توأمها الرقمي، وتُستبعد من الأسئلة المولّدة ومن التدريب |

أكواد التقنيات الستة عشر: `ccgt, ocgt, steam_oil, coal_steam, diesel, pv, csp_trough, csp_tower, wind_onshore, hydro_dam, hydro_ror, nuclear_pwr, biomass, waste_to_energy, igcc, oil_shale` (الأسماء الكاملة في `data/technologies.json` وفي صفحة المولّد).

> تُفرض الصلاحيات (الوحدات / التقنيات / المقاعد) داخل البرنامج ابتداءً من الإصدار **1.0.1**. الإصدار 1.0.0 يقبل المفاتيح نفسها لكنه يتجاهل هذه الحقول. حقل `plan` أُضيف في **1.2.0**؛ المفاتيح الأقدم تبقى صالحة وتُعرض كاشتراك محدد المدة (`term`) أو ترخيص داخلي (`lifetime`).

## الطريقة الأسهل: صفحة مولّد التراخيص (بلا أوامر)
1. افتح الملف `tools\license-generator\index.html` بالنقر المزدوج (أو الملف الواحد المستقل `tools\license-generator\ArabPowerTwin-License-Generator.html` الذي يجمع الصفحة وملف التشفير معاً؛ نزّله من GitHub بزر **Download raw file** واحفظه في أي مكان). يعمل في Chrome أو Edge أو Firefox **دون إنترنت** ولا يرسل أي شيء إلى أي خادم.
   > صفحة المولّد أداة للبائع ولا تُضمَّن في مثبّت البرنامج؛ لذلك **لا تتحدث تلقائياً مع تحديثات البرنامج**: بعد كل إصدار جديد أعد تنزيل الملف من GitHub (فرع main) واستبدل نسختك القديمة. يظهر رقم الإصدار أسفل الصفحة.
2. في القسم **1** اختر ملف المفتاح الخاص `tools\license-cli\keys\vendor-private.pem` (أو الصق محتواه). يجب أن تظهر «المفتاح الخاص محمّل ✓» من غير تنبيه بعدم التطابق. زر «تذكّر في هذا المتصفح» يحفظ المفتاح في متصفح جهازك فقط حتى لا تحمّله في كل مرة.
3. في القسم **2** أدخل بيانات العميل: الجهة، اسم المسؤول، البريد، خطة الاشتراك (**اشتراك شهري** أو **اشتراك سنوي** مع عدد الأشهر/السنوات وتاريخ البدء، ويظهر تاريخ الانتهاء المحسوب قبل التوليد؛ أو «ينتهي بتاريخ محدد»)، عدد المقاعد، معرّف الجهاز إن أردت ربطه بجهاز واحد (يقرأه العميل من شاشة التفعيل)، ثم حدد الوحدات والتقنيات المشمولة.
4. اضغط **توليد مفتاح الترخيص**، ثم «نسخ» أو «تنزيل ملف .lic» وأرسله للعميل.
5. قسم **التحقق من مفتاح** يفحص أي مفتاح بمفتاح الإنتاج المدمج في الصفحة ويعرض محتواه، و**سجل التراخيص الصادرة** يحتفظ بقائمة ما أصدرته على هذا المتصفح مع تصدير CSV.

الصفحة تحوي المفتاح العام للإنتاج الحالي، ويحدّثه الأمر `npm run license -- keygen` تلقائياً عند توليد مفاتيح جديدة. الصفحة تنتج المفاتيح نفسها التي تنتجها الأوامر أدناه.

## تراخيص الموظفين (بلا انتهاء) – وضع الموظفين
- خيار **«ترخيص داخلي للموظفين – بلا تاريخ انتهاء»** مخفي افتراضياً في صفحة المولّد حتى لا يراه العميل أثناء البيع أو مشاركة الشاشة.
- لإظهاره: افتح الصفحة بالرابط `tools\license-generator\index.html#staff` أو اضغط **Ctrl+Shift+S** داخل الصفحة. تظهر شارة برتقالية «وضع الموظفين» ويُضاف الخيار إلى قائمة الخطة. اضغط الاختصار مرة أخرى لإخفائه.
- هذه التراخيص لموظفي الشركة فقط (عروض، تدريب، دعم). داخل البرنامج تظهر باسم «ترخيص داخلي» وبتاريخ انتهاء «—» ولا تُذكر عبارة «مدى الحياة» في أي شاشة.

## الطريقة الثانية: أوامر البائع
```bash
npm run license -- keygen                 # مرة واحدة. يحفظ المفتاح الخاص في tools/license-cli/keys/ (خارج git)
npm run license -- info                   # هل المفتاح العام للإنتاج مضمّن؟
npm run license -- issue --name "..." --org "..." --email "..." [--plan monthly|yearly|custom|staff] [--periods N] [--start YYYY-MM-DD] \
                         [--expires YYYY-MM-DD] [--seats N] [--machine APT-...] [--modules twin,exams] [--technologies pv,wind_onshore,...] \
                         [--notes "..."] [--out file.lic]
npm run license -- verify file.lic [--machine APT-...]
```
- الافتراضي `--plan yearly` (اشتراك سنة واحدة من اليوم)؛ `--periods` عدد الأشهر أو السنوات، `--start` تاريخ البدء (الافتراضي اليوم)، `--plan custom --expires` لتاريخ انتهاء صريح، و`--plan staff` للموظفين فقط (بلا انتهاء).
- بلا `--modules` تُشمل الوحدتان، وبلا `--technologies` تُشمل جميع التقنيات، و`--seats` الافتراضي 0 (غير محدود).
- **احتفظ بنسخة احتياطية** من `vendor-private.pem`؛ فقدانه يعني عدم القدرة على إصدار تراخيص للإصدار الحالي (يمكن إعادة توليد المفاتيح بـ `--force` لكن التراخيص القديمة تبطل مع الإصدار الجديد).
- لا تشارك المفتاح الخاص مع أي شخص، ولا تضعه على خادم عام.

## التجديد والاستبدال
- عند تجديد اشتراك أو توسيع صلاحياته (مقاعد أو تقنيات أو وحدات إضافية)، أصدر مفتاحاً جديداً بالخطة نفسها (اجعل تاريخ البدء = تاريخ انتهاء الاشتراك الحالي كي لا يخسر العميل أياماً) وأرسله للعميل؛ يدخله من «الإدارة ← الترخيص ← تفعيل مفتاح جديد» فيحل محل القديم، وإن كان الاشتراك قد انتهى فمن شاشة التفعيل مباشرة. البيانات والحسابات لا تتأثر.
- قبل انتهاء الاشتراك يعرض البرنامج تنبيهاً عند الدخول (30 يوماً) وشريطاً أعلى الشاشة (14 يوماً) مع البريد وواتساب شركة أصفان، فتصل طلبات التجديد إليك مبكراً.
- يمكن للعميل نقل الترخيص غير المرتبط بجهاز إلى جهاز آخر بمجرد إدخاله هناك. حدّ المقاعد يُطبَّق على كل تثبيت (أو مجلد بيانات مشترك) على حدة لأن البرنامج يعمل دون خادم مركزي.

## وضع التطوير
عند تشغيل الكود بـ `npm start` (غير معبّأ) يقبل البرنامج أيضاً مفاتيح **التطوير** الموقّعة بـ `tools/license-cli/dev-keys/` لتسهيل الاختبار. النسخة المثبّتة (`.exe`) تقبل مفاتيح الإنتاج فقط.

---
## English
Licenses are Ed25519-signed keys verified fully offline against the public key embedded in the build. `keygen` once (back up the private key!), then issue one key per customer. Each key carries the licensee, the subscription plan (`monthly` / `yearly` with computed expiry, `custom` with an explicit date, or `staff` = internal no-expiry license for the vendor's own employees, never sold), optional machine lock, **seats** (maximum number of active accounts, 0 = unlimited), **modules** (`twin` = digital twin & 3D simulation, `exams` = exams, practice & results) and **technologies** (empty = all; plants of other technologies appear locked 🔒 and are excluded from generated questions). Subscriptions stop after expiry (the activation screen asks for the renewal key; data is kept); clock roll-back is detected; the app warns 30 days before expiry at sign-in and shows a contact bar 14 days before. The app never displays a lifetime option. Modules/technologies/seats are enforced from app version 1.0.1; `plan` exists from 1.2.0 (older keys stay valid).

**Easiest way:** double-click `tools/license-generator/index.html` (works offline in Chrome/Edge/Firefox), load `vendor-private.pem`, fill in the customer, the plan (monthly/annual with periods and start date, or a fixed date), seats, optional machine ID, modules and technologies, then copy or download the `.lic` file. The staff (no-expiry) plan is hidden until the page is opened with `#staff` or Ctrl+Shift+S is pressed. The page also verifies keys against the embedded production public key and keeps a register of issued licenses (CSV export).

**CLI:** `npm run license -- issue --org "University X" [--plan monthly|yearly|custom|staff] [--periods N] [--start YYYY-MM-DD] [--expires YYYY-MM-DD] [--seats 40] [--machine APT-....] [--modules twin,exams] [--technologies pv,wind_onshore] --out x.lic` (default: one-year subscription from today). Packaged builds accept production keys only; `npm start` additionally accepts the committed development keys.
