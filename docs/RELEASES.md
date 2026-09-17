# الإصدارات والتحديثات التلقائية / Releases & auto-update

## كيف تصل التحديثات للعملاء
1. البرنامج المثبّت يستخدم `electron-updater`. عند التشغيل (وكل 6 ساعات) يقرأ ملف `latest.yml` من **أحدث إصدار في GitHub Releases** للمستودع `asfantrading-create/power-plant-for-the-arab-world`.
2. إذا كان الإصدار في `latest.yml` أحدث من المثبّت، يظهر شريط «يتوفر تحديث جديد» + إشعار. يضغط المستخدم «تنزيل التحديث» ثم «إعادة التشغيل والتثبيت». بيانات العملاء لا تُمس.
3. لذلك يكفي أن تنشر إصداراً جديداً ليصل الجميع.

> ملاحظة: `electron-updater` ورابط التحميل يحتاجان مستودعاً **عاماً** (Public). إذا أردت إبقاء الكود خاصاً: أنشئ مستودعاً عاماً منفصلاً للإصدارات فقط، واضبط في مستودع الكود المتغير `RELEASE_REPO` (اسم مستودع الإصدارات) والسر `GH_RELEASE_TOKEN` (رمز وصول بصلاحية Contents: read & write على مستودع الإصدارات) — سير العمل ينشر هناك تلقائياً ويضبط رابط التحديث داخل المثبّت. التفاصيل خطوة بخطوة في `RELEASE-CHECKLIST.md`. بديل آخر: خادم HTTPS خاص بك (ارفع `latest.yml` و`ArabPowerTwin-Setup.exe` و`.blockmap` إلى مجلد واحد) واضبط `publish: {provider: generic, url: ...}` قبل البناء.

## نشر إصدار جديد (خطوات البائع)
```bash
# 1) عدّل الكود/البيانات ثم ارفع التعديلات إلى main
# 2) ارفع رقم الإصدار
npm version 1.1.0 --no-git-tag-version   # أو عدّل package.json يدوياً
git commit -am "Release 1.1.0"
git push origin main
# 3) أنشئ الوسم — هذا ما يشغّل البناء والنشر
git tag v1.1.0
git push origin v1.1.0
```
سير العمل `.github/workflows/release.yml`:
- يعمل على `windows-latest`، يثبّت الحزم، يشغّل الاختبارات، يتحقق من تضمين مفتاح الترخيص العام (`scripts/check-release.mjs`)، يبني الواجهة، ثم `electron-builder --win --publish always`.
- ينشر في Release الوسم: `ArabPowerTwin-Setup.exe` (اسم ثابت → رابط ثابت)، `ArabPowerTwin-Setup.exe.blockmap` (تحديث تفاضلي)، `latest.yml`.
- يمكن تشغيله يدوياً من تبويب Actions (workflow_dispatch) للحصول على المثبّت كـ artifact دون نشر.

## الرابط الثابت
`https://github.com/asfantrading-create/power-plant-for-the-arab-world/releases/latest/download/ArabPowerTwin-Setup.exe`

## توقيع الكود (اختياري لكن موصى به)
لتجنّب تحذير SmartScreen اشترِ شهادة توقيع (OV/EV) وأضف الأسرار `CSC_LINK` و`CSC_KEY_PASSWORD` في إعدادات المستودع (Settings → Secrets)؛ يلتقطها electron-builder تلقائياً. مع الشهادة فعّل `verifyUpdateCodeSignature: true` في `electron-builder.yml`.

## البناء المحلي
على ويندوز: `npm install && npm run dist:win` → المثبّت في `release/`.

---
## English
Installed copies poll `latest.yml` on the repository's latest GitHub Release (repo must be public, or use a separate public releases repo / a generic HTTPS folder). Publish by bumping `package.json` version, committing, and pushing a `vX.Y.Z` tag; the Windows workflow builds and publishes `ArabPowerTwin-Setup.exe` (fixed name → permanent link), its `.blockmap` and `latest.yml`. Optional code signing via `CSC_LINK`/`CSC_KEY_PASSWORD` secrets.
