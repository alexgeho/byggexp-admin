# Дизайн-система ByggExp Admin

Рабочий файл. **Любое изменение UI сверять с ним.** Не совпадает — баг.

---

## Таблица часов (Arbetspass → Timmar)

Полные правила: [hours-grid-rules.md](hours-grid-rules.md).

### Цвета ячеек — только 3

| Цвет | Токен | Когда |
|---|---|---|
| Фиолетовый | `--h-plan-bg` | все будние дни (план) |
| Кремовый | `--h-under-bg` | отклонение часов от плана, или человека не было вообще (ни GPS, ни вручную), или Frånvaro |
| Серый `#f3f5f8` | `--h-weekend` | все выходные, даже если человек работал |

### Размеры цифр в ячейке (эталон — YouTube-ролик «Exportera tidrapport»)

- Крупная цифра (`.big`) — 16px, обычная толщина: по высоте как имя сотрудника, не больше.
- Мелкие цифры (GPS / вручную) — 13.5px, толщина 300.
- Тотал справа — 15px.

### Запрещено

- Белый, зелёный, красный или любой 4-й цвет фона ячейки.
- Смена цвета при наведении, выделении строки или колонки.
- Значки в пустых ячейках: `·`, `0`, серый `–`. Единственный значок — `–` в кремовой ячейке «не был».
- Жирный шрифт в ячейках. Прочерк «–» той же толщины (300) и того же оранжевого (`--h-manual`), что цифра ручного ввода.
- Новые индикаторы (точки, бейджи), которых нет в этом файле.

### Чек перед выкаткой

1. На проде посчитать фоны ячеек: должно быть ровно 3 значения.
2. Выходные — только серый, будни — только фиолетовый или кремовый.
3. Скриншот в чат.

---

## Leverantörer → Prislista

- Senaste import: grå text (`Typography.Text type="secondary"`) «Prislista uppdaterad <datum>».
- Aldrig importerad eller äldre än 90 dagar: bärnstensfärgad varningsikon (`WarningOutlined`, `#d97706`) + blå länk «Uppdatera prislistan» (öppnar importen med leverantören vald).
- Blått bara för handlingen, bärnsten bara för ikonen.

---

## Integrationer och material (2026-10-26)

- **Fortnox-kort (Profil):** titel «Fortnox» + ansluten företagsnamn i grått; en knapp: «Anslut» (blå) eller «Koppla från» (röd). Ingen hjälptext. Inte konfigurerat → «Anslut» blek/inaktiv.
- **Faktura ⋮:** «Skicka till Fortnox» finns bara för bokförda fakturor och bara när Fortnox är anslutet; efter skick → inaktiv rad «Fortnox #nr».
- **Projekt → Ekonomi → Material:** tabell Nr / Leverantör / Artiklar / Önskat datum / Status, åtgärder i ⋮, blå «Ny beställning» uppe till höger, kugghjul = leverantörsinställningar (bara companyAdmin).
- **Beställt material** är en egen rad i projektets ekonomi och räknas i kostnad/marginal; order kopplad till en leverantörsfaktura räknas inte (ingen dubbelräkning).
- **Appen:** fakturerad order visar grått «Fakturerad #nr»; «Skickad till Fortnox» grått på egen rad i fakturakortet.

## Release-regel (ägaren, 2026-10-26)

- En butiksbuild byggs ALLTID från main efter senaste OTA — appen ska fungera fullt vid första start, aldrig «starta om några gånger».
- Gamla builds efter en ny OTA är föråldrade och skickas inte in.
