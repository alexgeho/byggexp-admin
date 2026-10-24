# Презентация для Lucas (Svea) — от дневного отчёта до Fortnox Lön

Шведская дека: https://claude.ai/artifact/2ndwVK4vDB4m4u3wfR69af (приватная — поделиться через Share).
Скриншоты админки и пример PAXml: ~/Desktop/Lucas-admin-skarmbilder.

Демо-данные снимались на ЛОКАЛЬНОЙ базе (byggexp_local): `demo-seed.mjs` заполняет октябрь 2026
(3 работника через POST /shifts/manual, решения övertid/OB, attest, frånvaro). Перед ним в Mongo:
опубликованный Byggavtalet (демо-ставки), wageCategory/payrollEmployeeId у работников, 2 кvitton,
настройки зарплаты PUT /payroll-basis/settings (Fortnox, PAXml, lönearter-пример 11/31/35/51/61/62/71/72/73).
