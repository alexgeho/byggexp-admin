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

## Leverantörer (Register → Leverantörer, 2026-10-27)

- Egen sida, en källa: tabell Namn / E-post för beställningar / Kundnummer / Prislista (datum). Tomt = grå streck.
- Blå «Lägg till leverantör» uppe till höger; radklick = redigera. ⋮: Redigera, Importera prislista, Ta bort (bekräftelse).
- «Ta bort» = dold (artiklar och gamla order kvar); lägg till samma namn igen = tillbaka. Samma i appen (Meny → Ekonomi).
- Prislista äldre än 90 dagar / aldrig: bärnstensfärgad `WarningOutlined` (`#d97706`) bredvid datumet, inget mer.
- Projekt → Material: kugghjulet öppnar den här sidan (ingen egen modal).
- Kolumn «Rabattbrev» = datum för senaste uppladdning (grå streck om inget). ⋮ «Rabattbrev» → en dropzone, «Importera»; ingen förklarande text.
- Rabattbrev = rabatt % per rabattgrupp; gäller bara listpris (nettopris rörs inte). Inköpspris = listpris − rabatt, påslaget per artikel behålls.

---

## Integrationer och material (2026-10-26)

- **Fortnox-kort (Profil):** titel «Fortnox» + ansluten företagsnamn i grått; en knapp: «Anslut» (blå) eller «Koppla från» (röd). Ingen hjälptext. Inte konfigurerat → «Anslut» blek/inaktiv.
- **Faktura ⋮:** «Skicka till Fortnox» finns bara för bokförda fakturor och bara när Fortnox är anslutet; efter skick → inaktiv rad «Fortnox #nr».
- **Projekt → Ekonomi → Material:** tabell Nr / Leverantör / Artiklar / Önskat datum / Status, åtgärder i ⋮, blå «Ny beställning» uppe till höger, kugghjul = Register → Leverantörer (bara companyAdmin).
- **Beställt material** är en egen rad i projektets ekonomi och räknas i kostnad/marginal; order kopplad till en leverantörsfaktura räknas inte (ingen dubbelräkning).
- **Appen:** fakturerad order visar grått «Fakturerad #nr»; «Skickad till Fortnox» grått på egen rad i fakturakortet.

## Release-regel (ägaren, 2026-10-26)

- En butiksbuild byggs ALLTID från main efter senaste OTA — appen ska fungera fullt vid första start, aldrig «starta om några gånger».
- Gamla builds efter en ny OTA är föråldrade och skickas inte in.

## Inköpsfakturor ← Fortnox (2026-10-27)

- Fortnox-importerad faktura: grå text «Fortnox» bredvid leverantören (ingen tagg, ingen ikon). Fakturerad vidare: grå «Fakturerad #nr».
- ⋮ för Fortnox-fakturor: bara Redigera (projekt/kategori/anteckning), Öppna original, Fakturera kund. Inga Godkänn/Betald/Kreditera/Ta bort — Fortnox äger beloppen.
- «Hämta från Fortnox» (sekundär knapp i verktygsraden) syns bara när Fortnox får läsa leverantörsfakturor; körs även nattligen.
- «Fakturera kund»: ⋮ på en rad eller markera flera (samma projekt) → ett fält Påslag % → utkast till kundfaktura, en rad per inköpsfaktura.
- Påslag-dialogen: bredd 440 så att «Påslag %» står på en rad; blå «Fortsätt» uppe till höger.
- Text på raden: «Fakturerad #nr» (samma ord som i appen), grå 12 px, ingen tagg.

## Profil → Fortnox-kort (2026-10-27)

- Ansluten men saknar ny behörighet (t.ex. leverantörsfakturor): en blå «Anslut igen» i stället för «Koppla från». Ingen förklarande text.


## Löner → ⋮ Arbetsgivardeklaration (2026-10-27)

- Modal: månadsväljare (utbetalningsmånad, standard = innevarande), sedan en tabell: Anställda, Bruttolön, Skatt, Arbetsgivaravgifter, **Att betala** (fet), Bankgiro 5050-1055, Sista dag.
- Saknas något (personnummer, org.nr, kontaktuppgifter) → en gul rad med vad som saknas; «Ladda ned fil» är då inaktiv.
- Blå «Ladda ned fil» uppe till höger → XML som laddas upp i Skatteverkets e-tjänst med BankID. Ingen förklarande text i modalen.
- Inaktiv knapp (alla ui-button, även blå i modalhuvud): opacity 0,45 + not-allowed — en inaktiv blå knapp får aldrig se aktiv ut.

## Ekonomi → Bokföring (2026-10-27)
- En tabell: konto, namn, IB, förändring, UB. Ovanför: år (Select) + Segmented «Balansräkning | Resultaträkning <resultat>».
- Huvudknapp «Importera SIE» (öppnar filväljaren direkt, ingen dialog). Samma år igen = ersätts.
- Klick på rad → modal «konto namn» med verifikationer (datum, ver, text, belopp). Belopp högerjusterade, tomt = tomt.

## Tratt → Att svara (2026-10-27)
- Första fliken (bara admin): ett lead per avsändare — senaste mejlet som ingen svarat på (IMAP \Answered), äldst först. Gäller kampanjsvar + nya förfrågningar till brandens inkorg.
- Kolumner: Från, Meddelande (ämne + AI-notis, 📎 antal bilagor med namn i tooltip), Kategori, Väntar (h/d, röd ≥ 24 h), ⋯ öppna i webmail + ✓ Besvarad.
- Ägaren får mejl en gång per lead som väntat > 4 h (08–19).
- Långa mejltexter (Att svara, Svar): 2 rader + «Expandera/Fäll ihop» på plats (Typography ellipsis collapsible), inga popups.
