# Onboarding benchmark & plan — byggexp-admin

**Status:** working document · started 2026-09-02 · owner: Alexander
**Goal:** onboarding на уровне лучших мировых сервисов, но **без перебора** — ровно столько, сколько нужно, чтобы новый пользователь дошёл до первой ценности быстро.

> Guiding principle (из research): *"Best onboarding isn't more onboarding — it's the minimum guidance that helps the user take the next value step."* Front-loading features kills activation. Каждый экран должен вести к **одному** следующему действию, а не к экскурсии по всему продукту.

---

## 0. TL;DR — что делаем

Мы уже на правильной траектории (checklist + empty states + Help), и это **совпадает с research-консенсусом 2026**. Тяжёлый product tour был осознанно удалён (коммит `a6a82e8`) — это правильно, туры дают почти нулевой retention после шага 5.

Дальше усиливаем **не количеством, а точностью**: определить activation-событие, добавить одно routing-вопрос на входе, засеять demo-данные, довести empty states и чеклист до «open-directly-into-action». Ничего оверлейного/навязчивого.

---

## 1. Текущее состояние (аудит кода, 2026-09-02)

| Компонент | Файл | Статус |
|---|---|---|
| Getting-started checklist (5 шагов, live-детект, progress ring, per-company dismiss) | `src/features/dashboard/OnboardingChecklist.jsx` | ✅ Live на Overview |
| Empty-state CTA на списках (13 страниц) | `src/shared/components/EmptyState.jsx` + `emptyState` prop в `AdminTable` | ✅ Projects, Team, Clients, Offers, Invoices, Tools, Tasks, Dagbok, Articles, Leave, SupplierInvoices, Expenses |
| Help page (segmented admin/worker, accordion how-tos, bilingual inline) | `src/features/help/HelpPage.jsx` | ✅ Live `/company/help` |
| Training-video grid | `HelpPage.jsx` → `TRAINING_VIDEOS` | ⚠️ Все `url: null` (placeholder) |
| Product tour + Welcome modal | — | ❌ Удалены (`a6a82e8`, `eb25cec`) — намеренно |
| Server-persisted onboarding progress | — | ❌ Всё в localStorage (per-browser) |

**Чеклист сейчас:** 5 шагов — company details → team → project → client → first offer/invoice. Каждый шаг имеет `href` в нужный экран, `done` считается по реальным данным (`orgNumber`, `teamCount>1`, `projectCount>0`, clients>0, offers+invoices>0). Прячется когда всё done или dismissed. **Это уже best-practice форма.**

---

## 2. Что делают лучшие (research 2026)

Консенсус из ~10 источников (Userpilot, Appcues, Chameleon, Userorbit «50 flows», 72Technologies, DAR Design):

1. **Activation event сначала, потом шаги.** Без измеримого «aha» ты оптимизируешь completion, а не ценность. B2B benchmark time-to-value ≈ **1 день 12 часов**; кто получает ценность за 14 дней — retention 80%+, кто нет за 30 дней — 35–50%.
2. **Empty states > tours.** Пользователь видит пустой экран чаще любого модального тура. Продукты с guidance в empty states → **-28% confusion**. «Если инвестируешь в один surface — делай empty state».
3. **Туры затухают.** Completion multi-step tooltip падает резко после шага 5; retention-эффект поздних шагов ≈ 0. → Мы правильно убрали тур.
4. **Один routing-вопрос на входе.** Топ-конвертящие продукты задают 1 вопрос (роль/use-case), который перекраивает дашборд, какой чеклист грузить, какие фичи показать первыми.
5. **Data seeding.** Пред-заполненный sample-контент показывает «как выглядит продукт, когда работает» — до того как юзер что-то сделал. Сильно усиливает empty states.
6. **Checklist = outcomes, не фичи.** 3–5 шагов, каждый = осмысленный результат, optional отделены от core, шаг открывается прямо в действие.
7. **Progressive / контекстно.** Фичи вводятся когда релевантны, а не свалены разом.
8. **Меряй TTV и early-retention, не completion rate.**

---

## 3. Gap-анализ

| # | Gap | Есть? | Приоритет |
|---|---|---|---|
| G1 | Определённое **activation-событие** (что = «активирован») + инструментирование шагов | ❌ | **P0** |
| G2 | **Routing-вопрос** на первом входе (роль / тип бизнеса) → персонализация чеклиста/дашборда | ❌ | P1 |
| G3 | **Demo / sample-данные** для показа в пустом продукте (seed-проект «Пример», можно скрыть) | ❌ | P1 |
| G4 | Empty states с **inline-guidance** (не только кнопка, а «вот что здесь появится») | частично | P2 |
| G5 | **Server-persisted** прогресс онбординга (сейчас per-browser localStorage) | ❌ | P2 (нужен backend-репо) |
| G6 | **Training-video** URLs (3 placeholder) | ⚠️ | P3 (внешний ввод) |
| G7 | Чеклист-шаги: убедиться что открываются **прямо в create-flow**, а не просто на список | частично | P2 |

**Не делаем (перебор):** повторный product tour, coach-marks/стрелки, многошаговые модалки, «welcome video» на весь экран, принудительные gate-экраны. Research прямо против.

---

## 4. План (calibrated — ровно нужное)

### P0 — Фундамент измерения (без него всё вслепую) ✅ SHIPPED 2026-09-02
- [x] **Activation event определён** — `src/features/onboarding/activation.js`: `isActivated = projectCount>0 && billingCount>0` (проект + offer/invoice). Константа `ACTIVATION_EVENT`.
- [x] **Step-level трекинг** — `src/shared/analytics.js` (`track`/`trackOnce`, буфер в `window.__byggexpEvents` + dev-console, готов дренироваться в backend). Чеклист шлёт: `onboarding_viewed`, `onboarding_step_completed`, `onboarding_completed`, `onboarding_dismissed`, `company_activated`, `onboarding_routing_answered`.

### P1 — Персонализация входа + «живой» пустой продукт
- [x] **Routing-вопрос ✅ SHIPPED** — 1 skippable вопрос в шапке чеклиста («What matters most right now?» → crews-on-site / billing). Хранится per-company (`byggexp.onboarding.focus.<companyId>`), **переставляет** шаги (`orderStepsByFocus`), никогда не прячет. Bilingual EN/SV/NB.
- [ ] **Seed «Пример проект»** — ОТЛОЖЕНО: пишет реальные записи в БД, риск [[project_company_scoping_debt]]. Empty states уже несут title+desc+CTA (G4 закрыт), так что польза маргинальна. Вернуться если нужно.

### P2 — Полировка того, что уже есть
- [x] **Шаги открывают create-flow напрямую ✅ SHIPPED** — hrefs теперь `…?create=1`; новый хук `src/shared/hooks/useAutoOpenCreate.js` читает параметр и открывает create-модалку на 4 страницах (projects, users, clients, offers).
- [x] **G4 (inline-guidance)** — уже покрыто: все 13 empty states несут описание + CTA. Доп. работы не требуется (был бы перебор).
- [ ] Server-persist прогресса (G5) — требует endpoint в backend-репо; до тех пор localStorage ок.

### P3 — Контент (внешние вводы, не код)
- [ ] Записать/вставить 3 training-видео → `TRAINING_VIDEOS[].url` в `HelpPage.jsx` (связано с [[reference_youtube_published_videos]]).

---

## 5. Метрики успеха
- **TTV** (signup → activation event) — цель < 1.5 дня.
- **Activation rate** первые 7 дней — baseline замерить после P0.
- **Checklist completion** — вторичная, не главная.
- **Early retention** (week-1 → week-2 возврат).

---

## 6. Журнал
- **2026-09-02** — создан документ. Аудит: checklist + 13 empty states + Help = live; tour удалён намеренно. Research собран (10 источников). План P0–P3 зафиксирован.
- **2026-09-02** — реализованы **P0 + P1a(routing) + P2**: analytics helper, activation event + tests (6 passing), routing-вопрос в чеклисте (EN/SV/NB, dark), deep-link `?create=1` через `useAutoOpenCreate` на 4 страницах. Build clean, lint clean. Отложено: demo-seed (риск БД), server-persist (backend-репо), видео (внешний ввод).

---

### Sources (research)
- [Userpilot — User Onboarding 2026 / PLG in AI era](https://userpilot.com/blog/user-onboarding/)
- [Appcues — 8 user onboarding strategies](https://www.appcues.com/blog/8-user-onboarding-strategies)
- [Chameleon — onboarding best practices](https://www.chameleon.io/blog/user-onboarding-best-practices)
- [Userorbit — Patterns from 50 SaaS onboarding flows](https://userorbit.com/blog/patterns-from-50-saas-onboarding-flows)
- [72Technologies — Empty states as onboarding](https://www.72technologies.com/blog/empty-states-as-onboarding-surface)
- [DAR Design — Activation checklist 2026](https://dardesign.io/blog/saas-onboarding-2026-activation-checklist-reduce-churn)
- [Userpilot — Website tour examples & what to avoid](https://userpilot.com/blog/website-tour-examples/)
