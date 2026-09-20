# Bankimport-экран — редизайн UX/UI (deep-research, 2026-09-20)

Цель: топовый, минималистичный, консистентный UX для работы с банковской выгрузкой
в Projektkalkyl → Bankimport. Источники проверены адверсариально (19 подтверждено, 6 опровергнуто).

## Проверенные принципы (с источниками)

- **Порядок колонок по важности, связанные рядом** — NN/g (https://www.nngroup.com/articles/data-tables/). 3-0.
- **Числа справа + tabular figures** — Mission Log, Setproduct, A List Apart. 3-0.
- **Sticky-заголовки на широких таблицах** — NN/g. 3-0.
- **Batch-action bar** появляется при выделении, sticky при скролле, показывает счётчик, **гасит per-row действия** — IBM Carbon (https://carbondesignsystem.com/components/data-table/usage/) + PatternFly (https://www.patternfly.org/patterns/bulk-selection/). 3-0.
- **Bulk-селектор — первый элемент тулбара** — PatternFly. 3-0.
- **Per-row overflow (⋮) — показывать на hover**; если действий <3 — инлайн-иконки — Carbon (`overflowMenuOnHover`). 3-0.
- **Категоризация keyboard-first + bulk-first (Xero cash coding):** выдели N строк → заполни одно поле → проставится во все; Enter=вниз, Tab=вправо; шорткат «копировать account/tax/tracking из строки выше» — Xero shortcuts PDF + Xero Central. 3-0.
- **Split строки** — Bokio (https://www.bokio.co.uk/help/bank-feeds/manual-bank-import/split-imported-bank-lines/): «выбери на сколько строк разбить и как распределить сумму», т.к. один платёж часто = несколько счетов. 3-0.

## Опровергнуто (НЕ применять)
- «Stripe/Mercury: валютный символ светлее значения, цвет только для статуса» — источник adminlte.io, 0-3/1-2. Не подтверждено.
- «Избегать полной сетки границ, только hairline+whitespace» — 0-3 (контекстно, не правило).
- «Чекбоксы должны быть всегда видимы, а не на hover» — 0-3 (hover-reveal допустим).

## Рекомендация по экрану ByggExp

### (a) Колонки
- **Дефолт:** Datum · Mottagare · Text (memo) · **Belopp** (справа, tabular-nums) · Kategori/Projekt
- **Под тумблер «Fler kolumner»:** Avsändare, Mottagarens kontonummer, Valuta, Betalningstyp
- Belopp: правое выравнивание, tabular-nums, знак/цвет для расход/приход опционально (прямой первичный источник не найден — решать по вкусу, но консистентно).
- Пустая Valuta: не показывать «0,00», оставлять пусто; код валюты в сумме только если ≠ SEK.
- Дата: единый формат, левое выравнивание.

### (b) Selection-toolbar + группы
- Оставить «Valda (N) SUM» (уже валидно по Carbon/PatternFly).
- Добавить: sticky при скролле; гасить per-row ⋮ во время выделения; чекбокс select-all первым.
- Группа-сводка уже унифицирована (`summaryRow`) — консистентность ✅.

### (c) Категоризация / привязка к проекту (ГЛАВНОЕ, сейчас отсутствует)
- Инлайн-поле Kategori/Projekt в каждой строке (dropdown с autosuggest).
- Bulk: выделил → заполнил одно → проставилось во все выделенные (Xero-модель).
- Клавиатура: Enter/Tab навигация, «копировать из строки выше».
- Split: разбить банковскую строку на N с распределением суммы (Bokio-модель).

### (d) Do / Don't
- DO: числа справа + tabular-nums; sticky header; batch-bar гасит per-row; hover-⋮; bulk-fill категории.
- DON'T: постоянные per-column ⋮; шумные «0,00»; колонки-дубликаты в дефолте (Avsändare); цвет как декор.

### (e) Что эмулировать
1. **Xero (cash coding)** — эталон быстрой bulk+keyboard категоризации.
2. **Bokio** — split одной строки на несколько.
3. **IBM Carbon data-table** — спецификация batch-toolbar и overflow-меню.

## Открытые вопросы (не покрыто研)
- Точные конвенции знак/цвет debit/credit у Stripe/Mercury/Ramp (источники опровергнуты).
- Первичный гайд по подавлению «0,00» (только из общих принципов минимализма).
- Как Fortnox/Visma раскладывают импорт по умолчанию (не захвачено).
- UX сопоставления транзакции со счётом/расходом (match-to-record) — не покрыто детально.
