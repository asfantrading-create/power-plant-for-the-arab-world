# نظام الترخيص / Licensing

## كيف يعمل
- كل ترخيص هو **مفتاح نصي موقّع رقمياً** (Ed25519) بصيغة `APT1.<payload>.<signature>` يحتوي: اسم المرخَّص له، الجهة، البريد، النوع (`lifetime` أو `term`)، تاريخ الإصدار، تاريخ الانتهاء (للمحدد)، عدد المقاعد، معرّف الجهاز (اختياري)، وملاحظات.
- البرنامج يتحقق من التوقيع **دون اتصال** بالمفتاح العام المضمّن فيه. لا يمكن تزوير مفتاح أو تعديل تاريخ الانتهاء دون المفتاح الخاص للبائع.
- التراخيص المحددة المدة تتوقف بعد تاريخ الانتهاء؛ ويرصد البرنامج إرجاع ساعة النظام للوراء ويعلّق الترخيص المحدد حتى تصحيح التاريخ.
- الترخيص المرتبط بجهاز يعمل فقط على الجهاز الذي يطابق معرّفه (`APT-XXXX-…`) المستخرج من معرّف الجهاز في ويندوز.

## أوامر البائع
```bash
npm run license -- keygen                 # مرة واحدة. يحفظ المفتاح الخاص في tools/license-cli/keys/ (خارج git)
npm run license -- info                   # هل المفتاح العام للإنتاج مضمّن؟
npm run license -- issue --name "..." --org "..." --email "..." [--type term --expires YYYY-MM-DD] [--seats N] [--machine APT-...] [--notes "..."] [--out file.lic]
npm run license -- verify file.lic [--machine APT-...]
```
- **احتفظ بنسخة احتياطية** من `vendor-private.pem`؛ فقدانه يعني عدم القدرة على إصدار تراخيص للإصدار الحالي (يمكن إعادة توليد المفاتيح بـ `--force` لكن التراخيص القديمة تبطل مع الإصدار الجديد).
- لا تشارك المفتاح الخاص مع أي شخص، ولا تضعه على خادم عام.

## التجديد والاستبدال
- عند تجديد ترخيص محدد المدة، أصدر مفتاحاً جديداً وأرسله للعميل؛ يدخله من «الإدارة ← الترخيص ← تفعيل مفتاح جديد».
- يمكن للعميل نقل الترخيص غير المرتبط بجهاز إلى جهاز آخر بمجرد إدخاله هناك. عدد المقاعد معلوماتي (لا يُفرض تقنياً) لأن البرنامج يعمل دون خادم مركزي.

## وضع التطوير
عند تشغيل الكود بـ `npm start` (غير معبّأ) يقبل البرنامج أيضاً مفاتيح **التطوير** الموقّعة بـ `tools/license-cli/dev-keys/` لتسهيل الاختبار. النسخة المثبّتة (`.exe`) تقبل مفاتيح الإنتاج فقط.

---
## English
Licenses are Ed25519-signed keys verified fully offline against the public key embedded in the build. `keygen` once (back up the private key!), then `issue` per customer (lifetime or `--type term --expires`, optional `--machine` lock and `--seats`). Term licenses stop after expiry; clock roll-back is detected. Packaged builds accept production keys only; `npm start` additionally accepts the committed development keys.
