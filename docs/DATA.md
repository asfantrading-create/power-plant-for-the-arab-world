# مصادر البيانات ومنهجية التجميع / Data sources & methodology

## الملفات
| ملف | المحتوى |
|---|---|
| `data/sources/gppd_v130_arab_subset.csv` | 487 سجلاً من قاعدة بيانات WRI العالمية لمحطات الطاقة (الإصدار 1.3.0، ترخيص CC BY 4.0) للدول العربية |
| `data/sources/curated-plants.json` | 135 محطة منسّقة (محطات بعد 2019 ودول غير مغطاة: الصومال وجزر القمر) مع وصف ثنائي اللغة وحقائق للمحطات المميزة |
| `data/sources/overrides.json` | تصحيحات لسجلات WRI: أسماء عربية، تصنيف تقني دقيق (دورة مركبة/مفتوحة/بخارية/…)، تجميع المجمعات، استبعاد سجلين يقعان في جنوب السودان، ملاحظات |
| `data/sources/countries.json` | الدول الـ22 (الأسماء، التردد، الجهد، المرفق الوطني) |
| `data/plants.json`, `countries.json`, `complexes.json` | المخرجات المبنية بـ `npm run build:data` |
| `data/technologies.json` | 16 تقنية توليد مع وصف تعليمي ومعاملات المحاكاة (كفاءة، معدل حرارة، حد أدنى للحمل، معدل تغيير الحمل، زمن الإقلاع، معامل انبعاث، معامل قدرة نموذجي) |
| `data/questions.json` | بنك الأسئلة (120 سؤالاً، 10 موضوعات، عربي/إنجليزي مع شرح) |
| `data/arab-map.json` | حدود الدول من Natural Earth (ملكية عامة) مبسّطة |

## جودة البيانات
كل سجل يحمل حقل `dataQuality`:
- `gppd`: كما في قاعدة WRI (مع مصدرها الأصلي: اتحاد الكهرباء العربي، هيئة تنظيم الكهرباء السعودية، الشركة القابضة لكهرباء مصر، Wiki-Solar، GEODB، بنك التنمية الأفريقي…).
- `verified`: محطات منسّقة بأرقام موثقة من المشغّل/المرفق.
- `approximate`: القدرة/السنة موثقة عموماً لكن الإحداثيات تقريبية أو التفاصيل من مصادر صحفية.
- `aggregate-estimate`: سجل تجميعي (مثل بقية قطع بنبان) ليصحّ إجمالي المجمع.
حقل `status`: تعمل / قيد الإنشاء / مخططة — المحطات غير التشغيلية لا تُحتسب في الإجماليات. حقل `excludeFromTotals` لمنشأة «مرآة» العُمانية (بخار شمسي لاستخلاص النفط، ليست محطة كهرباء).

## تحديث البيانات
1. عدّل `curated-plants.json` أو `overrides.json`.
2. `npm run build:data` ثم `npm test`.
3. انشر إصداراً جديداً — تصل البيانات الجديدة للعملاء عبر التحديث التلقائي.

## إخلاء مسؤولية
البيانات لأغراض تعليمية؛ القدرات والتواريخ والملكية تتغير، وبعض المحطات الحديثة قُدّرت إحداثياتها. نرحّب بالتصحيحات عبر Issues.

---
## English
`plants.json` is built from the WRI GPPD v1.3.0 Arab subset (487 rows, CC BY 4.0) plus 135 curated records (post-2019 plants, Somalia, Comoros) and an overrides file (Arabic names, precise technology classification, complexes, exclusions). Each record carries `dataQuality`, `status`, `source`, and `sourceUrl`. Update the source files, run `npm run build:data`, test, and ship a release.
