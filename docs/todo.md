# TODO — задачи от пользователя (task inbox)

Как это работает: пользователь скидывает задачи (текст/скриншоты) → Claude СНАЧАЛА выписывает
их все сюда в «📥 Inbox», показывает список, потом делает по очереди и отмечает `[x]`.
В конце сверяется: всё, что осталось `[ ]`, проговаривается вслух, не теряется.

Статусы: `[ ]` новая · `[~]` в работе · `[x]` готово (запушено).

---

## 📥 Inbox (новые, ещё не начаты)

### Сессия 2026-09-23/24 — Stripe live — детали в docs/dev-worklog.md
- [x] Stripe live-аккаунт на Real Marketing s. r. o. (SK) + портал + 6 цен + вебхук + 8 секретов в ByggExp-BackEnd
- [x] Checkout падал (tax_id_collection без customer_update) — `5797260`
- [x] Тарифы скрывались после неудачного checkout — `551651c`; названия/короткие кнопки — `f6baa42`, `ba4aeec`
- [ ] Проверить живой checkout → вебхук → портал → отмена
- [ ] Moms/reverse charge (Stripe Tax?) — решение + бухгалтер
- [ ] Места Tillväxt: 20 или 25? (FE 10–20 vs BE 25)

### Сессия 2026-09-23 — кнопки модалок наверх + сетка часов — детали в docs/dev-worklog.md
- [x] «Создать проект»: не было кнопки вообще (footer=null остался от визарда) → вернул (`52c5ab0`)
- [x] ВСЕ модалки (AdminModal, ~30 шт.): кнопки действий в шапке справа от заголовка — шапка не скроллится → всегда видны. Cancel/Save по умолчанию теперь через t(). «Создать проект» — встроенная кнопка вместо самодельной.
- [x] 5 модалок на голом antd `Modal` (AssignmentEdit, BulkScan, BulkScanInvoice, BulkPlanning, UserBulkImport) → AdminModal, кнопки в шапке
- [x] Название проекта: клик → адрес стирается, пусто при уходе → адрес обратно (`82ad2f9`)
- [x] Вкладка «Настройки» проекта: «Сохранить изменения» наверху, липнет под шапкой. ПРАВИЛО в памяти: синяя кнопка всегда наверху
- [x] Часы: число, введённое админом в ячейку «Запланировано», — финальное (сохраняется как есть; 8 сохраняется даже если = графику, `1eea3a4`)
- [x] Часы: 07–16 показывало 7 вместо 8 — обед вычитался ДВАЖДЫ (бэкенд уже даёт planned нетто по lunchMinutes проекта + FE вычитал ещё раз). Теперь правило обеда в сетке только для GPS/Вручную; planned как есть, ввод = финал
- [x] Часы: поле выбора проекта шире (340px)
- [x] Часы «Запланировано»: график смен виден в таблице — сегодня и будущие дни показывают план проекта (07–18 = 10 ч) и входят в итог; прошлые без отметок = прочерк (неявка)
- [ ] Все окна закрываются кликом снаружи — уточнить какое окно не закрывается (AdminModal уже maskClosable, antd по умолчанию тоже)
- [x] Окно «Адрес проекта»: кнопки наверх + выбранное место/радиус (зона активации) над картой — без прокрутки

### Сессия 2026-09-21 (деплой + кредит-фактуры) — детали в docs/dev-worklog.md
- [x] Исходящие фактуры: модалка частичного кредита (пусто=весь / сумма excl. moms=часть), как на счетах поставщиков. FE `InvoiceListPage` + `invoiceStore` + строки SV/NB/RU. Запушено (`515eded`).
- [x] Диагностика «уведомление про неоплаченную фактуру не открывает фактуру»: причина — бэкенд не деплоился с 20 сен. Код в приложении (`2273c5e7`) готов.
- [x] ПОЧИНИЛ ДЕПЛОЙ: e2e-шаг висел 6ч (`app.e2e-spec` не закрывал Nest-app) + зависший job держал concurrency-слот. Фикс `acc4e0a` (afterEach app.close + --forceExit + timeouts) + отменил зависший прогон через `gh run cancel`. Run #370 зелёный, прод api.byggexp.se → 200.
- [ ] **[ЖДЁТ ПОЛЬЗОВАТЕЛЯ] Mobile OTA:** `cd tot-bygghub-mobile-app-ios && eas update --branch production` — довезти готовый JS на телефон Geal. Сначала проверить runtimeVersion билда = 1.1.0. Это публикация (креды пользователя), не баг.
- [ ] Проверить живьём новый функционал теперь, когда бэкенд доехал (частичный кредит вх./исх., валюта в публичной projektkalkyl, cron payment-reminders 08:00).


- [x] Сайдбар: «звёздочка» на пункте меню → группа «Избранное»/Favoriter наверху (per-user+section localStorage, звезда на hover, учитывает роль/capability/модули)
- [x] Bankimport: заголовки колонок дословно из Excel; пустой заголовок → пусто (убрал выдумку «#N»). NB: «Förfallodatum» реально был в том файле — приложение не переименовывает.
- [x] Bankimport: нижний тёмный бар опций при выделении (portal→body, fixed bottom, как в Смены), всегда снизу при прокрутке

## 🔨 В работе

### Сайдбар — избранное + сворачивание (2026-09-20)
- [x] Звёздочка → группа «Favoriter» наверху. Багфикс клика: ссылка перекрывала звезду → z-index/pointer-events + toggle на mousedown.
- [x] «Favoriter» — сворачиваемое подменю (не статичная группа), открыто по умолчанию.
- [x] Активная категория (где открыта страница) теперь тоже сворачивается: auto-open только при навигации (one-shot effect), не на каждом рендере. open-storage v2→v3.

### ⚠️ ВАЖНО: React Compiler НЕ включён (2026-09-21)
- Обнаружено при разборе тормозов Projektkalkyl: в проекте **нет** babel-plugin-react-compiler и включения в next.config, НО eslint-plugin-react-hooks v7 требует «без ручной мемоизации» (правило `react-hooks/preserve-manual-memoization`). Итог: авто-мемоизации НЕТ нигде → все большие списки перерисовываются целиком.
- Фикс KalkylTable: ручная мемоизация (React.memo + useMemo(columns/colMeta) + useCallback + скрытие per-row ⋮ через CSS `.kalkyl-has-sel`). `next build` не линтит → правило компилятора не блокирует деплой; в файле стоит `/* eslint-disable react-hooks/preserve-manual-memoization */`.
- [ ] ПРАВИЛЬНЫЙ следующий шаг: **включить React Compiler глобально** (install babel-plugin-react-compiler + `reactCompiler:true` в next.config; React 19.2/Next 16.2 поддерживают), протестировать, затем можно убрать ручную мемоизацию. Тогда ВСЕ списки станут быстрыми без ручного кода. Осторожно: глобальное изменение, тестировать вживую.

### СЛЕД. ШАГИ (приоритет, продолжить отсюда) — детали в docs/dev-worklog.md (SESSION 2026-09-20)
- [ ] ProjektkalkylPublicView валюта — BACKEND (findByShareToken payload+currency) + FE (formatMoney + GREEN/RED). Единственный отложенный баг ревизии.
- [ ] Bankimport крупные фичи: bulk-категоризация (Xero) и/или split строки (Bokio).
- [ ] UX-проход: Планирование (Schedule), Hours-grid (как Projektkalkyl/Mitt arbete/Dashboard).

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
- [x] shifts Fill+обед: РЕШЕНО — при записи нетто→брутто (добавляю обед если день пересекает порог), round-trip стабилен.
- [x] ProjektkalkylPublicView валюта — РЕШЕНО (совместно с бэкенд-агентом): BE — findByShareToken теперь отдаёт currency (ByggExp-BackEnd); FE — currency-aware (data.currency||'SEK') + GREEN/RED. Оба репо запушены.
- [x] ProjectOverviewTab planned-база с трудом; MyWork now тикает (полночь); AssignmentChangesLog фильтр entityType=assignments на сервере.
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
