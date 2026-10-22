# Löneunderlag enligt Byggavtalet → Fortnox (этап 1)

ByggExp считает основание для зарплаты (lönerunderlag) по правилам Byggavtalet
и отдаёт его в Fortnox Lön файлом PAXml. Налог, sjuklön, karens и саму выплату
считает Fortnox.

## Откуда берутся данные
- **Часы** — завершённые смены (`Shift`) за период; по умолчанию только
  аттестованные (`approvedAt`). Ручные часы рабочего важнее GPS.
- **Тип часов** (`normal | overtime | ob`), **км**, **минуты в пути**,
  **traktamente** (`perDiem: none | half | full`) — из «Dagens rapport» в смене.
- **Отсутствие** — одобренные заявки из Frånvaro; 8 ч на будний день, 4 ч на
  полдня. Выходные пропускаются (праздники пока нет).
- **Сотрудник** — `hourlyRate`, `wageCategory`, `fortnoxEmployeeId`
  (карточка сотрудника → поля под налоговой таблицей).

## Avtalsregler (суперадмин): Payroll → Avtalsregler
Версия правил с датами действия: минимальные ставки по категориям, надбавки за
övertid/OB (% от ставки или kr/ч), semesterersättning %, ATK %, bilersättning
(+ безналоговая часть), restidsersättning, traktamente (+ normalbelopp).

- Цифры вводит человек **из текста договора / циркуляра BI·Byggnads / сайта
  Skatteverket**. Система ничего не угадывает.
- Опубликовать можно только с заполненным «Källa» и минимальными ставками.
- Опубликованная версия заблокирована (меняются только дата окончания и
  источник), чтобы старые периоды не пересчитывались задним числом.
- Новый договор: Duplicera → новые даты и цифры → закрыть старую версию датой →
  Publicera.
- Нет опубликованной версии на дату → считается только базовая ставка, и
  экран это показывает.

## Компания: Payroll → «Löneunderlag → Fortnox»
1. **Fortnox-koder**: для каждой позиции указать номер lönearten из своего
   Fortnox Lön (у каждой компании свои). Коды отсутствия по умолчанию — SJK,
   SEM, VAB, FPE, TJL. Позиция без кода не попадает в экспорт и помечается.
2. Выбрать период → проверить предупреждения (ставка ниже минимальной, нет
   категории, нет номера в Fortnox, нет кода).
3. «Exportera till Fortnox (PAXml)» → в Fortnox: Lön → Importera → PAXml.

## Перед первым реальным запуском
- Ввести и опубликовать действующий Byggavtalet (цифры взять у клиента / BI).
- Сделать тестовый импорт в Fortnox клиента и сверить один месяц вручную:
  формат PAXml написан по стандарту 2.0, но на реальном аккаунте Fortnox
  ещё не проверялся.
- Если в Fortnox semesterersättning уже считается по настройкам сотрудника —
  оставить «Semesterersättning %» пустым, чтобы не начислить дважды.

## API (backend `src/payroll/`)
- `GET /payroll-basis?from&to` — расчёт; `GET /payroll-basis/paxml?from&to` — файл.
- `GET|PUT /payroll-basis/settings` — коды Fortnox компании.
- `GET|POST /payroll-basis/rules`, `PATCH /rules/:id`, `POST /rules/:id/duplicate`,
  `POST /rules/:id/publish`, `DELETE /rules/:id` — запись только суперадмин.
- Расчёт — чистые функции в `wage-basis.ts`, экспорт — `paxml.ts`, тесты рядом.
