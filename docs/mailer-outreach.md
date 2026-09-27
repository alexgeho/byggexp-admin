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

**Выбрано владельцем (27.09.2026): Brevo, бесплатный тариф — 300 писем/день.**
SMTP: `smtp-relay.brevo.com`, порт 587 (STARTTLS), логин и SMTP-ключ из Brevo → SMTP & API.
Домен: Senders, Domains & Dedicated IPs → Domains → добавить домен → записи DNS (код Brevo, DKIM, DMARC) → Verify/Authenticate.
Если понадобится больше 300/день — платный Brevo или Amazon SES (ниже).

Альтернатива на объём: **Amazon SES** (регион eu-north-1, Стокгольм) как SMTP в админке.
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

## Статус на 27.09.2026 — Brevo ПОДКЛЮЧЁН и работает

Сделано:
- Аккаунт Brevo (Free, 300 писем/день) на **Real Marketing s. r. o.**, адрес Gessayova 2616/14, 851 03 Bratislava.
- Домен `tidrapportapp.se` аутентифицирован и «branded» в Brevo (поддомен ссылок `send.tidrapportapp.se`).
- DNS в панели Inleed (login.inleed.net → Domänhantering → tidrapportapp.se → DNS-poster), добавлено:
  - TXT `@` `brevo-code:…`
  - CNAME `brevo1._domainkey` → `b1.tidrapportapp-se.dkim.brevo.com.`
  - CNAME `brevo2._domainkey` → `b2.tidrapportapp-se.dkim.brevo.com.`
  - CNAME `send`, `r.send`, `img.send` → `send-tidrapportapp-se[.r|.img].brand.brevosend.com.`
  - **DMARC — одна запись** (было две, склеили):
    `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com,mailto:dmarc@pinoad.se`
  - SPF не меняли: `v=spf1 a mx ip4:188.66.60.20 ip4:188.66.60.21 include:spf.inleed.se -all`
    (Pinoad/Brevo проверяют SPF на своих поддоменах → обычная почта em@ не сломана).
- Отправитель в Brevo: `Alexander Gerhard <alexander@tidrapportapp.se>` — Verified, DKIM ✓, DMARC ✓.
- SMTP-ключ Brevo создан (назван `byggexpAdmin`, Standard, истекает 27.09.2027 и после 90 дней без отправок).
  Ключ не хранить в чате/репо — он только в админке (шифрованно).
- Админка → Настройки рассылки (`/admin/mailer/settings`):
  сервер `smtp-relay.brevo.com`, порт 587, логин `bb6479001@smtp-brevo.com`, пароль = SMTP-ключ,
  отправитель и reply-to `alexander@tidrapportapp.se`, 50 писем/час, трекинг открытий/кликов вкл.
  «Проверить подключение» → OK.
- Тест из кампании пришёл в Gmail во «Входящие» (не спам).

Грабли, на которые наступили:
- Логин SMTP в Brevo — не почта аккаунта, а `…@smtp-brevo.com` со страницы SMTP & API.
- Пустое поле «Пароль» в админке = оставить старый. Ключ надо вставлять заново.
- «SMTP key couldn't be added» в Brevo — временный сбой нового аккаунта, прошло само.
- Две записи `_dmarc` ломают DMARC — Inleed Mailer добавил свою `rua=mailto:dmarc@pinoad.se` без `v=DMARC1`.
- Кнопку Brevo «Activate for SMTP keys» (блок по IP) НЕ нажимать — заблокирует отправку с нашего VPS.

## Следующие шаги (продолжать отсюда)

1. [ ] Проверить заголовки тестового письма: Gmail → ⋮ → «Show original» → SPF/DKIM/DMARC = PASS,
   DKIM с доменом `tidrapportapp.se`.
2. [ ] Удалить в Brevo лишнего отправителя `870717ag@gmail.com` (Senders → ⋮ → Delete).
3. [ ] Подтвердить телефон в Brevo (баннер «Verify your phone»), иначе могут не пускать отправку.
4. [ ] Письмо для аутрича: нормальная тема, подпись, без невидимых символов, подвал с адресом
   Real Marketing s. r. o. + IČO и ссылкой отписки. Проверить на mail-tester.com (цель ≥ 9/10).
5. [ ] Проверить, не дублируется ли трекинг: Brevo может сам переписывать ссылки/ставить пиксель
   поверх нашего трекинга. Если в письме ссылки ведут на `send.tidrapportapp.se` — решить, чей трекинг оставить.
6. [ ] Список ≤ 300 адресов в день (лимит Free; в админке дневного лимита нет — лишнее Brevo отклонит,
   письма станут failed). Базу прогнать через проверку адресов, только AB/HB.
7. [ ] Прогрев: первая неделя 20–50/день, потом поднимать.
8. [ ] (Возможная доработка админки) дневной лимит писем в настройках рассылки, чтобы не упираться в 300 Brevo.
9. [ ] Когда 300/день мало — Brevo Starter (от 7 €/мес) или Amazon SES (см. выше).

## Прочие открытые пункты

- [x] SPF обычной почты em@ не сломан (pinoad в основной SPF не добавлялся).
- [ ] IP Pinoad 188.66.63.44 в mxtoolbox blacklists (если Inleed Mailer ещё пригодится).
