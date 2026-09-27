# Рассылки из админки ByggExp — цель и решение

## Цель владельца (держать в уме всегда)

Рассылать **из нашей админки** (раздел Mailer: кампании, списки, трекинг, отписка)
**500–2000 писем в день**, так же как это делает Inleed Mailer.
Не через почту хостинга Inleed (лимит 300/сутки на весь аккаунт).

## Разведка Inleed Mailer (27.09.2026)

Тестовое письмо с tidrapportapp.se → Gmail: SPF / DKIM / DMARC = PASS.

- Отправляет не `mail.inleed.com`, а сервис **Pinoad**: `server37 → server.pinoad.se (Exim) → server44.pinoad.se` (IP 188.66.63.44).
- Inleed — реселлер: `X-Authenticated-Id: info@mailer.inleed.com`.
- DKIM подписан нашим доменом (селектор `pinoad`), Return-Path `noreply@bounces.tidrapportapp.se`.
- Pinoad сам ставит `List-Id`, `List-Unsubscribe` (+ One-Click).
- Вывод: Inleed Mailer = обычный SMTP-сервис рассылок с DKIM нашего домена. Такой же подключается к нашей админке через настройку SMTP.

## Решение

Подключить **Amazon SES** (регион eu-north-1, Стокгольм) как SMTP в админке.
~0,10 $ за 1000 писем, объём практически не ограничен. Запасной вариант — Brevo.

Шаги:
1. AWS-аккаунт → SES → eu-north-1.
2. Verified identity: домен отправки → 3 CNAME DKIM + MAIL FROM `bounces.<домен>` в DNS.
3. SMTP credentials → ввести в SMTP-настройки кампании в админке (в чат/репо не класть).
4. «Request production access» (выход из песочницы): B2B-письма строительным компаниям, есть отписка и обработка bounce.
5. Тестовая кампания на свои адреса → проверить «Visa original» (SPF/DKIM/DMARC PASS).

## Риски и правила

- SES (как и Pinoad) приостанавливает аккаунт при bounce > 5% или жалобах > 0,1%.
  → Базу перед отправкой прогонять через проверку адресов; только AB/HB.
- В письме: реальная тема, подпись, адрес компании
  (`Real Marketing s. r. o. · Gessayova 2616/14, 851 03 Bratislava · IČO 53551958`) и ссылка отписки.
- Прогрев: начинать с малых объёмов и поднимать постепенно.
- Для чисто холодного аутрича альтернатива — отдельные домены + ящики Google Workspace
  (30–50 писем/день на ящик) + Instantly или ротация ящиков в админке.

## Открытые пункты

- [ ] Проверить, не сломал ли SPF с `include:spf.pinoad.se` обычную почту em@ (тест из Roundcube → Gmail).
- [ ] IP 188.66.63.44 в mxtoolbox blacklists.
- [ ] Подключить SES и сделать тестовую кампанию из админки.
