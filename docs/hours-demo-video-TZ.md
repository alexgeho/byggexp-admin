# ТЗ — Таблица часов (Hours) для демо-видео

Подготовка страницы **Shifts → Hours** (`admin.byggexp.se/company/shifts`) к записи
видео про tidrapportering: реалистичные демо-данные + визуал ячеек. Собрано 2026-08-29.

---

## 1. Что показываем в видео

Грид «часы → фактура/зарплата»: для каждого сотрудника по дням видно
**Planned / GPS / Manual**, отклонения подсвечены, итоги считаются и экспортируются
(Excel/PDF). Цель — показать, как недоработка/переработка меняет фактуру и выгрузку.

Виды переключаются кнопками **Hours by: Planned · GPS · Manual**.
В виде **Planned** под крупным плановым числом показаны два замера:
GPS (зелёный) и Manual (оранжевый, кликабельный — «принять как план»).

---

## 2. Модель демо-данных (правила)

- **Manual** (введённые вручную часы) — всегда **целые** числа.
  - Обычный день = **8 ч** (как план).
  - Отдельные «короткие дни» = 6 или 7 ч — по одному-два в неделю на человека,
    чтобы было приближено к реальности (НЕ «5 дней по 7»).
- **GPS** (фактический замер) = `Manual × индивидуальный коэффициент`.
  - У каждого сотрудника **свой** коэффициент (люди приходят/уходят по-разному):
    | Сотрудник               | GPS-коэффициент | Обычный GPS (при 8 ч) |
    |-------------------------|-----------------|-----------------------|
    | Roger Eriksson          | 1.09 (+9 %)     | 8,7                   |
    | Hadjie Angela Gepanaga  | 1.05 (+5 %)     | 8,4                   |
    | Alex R                  | 1.12 (+12 %)    | 9,0                   |
    | Raderad användare       | 1.03 (+3 %)     | 8,2                   |
    | Antony Hartman          | 1.07 (+7 %)     | 8,6                   |
    | Unknown                 | 1.02 (+2 %)     | 8,2                   |
  - Коэффициенты — примерные, правятся в блоке `workers` сниппета.
- **GPS округляется до 0,1** в ячейке; Manual — целое.

Данные пишутся **в базу** (MongoDB, коллекция смен) через временный эндпоинт —
переживают перезагрузку страницы и деплой. Слетают только если по смене реально
отметятся в мобильном приложении или прогонят пересчёт смен.

---

## 3. Бэкенд — временный демо-эндпоинт

`POST /hours/demo` (ByggExp-BackEnd, `src/hours/hours.controller.ts` + `hours.service.ts`,
DTO `src/hours/dto/demo-adjust.dto.ts`). **ВРЕМЕННЫЙ — удалить после записи видео.**

Параметры (все опциональны, применяются к сменам по фильтру `projectId` + `workerIds` + `from`/`to`):

| Параметр               | Действие |
|------------------------|----------|
| `gpsFactor`            | Умножить существующий GPS (`durationMs`) на коэффициент |
| `gpsHours`             | Задать GPS = N часов (0 = убрать GPS) |
| `manualHours`          | Задать Manual = N часов |
| `manualFactor`         | Manual = доля от GPS (напр. 0.85 — всегда чуть ниже GPS) |
| `roundManualHours`     | Округлить Manual до целых часов |
| `gpsFromManualFactor`  | GPS = (округлённый) Manual × коэффициент |

Стадии выполняются по порядку (multi-stage aggregation pipeline), поэтому
`gpsFromManualFactor` считает GPS от уже применённого `manualHours`/округления.

---

## 4. Консольный сниппет (актуальная версия)

На `admin.byggexp.se` (страница Hours с нужным проектом и периодом) → **⌘+⌥+J** → вставить → Enter → после **⌘+R**.

```js
(async () => {
  const API = 'https://api.byggexp.se';

  // ======== EDIT THESE ========
  const baseManual = 8; // обычный день, ч

  const workers = [
    { name: 'Roger Eriksson',         gps: 1.09 },
    { name: 'Hadjie Angela Gepanaga', gps: 1.05 },
    { name: 'Alex R',                 gps: 1.12 },
    { name: 'Raderad användare',      gps: 1.03 },
    { name: 'Antony Hartman',         gps: 1.07 },
    { name: 'Unknown',                gps: 1.02 },
  ];

  const shortDays = [
    { name: 'Roger Eriksson',         date: '2026-07-09', hours: 6 },
    { name: 'Roger Eriksson',         date: '2026-07-16', hours: 7 },
    { name: 'Hadjie Angela Gepanaga', date: '2026-07-07', hours: 6 },
    { name: 'Hadjie Angela Gepanaga', date: '2026-07-22', hours: 6 },
    { name: 'Alex R',                 date: '2026-07-10', hours: 6 },
    { name: 'Alex R',                 date: '2026-07-17', hours: 7 },
    { name: 'Raderad användare',      date: '2026-07-08', hours: 6 },
    { name: 'Raderad användare',      date: '2026-07-21', hours: 6 },
    { name: 'Antony Hartman',         date: '2026-07-14', hours: 6 },
    { name: 'Antony Hartman',         date: '2026-07-23', hours: 7 },
  ];
  // ============================

  let token = null;
  for (const k of Object.keys(localStorage)) {
    const m = (localStorage.getItem(k) || '').match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
    if (m) { token = m[0]; break; }
  }
  if (!token) return console.error('No auth token found — logga in först.');
  const H = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  let v = {}; try { v = JSON.parse(localStorage.getItem('byggexp.hours.view.v1') || '{}'); } catch {}
  const projectId = v.projectId;
  const from = v.from ? String(v.from).slice(0,10) : undefined;
  const to   = v.to   ? String(v.to).slice(0,10)   : undefined;

  const q = new URLSearchParams();
  if (projectId) q.set('projectId', projectId);
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const grid = await fetch(`${API}/hours?${q}`, { headers: H }).then(r => r.json());
  const id = {}; (grid.workers || []).forEach(w => id[w.name] = w.workerId);
  const gpsOf = {}; workers.forEach(w => gpsOf[w.name] = w.gps);
  const demo = body => fetch(`${API}/hours/demo`, { method:'POST', headers:H,
    body: JSON.stringify({ projectId, from, to, ...body }) }).then(r => r.json());

  // 1) БАЗА per-worker: manual = 8ч, GPS = 8 × свой коэффициент
  for (const w of workers) {
    const wid = id[w.name];
    if (!wid) { console.warn('skip (no worker):', w.name); continue; }
    console.log(`base ${w.name}:`, await demo({ workerIds: [wid], manualHours: baseManual, gpsFromManualFactor: w.gps }));
  }

  // 2) КОРОТКИЕ ДНИ: точечно перекрываем, GPS тем же личным коэффициентом
  for (const s of shortDays) {
    const wid = id[s.name];
    const f = gpsOf[s.name] || 1.05;
    if (!wid) { console.warn('skip (no worker):', s.name); continue; }
    console.log(`short ${s.name} ${s.date} ${s.hours}h:`, await demo({ workerIds: [wid], from: s.date, to: s.date, manualHours: s.hours, gpsFromManualFactor: f }));
  }

  console.log('✅ Klart — ladda om sidan (Cmd+R).');
})();
```

---

## 5. Визуал ячеек (фронт, `src/features/shifts/HoursPage.*`)

- Основное число ячейки (`.big`) и вторичное под ним (`.alt`) — **16px**, одинаковый размер.
- Парные замеры GPS/Manual (`.measures .m`) — 12.5px, `font-weight:300`.
- **Подсветка «факт vs план»** — сравнивается **Manual** (введённые часы) vs `planned`
  (фолбэк на GPS, если Manual нет), порог = grace (по умолч. 20 мин). Без «винегрета»:
  - Часы **=** плану → **фиолетовый** (`planned-fill`, токен `--h-plan-bg`).
  - Часов **меньше ИЛИ больше** плана → **оранжевый** (`flag-under`/`flag-over`, токен `--h-under-*`).
  - Сравнение по Manual — потому что GPS всегда чуть выше плана; иначе всё было бы оранжевым.

При текущих демо-данных: обычные дни = фиолетовые (Manual 8 = план), короткие дни = оранжевые.

---

## 6. Экспорт

Кнопка **Export** (Excel/PDF), выгрузка Planned/GPS/Manual из этого же грида.
Без выделения строк — выгружаются все сотрудники; с выделением — только выбранные.

---

## 7. После записи видео — откатить

- Удалить эндпоинт `POST /hours/demo` (controller + service `demoAdjust` + DTO `DemoAdjustDto`).
- Демо-данные в базе перезапишутся при реальных отметках либо очистить вручную.
