# TODO — задачи от пользователя (task inbox)

Как это работает: пользователь скидывает задачи (текст/скриншоты) → Claude СНАЧАЛА выписывает
их все сюда в «📥 Inbox», показывает список, потом делает по очереди и отмечает `[x]`.
В конце сверяется: всё, что осталось `[ ]`, проговаривается вслух, не теряется.

Статусы: `[ ]` новая · `[~]` в работе · `[x]` готово (запушено).

---

## 📥 Inbox (новые, ещё не начаты)

- [x] Сайдбар: «звёздочка» на пункте меню → группа «Избранное»/Favoriter наверху (per-user+section localStorage, звезда на hover, учитывает роль/capability/модули)
- [x] Bankimport: заголовки колонок дословно из Excel; пустой заголовок → пусто (убрал выдумку «#N»). NB: «Förfallodatum» реально был в том файле — приложение не переименовывает.
- [x] Bankimport: нижний тёмный бар опций при выделении (portal→body, fixed bottom, как в Смены), всегда снизу при прокрутке

## 🔨 В работе

### Ревизия всего репо (мульти-агент, 2026-09-20): 28 подтв. багов + 31 автосейф
СДЕЛАНО и запушено:
- [x] Projektkalkyl ПЕРФ (приоритет): строки получают готовые строки-примитивы, не весь `table` → add/edit/select трогают только свою строку
- [x] CRITICAL: project Finance/Overview — часы фильтруются по projectId (была утечка часов всех проектов)
- [x] Валюта: Expenses + Payroll списки (formatMoney по валюте компании, не зашитый SEK)
- [x] KMA: подписанный чек-лист больше не мутируется кнопкой (только закрытие)
- [x] Company edit: валюта не сбрасывается на дефолт страны без смены страны
- [x] Schedule i18n: «Assign/Week/empty» через t() (SV/NB/RU)
- [x] Tasks subtitle: был копипаст shifts → исправлен
- [x] Client (частный): добавлено поле «Фамилия»

СДЕЛАНО (2-й проход):
- [x] worker TimeReportPage → POST /shifts/manual (часы) + фото в project documents; UploadPage → uploadDocuments. (Воркер ходит только через App, но страницы больше не врут. NB: описание в TimeReport не сохраняется — у эндпоинта нет поля.)
- [x] schedule: дата берётся из YYYY-MM-DD префикса (UTC), не dayjs local → нет сдвига на день
- [x] shifts copyToNextPeriod: в режиме «месяц» +1 календарный месяц (не улетает за границу)
- [x] MyWorkPage: экономические блоки gated на finance.manage (как дашборд)
- [x] ClientListPage: убран «Paid» pill/фильтр (несуществующее поле)
- [x] certificate: img/ссылка через resolveUrl
- [x] stores: projektkalkylStore.fetchAll + companyStore хранят строку ошибки, не raw объект
- [x] ru.js: убраны усечённые дубли Scan/Move up/Move down; BemanningPage unused Tooltip; SiteMapPage dead `active`

ОТЛОЖЕНО — риск/бэкенд, требует отдельного захода (отчёт /tasks/wh8li6kam.output):
- [x] schedule handleSaveBar: РЕШЕНО через set-reconciliation (diff) после deep-research (/tasks/wvp83s6jr.output). Создаём только добавленные дни, удаляем только убранные, overlap не трогаем → нет потери данных и нет 409. Смена проекта = заменяем всё. Будущее (если захотим ещё проще/надёжнее): серверный идемпотентный «set range» (bulkWrite upsert по unique-индексу + deleteMany вне диапазона), либо модель одной range-записи {userId,projectId,startDate,endDate} вместо строки-на-день.
- [ ] shifts Fill: seed нетто-обеда пишется как брутто → при обеде тихо ужимает суммы. Поведенческое, нужно точно понять gross/net инварианты.
- [ ] ProjektkalkylPublicView: валюта зашита SEK — нужен BACKEND (findByShareToken payload + currency) + FE (formatMoney + GREEN/RED из kalkylTableUtils).
- [ ] ProjectOverviewTab: planned база без труда (apples-to-oranges %). MyWork `now` не обновляется в полночь. AssignmentChangesLog: только 1-я страница audit.
- [ ] Остаток автосейф (dup-хелперы: today()/STATUS_OPTIONS/TONE_TAG/invoiceValue/getRoleColor/resolveAttachmentUrl; хардкод-строки в bug-reports/registrations/offers/companies тостах) — низкий риск, но шум; батчем при желании.

- [x] Bankimport: «Flytta till tabell» — выбор куда выносить выделенные строки: НОВАЯ или существующая (список таблиц с цветом). Ремап колонок по типу+позиции. Включено и на income. Это база для сценария «классифицировать → вынести».
- [ ] Bankimport (сценарий #1, если нужно дальше): полноценная классификация — присвоить строкам метку/категорию инлайн, потом вынести по категории. Сейчас можно: выделить → «Вынести в <таблицу>». Обсудить, нужна ли отдельная колонка-категория + bulk-fill (Xero-стиль).

- [x] Bankimport UX — полиш-пас (research-backed): убран шум «0,00», tabular-nums, per-row ⋮ гаснет при выделении, per-column ⋮ на hover, sticky selection-toolbar. Отчёт: docs/research/bankimport-ux-redesign.md
- [ ] Bankimport — крупные фичи (следующий шаг, если направление ок): (1) bulk-категоризация/привязка к проекту в стиле Xero cash coding (выдели N → заполни одно поле → во все); (2) split строки на N с распределением суммы (Bokio); (3) тумблер «Fler kolumner» скрывать Avsändare/Valuta/Betalningstyp по умолчанию
- [x] Перф таблицы: вынес строку в отдельный KalkylRow (компилятор React мемоизирует) — клик по чекбоксу перерисовывает только одну строку, не все 456. NB: проект использует React Compiler → НЕ добавлять ручные useCallback/memo (падает eslint «compilation skipped»), полагаться на авто-мемоизацию + стабильные пропсы (ref для shift-select). Дешёвое ранее: rAF-throttle бара + O(n) id→index maps.
- [~] ПРИОРИТЕТ (пользователь: тормозит при ДОБАВЛЕНИИ строк и ВЫДЕЛЕНИИ в Projektkalkyl): выделение уже мемоизировано; осталось — KalkylRow получает проп `table`, поэтому add-row/edit меняет `table` → перерисовывает все 456. Фикс: передавать в строку посчитанные примитивы (amountText/vatText/netText/isComputed), НЕ весь table → add/edit трогает только свою строку. Если мало — react-window виртуализация (осторожно с group/sticky/resize/edit).

## ✅ Готово (последние сессии)

### 2026-09-19
- [x] Projektkalkyl: единый стиль свёрнутых рядов (авто + ручная группа → один `summaryRow`)
- [x] Projektkalkyl: вся строка-сводка кликабельна + summa-fallback без колонки Belopp
- [x] Projektkalkyl: убрать авто-сворачивание длинных таблиц (всё видно сразу, сворачивание только вручную)
