# Дизайн-система ByggExp Admin

Рабочий файл. **Любое изменение UI сверять с ним.** Не совпадает — баг.

---

## Общие правила (замечания владельца, применять на всю админку)
- Одинаковое — одинаково (дизайнер-критик, 2026-11-11): выбранный элемент в любом блоке = строка 40px, текст 14/400, справа серое ×, без подложки и без красной корзины; заголовок блока → первый элемент 12px; пустой блок без тела; при правке у блока тоже заголовок; Segmented 40px; одна сетка 50/50 для всех рядов; все «Välj befintlig» одинаковые — без поиска, выбранное в списке не показывается.
- «Välj befintlig» и поля нового — 50/50: дропдаун шириной в правую колонку, его левый край = левый край правой колонки полей. Адрес принадлежит ордеру (блок Order: Rubrik | Orderreferens, Adress), не клиенту (2026-11-11).
- В формах все контролы одного вида: высота 40 (включая DatePicker/TimePicker/InputNumber и мультиселект с тегами), рамка #e7ecf0 и без смены фона при наведении, иконки серые #6b7f94, подписи 13px/600 #47617a; в окне одна синяя кнопка (главное действие), остальные — secondary; правые края блоков на одной вертикали (2026-11-11, дизайнер).
- ЕДИНОЕ правило «новое по умолчанию + справа «Välj befintlig»» для всех блоков быстрого окна: Order, Kund, Personal (справа «+ Lägg till»). Выбрали существующее — вместо полей карточка с ×; для существующего ордера бронь и артикулы добавляются к нему (2026-11-11).
- Окно ордера: без Ansvarig и без Antal у артикулов (2026-11-11).
- Выбор существующего (клиента и т.п.) в быстрых окнах — компактный дропдаун справа в заголовке блока, без отдельного поля поиска (2026-11-11).
- Время в окне ордера: сразу две строки — Från [дата][время] и Till [дата][время], без скрытых ссылок «+ Flera dagar» (2026-11-11).
- Переключатели (Segmented) в формах — компактные по тексту, не растягивать на всю ширину (2026-11-11).
- Плейсхолдеры и подписи — одно-два слова: «Sök kund», «Privatperson / Företag»; без перечислений «namn, telefon eller adress» (2026-11-11).
- Адрес в быстрых формах — одно поле «Adress» одной строкой (без отдельных Postnummer/Ort) (2026-11-11).
- Под шапкой окна (AdminModal) нет разделительной линии — во всех окнах (2026-11-11).
- НИЧЕГО не добавлять сверх того, что сказал владелец. Советы критика/свои идеи — только предложением, делать после его «ок» (2026-11-11: добавил «Beskrivning» по совету критика — владелец взорвался).
- Текстовые поля никогда не большие: одна строка; больших textarea в окнах не делать (2026-11-11).
- Окно ордера (после UX-критика, 2026-11-11), в порядке телефонного звонка: Rubrik + Orderreferens → Kund (по умолчанию поля нового клиента «Privatperson / Företag»; существующего — компактный дропдаун «Välj befintlig» справа в заголовке Kund, без поиска + имя, телефон, e-post, адрес; Kundnr — авто, Land/Mobil/Webbplats/Personnummer/Betalningsvillkor — только на странице клиента) → Tid (Från дата+время, Till дата+время; Bara vardagar если дни разные) → Personal (только выбор сотрудников; Ansvarig в окне нет — ответственный = кто создал) → Artiklar (Artikel + Pris, без Antal) → Ekonomi (свёрнуто: Budget, Debiteras/timme; Planerade timmar считаются сами). Status — только при правке. Verktyg и Ordertyp в окне нет. Протяжка в календаре — шаг 30 мин, минимум 1 час.
- Минимализм в окнах: не делать «коробку в коробке» — секции без рамок, только заголовок-строка со стрелкой и отступ (2026-11-11).
- Окно ордера = всё в одном месте (из календаря, без перехода по страницам): Order (Orderreferens, Status, Orderansvarig, Anteckning; Ordertyp в окне нет — пока Service), Kund (все поля формы клиента, адрес внутри клиента; «Välj befintlig»), Betalningsvillkor (свёрнуто), Tid, Anställda + Verktyg, Artiklar, Ekonomi (свёрнуто) (2026-11-11).
- Окно ордера: Rubrik сверху, ниже сворачиваемые блоки (Kund, Tid, Anställda, Artiklar; свёрнутость запоминается). Kund по умолчанию = новый клиент (Privatperson/Företag, имя, телефон, e-post) + Adress; рядом в заголовке дропдаун «Välj befintlig» (2026-11-11).
- Любое удаление/изменение в Planering даёт плашку «Ångra» внизу (12 с), как в Gmail. «Ta bort» в окне ордера удаляет только того человека, по чьему блоку кликнули; сохранение меняет только разницу (2026-11-11).
- Окно ордера (календарь) одно для создания и правки: Rubrik, Kund, Från–Till даты, Starttid–Sluttid, «Endast vardagar» для нескольких дней, Anställda, Adress, Artiklar. Клик по блоку открывает это же окно (2026-11-11).
- Календарь Planering: слева список людей с цветным чекбоксом (как «My calendars» в Google) — галочка показывает/прячет человека; выбор запоминается. Planering открывается на последнем выбранном периоде (2026-11-11).
- Термин: везде «Order», не «Projekt» (sv Order, en Order, nb Ordre, ru Заказ). Делается одним словарём src/i18n/terminology.js в t() — новые строки пишем как обычно (2026-11-11).
- Vecka / 2 veckor в Planering → Personal = сразу календарь как Google (часы слева), без переключателя; Månad / Anpassad = линия (2026-11-11).
- Kalender: протяжка мышью по дню выделяет время (шаг 15 мин, клик = 1 час) → окно «Ny arbetsorder» (рубрика, время, рабочие, адрес, артикулы); главная кнопка сверху справа (2026-11-11).
- Planering, календарь (Vecka / 2 veckor): как Google Calendar — часы слева (06–20), столбец на день, сегодня — синий кружок с числом, блок = цвет человека; клик по часу создаёт назначение с этим временем (2026-11-11).
- Сетки по дням: в шапке три строки — месяц, неделя, день; день подписан днём недели на языке админки («mån 9»), когда хватает ширины. Периоды: Vecka / 2 veckor / Månad / Anpassad (2026-11-11).
- Назначение человека не требует проекта — можно забронировать день без проекта («Utan projekt») (2026-11-11).
- Без зебры: строки таблиц/сеток не чередуют фон, ряды разделяет только тонкая линия (2026-11-11).
- Полосы/чипы планирования — только холодные цвета (синие, бирюзовые, индиго, фиолетовые), без розового/оранжевого; в Planering → Personal у каждого человека свой цвет.
- Мультивыбор (Select mode=multiple): после выбора пункта список закрывается.
- Тёмный режим: любая таблица/сетка (включая Planering-таймлайн) — тёмная, без белых фонов; новые таблицы сразу получают dark-стили.
- Колонка с именами в сетках — узкая (Planering 240px); длинное имя обрезается многоточием, не расширяет колонку.

Список правок с чекбоксами: [PRAVKI.md](PRAVKI.md) (оригинал ~/OneDrive/byggexp-admin/PRAVKI.md).

### Высота контролов — 40px (2026-11-10, Bemanning)
- Всё в одной строке над таблицей одной высоты, 40px: переключатель (Vecka / Anpassad), стрелки, селект «Alla projekt», кнопки, поиск, поля даты.
- Менять только высоту (40px, текст по центру по вертикали) — вид контрола не трогать. Bemanning «Vecka / Anpassad» остаётся серой подложкой с белой активной кнопкой.
- Проверка: getBoundingClientRect().height у всех контролов строки = 40.

### Planering = единственный план людей (2026-11-10)
- Bemanning слит в Planering → Personal. Второй экран с теми же данными не заводить.

### Назначение в ячейке (2026-11-10, Bemanning)
- Bemanning удалён (слит в Planering). В Planering полоса назначения — сплошной холодный цвет человека, подпись проекта + часы («8 h»), перегруз >8 ч — красная обводка. Правила ниже — для любых бледных чипов-назначений в других сетках.
- Вид чипа не менять: бледный фон проекта + цветная полоска слева. Сплошную заливку не делать (владелец отменил).
- Чип по центру ячейки по вертикали.
- Правка «выровнять» = менять только положение/высоту, дизайн элемента не трогать.

### Кликабельная пустая ячейка (2026-11-10, Bemanning)
- Пустая кликабельная ячейка видна как плейсхолдер всегда, без наведения: узкая ячейка (зум) — «+», есть место — «+ Tilldela». Без рамки; пунктирная синяя рамка — только при наведении.

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
- Новые индикаторы (точки, бейджи), которых нет в этом файле. Исправленная админом ячейка тоже без точки — отметка только в подсказке (2026-11-11).

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
- Svar: ingen kolumn Konkurrent (konkurrenter syns bara som chips ovanför).
- Svar: kolumn Etapp per lead — Svarat → Besvarad → Möte → Offert → Kund / Förlorad. Tom = automatiskt (svar/✓/nej); satt för hand = lämnar Att svara.
- Delningslänk: «Kan redigera» (av som standard) ger kollegan hela listorna + kategori/anteckning/etapp/✓; utan den bara siffror.

## Löner → Ny lönekörning (2026-10-27)
- Blå «Ny lönekörning» (plus) först i verktygsraden på Löner. Utan modulen Arbetspass: tomläget «Inga timmar…» leder hit i stället för till Arbetspass.
- Sida: Tillbaka · månad · blå «Spara» (inaktiv tills något är ifyllt). Kort «Ny lönekörning» med en tabell: Anställd (spänner över personens rader), Typ (Normal/Övertid/OB/Månadslön/Övrigt), Timmar, Timlön, Belopp, ikoner Ta bort + Lägg till rad i fasta platser.
- Timrader: Belopp = timmar × timlön (räknas, ej redigerbart); timlön förifylld från personens timlön. Månadslön/Övrigt: belopp skrivs in; Övrigt har en textruta (t.ex. Bonus).
- Faktor alltid 1 — övertid/OB-ersättning anges som egen timlön.
- Spara → lönekörningen (utkast). Inmatat utkast har «Redigera» i körningen (rubrik «Redigera lönekörning»); basis visas som «Inmatad» (timrapportens eget mått heter «Manuellt»).
- Löner: «Exportera till lönesystemet» är en vanlig (inte blå) knapp — blå är «Ny lönekörning».
- Körning med flera rader per person: Timlön/Faktor visas som «—» i tabell och CSV.

## Tratt — Лиды (2026-11-01)
- Первые колонки: Мейл (ссылка сразу на письмо) · Чей ход (Ждёт нас / Ответили) · Посл. контакт · Описание. «Ждёт нас» сверху.
- Сортировка по «Посл. контакт», новые сверху (и в админке, и в Google-таблице). Тег «Ждёт нас» — warning (оранжевый), «Ответили» — серый; дата красная, если ждёт нас > 24 ч. ✓ только у «Ждёт нас».
- Настройки ящика бренда: поле «Google-таблица» (ссылка); кнопка-иконка таблицы в шапке открывает её. Без подсказок.

## Företagsuppgifter + fakturor — Norge (2026-11-01)
- Hemmamarknad = Norge: fälten Kontonummer (MOD11-kontroll), KID (Ingen/MOD10/MOD11, standard MOD10), MVA-registrert, Foretaksregisteret. Bankgiro, Plusgiro, F-skatt och Momsreg.nr döljs. Ingen hjälptext.
- Fakturor/offerter för NO: alltid NOK, momssatser 25/15/12/0, ingen ROT/omvänd moms, kolumnen OCR heter KID. Fältet Leveringssted bara för NO (tomt = projektets/kundens adress).
- Betalningsplanering: knappen «Skicka påminnelse» visas inte för NO (påminnelser är svenska).

## Avvik / Avvikelser (2026-11-01)
- Produktion → «Avvikelser» (nb «Avvik») + projektflik efter Uppgifter. Tabell: #nr, Rubrik, Projekt, Kategori, Allvarlighetsgrad, Ansvarig, Åtgärdas senast, Status, ⋮ (Stäng/Öppna igen, Redigera, Ta bort).
- Pills: Alla · Öppen · Pågår · Försenad · Stängd med antal. Filter: projekt + kategori. «Exportera» → PDF / CSV (avviksrapport, nb för NO-företag).
- Statusfärger: Öppen röd, Pågår bärnsten, Stängd grön — aldrig blå (blå = handling). Passerad frist: datumet rött, inget mer.
- Radklick → drawer: fakta, text, foton, Historik (grå rader). Footer: blå «Stäng avvikelse» (bara admin/projektadmin), «Redigera». Stäng = modal med Åtgärd + Kommentar vid stängning (krävs; «Stäng avvikelse» inaktiv tills ifyllt).
- Kategori: Arbetsmiljö (sv) / HMS (nb) / HSE (en), Kvalitet, Miljö. Ingen hjälptext i formuläret.
- Egenkontroll-punkt med Anmärkning och dagbok med «Avvikelser / hinder»: textlänk «Skapa avvikelse» → formuläret förifyllt.

