# التثبيت والتشغيل / Installation

## للعميل (Windows 10/11, 64-bit)
1. حمّل المثبّت من الرابط الثابت: `…/releases/latest/download/ArabPowerTwin-Setup.exe`.
2. شغّل الملف؛ لا يحتاج صلاحيات مسؤول (يُثبَّت في مجلد المستخدم افتراضياً، ويمكن اختيار مجلد آخر). قد يظهر تحذير SmartScreen لأن المثبّت غير موقّع بشهادة تجارية — اختر «More info → Run anyway» (يمكن للبائع إضافة توقيع رقمي لاحقاً، انظر RELEASES.md).
3. عند أول تشغيل:
   - **تفعيل الترخيص**: الصق المفتاح (`APT1.…`) أو حمّل ملف `.lic`. إذا كان الترخيص مرتبطاً بجهاز، أرسل «معرّف الجهاز» الظاهر في الشاشة للبائع أولاً.
   - **الإعداد الأولي**: أنشئ حساب المشرف العام (أستاذ المقرر أو مسؤول الجهة) واسم الجهة.
   - سجّل الدخول وأضف الطلاب من «الإدارة ← المستخدمون».

## معمل الجامعة (عدة أجهزة، قاعدة بيانات مشتركة)
- ثبّت البرنامج على كل جهاز وفعّل الترخيص عليه (أو ضع ملف `license.key` في مجلد البيانات المشترك ليُقرأ تلقائياً).
- على جهاز المشرف: «الإعدادات ← مجلد البيانات المشترك» واختر مجلداً على الشبكة مثل `\\server\ArabPowerTwin` (يجب أن يملك المستخدمون صلاحية الكتابة).
- على بقية الأجهزة اختر **نفس المجلد**. كل سجل (مستخدم/محاولة/جلسة) يُحفظ في ملف مستقل، لذلك تعمل الأجهزة معاً بأمان.
- بديل بدون شبكة: يعمل كل جهاز محلياً، ويُصدَّر «نسخة احتياطية كاملة» من جهاز الطالب وتُستعاد على جهاز المشرف (الإدارة ← البيانات والنسخ الاحتياطي).

## أين تُحفظ البيانات؟
- الإعدادات والترخيص: `%APPDATA%\arab-power-twin\` (settings.json, license.key).
- مجلد البيانات الافتراضي: `%APPDATA%\arab-power-twin\workspace\` (users/, groups/, exams/, attempts/, sessions/, audit/).
- السجلات: `%APPDATA%\arab-power-twin\logs\`.

## المتطلبات
Windows 10/11 64-bit، بطاقة رسومية تدعم WebGL (أي جهاز حديث)، 300 MB مساحة. لا يحتاج إنترنت إلا للتحقق من التحديثات.

---
## English summary
Download `ArabPowerTwin-Setup.exe` from the permanent link, run it (per-user install, no admin rights), activate with the license key, create the super-admin account, then add students. For computer labs, point every installation to the same shared network folder (Settings → Shared data folder); each record is a separate JSON file so concurrent use is safe. Data lives under `%APPDATA%\arab-power-twin\`.
