# Bank-transaction import for Projektkalkyl — research & recommendation

Date: 2026-09-18. Question: how should ByggExp let users get bank transactions into
the Projektkalkyl sheet (row-by-row), what are the world practices, and what
ready modules can we buy/rent/subscribe. Companies: mostly Swedish (SEK), some
Nordic, one Polish entity (PLN). Sources verified via a fan-out research harness
(22 claims confirmed by 3-vote adversarial check; 3 killed). Key URLs at bottom.

## TL;DR recommendation
**Build the free file-upload path now; postpone Open Banking.** The old "free
Nordigen" that every tutorial recommends is **closed to new signups / being wound
down** — so the cheap live-feed route we assumed is gone. A file parser is 0 €/mo,
uses libraries we already have, and covers the actual ask ("load from bank, lay
out by rows, sort what goes where"). Open Banking becomes a Phase 2 only if users
demand no-file automation — and then **Enable Banking** (free "Restricted
Production" tier, works on *their* AISP licence) is the realistic entry, not
Nordigen.

---

## Path 1 — File upload (RECOMMENDED, free)

### What banks actually export
- **CSV / XLSX** — the common case. Per-bank column order differs → needs a
  column-mapping step. Swedish CSVs are often `;`-delimited and Windows-1252
  encoded (åäö) — must handle or text breaks.
- **ISO 20022 camt.053 / camt.052** — XML "bank statement" standard; what
  business bank portals increasingly offer. Structured, no guessing.
- **MT940** — legacy SWIFT statement, still exported by some banks.
- **OFX / QFX / QIF** — Anglo formats (Xero/Quicken world), less relevant in SE.
- **Bankgirot BgMax** (Swedish specific) — collects all *incoming* payments to a
  company's Bankgiro into one fixed-width 80-char file. Record type `20` =
  payment, carrying the payer OCR/reference (pos 13-37) and amount (pos 38-55,
  integer, last 2 digits = öre). Parsers should ignore unknown record types.
  → This is the file to parse if the goal is matching customer payments to invoices.
- **SIE** — the Swedish open standard for moving *accounting* data between
  programs (used even by Skatteverket/SCB). Relevant only if we later export to
  bookkeeping, not for raw bank rows.

### Libraries (no cost)
- **SheetJS (`@e965/xlsx`)** — already in our repo (`excelImport.js`). Reads
  CSV+XLSX. Our importer already fuzzy-matches Datum/Beskrivning/Belopp (sv/en/ru)
  and parses messy amounts. ~80% of what a Swedish bank CSV needs is already here.
- **`statement-normalizer`** (OSS) — parses CSV, OFX/QFX, MT940, camt.053/052,
  QIF into one normalized schema with a sign convention (debit −, credit +).
  Python — reference for logic, not a drop-in for our Node stack.
- **`bankstatementparser`** (OSS) — camt.053, PAIN.001, CSV, OFX, QFX, MT940 +
  PDF (digital & scanned). Also Python; good as a spec reference.
- **PDF statements** → only if a bank gives no CSV. Use our existing Claude-vision
  OCR (already wired for receipts) rather than a new dependency.

### The one missing piece = a column-mapping wizard
Every incumbent (Xero, QuickBooks, Fortnox file mode) solves per-bank variance the
same way: upload → preview first rows → user maps "this column = date / text /
amount (or in/out)" → import. That's the whole feature. Free, ours, ~1–2 days.

---

## Path 2 — Live bank connection (Open Banking / PSD2) — Phase 2, not now

### Reality check (this changed in 2025)
- **GoCardless Bank Account Data (ex-Nordigen)** — the famous free 2,300-bank API —
  is **closed to new signups and being wound down**. Cannot start a new project on
  it. (This kills the usual "just use free Nordigen" advice.)
- **Enable Banking** — best free entry now: self-serve, free **"Restricted
  Production"** tier (limited to accounts you link yourself), and you **build on
  *their* AISP licence** → no need to become a licensed AISP. Full production =
  contract + KYB. Covers Nordics incl. Sweden; EEA incl. Poland.
- Others (paid / sales-led): **Tink** (Visa), **Klarna Kosma**, **Neonomics**,
  **Salt Edge**, **TrueLayer**. Plaid/TrueLayer weaker on Nordic+Polish SME banks
  than the Nordic-native players.

### Licensing note
You generally do **not** need your own AISP licence — you operate under the
aggregator's licence. (One tempting shortcut — "register as a payment-service
*agent* and pay nothing" — did not hold up under verification; treat AISP-as-agent
economics as "use the provider's licence", confirm specifics with the provider.)

### Consent UX
PSD2 consent (e.g. via Mobilt BankID in SE) typically lasts ~180 days, then the
user must re-approve. So even "live" feeds need periodic re-consent — not fully
set-and-forget.

---

## Market benchmark (what the incumbents do)
- **Fortnox** (SE market leader): free PSD2 bank connection to all major Swedish
  banks (Handelsbanken, SEB, Swedbank, Nordea, Danske, Länsförsäkringar, Lunar…),
  BankID consent 180 days, streams balances+transactions, and reconciles incoming
  payments against invoices. Also supports ISO 20022 file mode. Free to users.
- **Xero / QuickBooks**: automatic bank *feeds* (no manual file) as the default;
  manual CSV/OFX import as fallback.
- **Bygglet** (our direct construction-SME competitor): **no bank import at all** —
  only syncs invoices to accounting systems (Spiris/Visma, Fortnox, Björn Lundén).
  → A working bank-file import in Projektkalkyl is already ahead of Bygglet.

## Enrichment / categorization (optional, later)
- **Ntropy** — LLM enrichment: clean counterparty names + categories from raw
  transaction text (also OCRs statement PDFs). No public pricing / no stated EU
  coverage — sales-led. Only worth it if we want auto-categorization at scale;
  otherwise our own Claude call or simple keyword rules suffice for a few categories.

---

## Phased plan for ByggExp
1. **Phase 1 (now, free, ~1–2 days):** extend `excelImport.js` into a bank import
   with a **column-mapping preview step**; handle `;`/Windows-1252 CSV; support
   in/out columns → signed amount; land rows into the chosen Income/Expense table
   of the current Projektkalkyl. Optional: a BgMax parser for incoming-payment
   files (structured, no mapping needed).
2. **Phase 2 (if users want no-file automation):** integrate **Enable Banking**
   free tier (their AISP licence), start read-only transactions for SE + PL, add
   180-day re-consent flow.
3. **Phase 3 (optional):** reconciliation (match bank rows ↔ our invoices/expenses
   by OCR/amount/date) and/or Ntropy-style auto-categorization.

## Sources
- OSS parsers: github.com/maxed-oss/statement-normalizer, github.com/MegaJoctan/bankstatementparser
- BgMax spec: bankgirot.se … bankgiroreceivables_…_technicalmanual_en.pdf
- SIE: en.wikipedia.org/wiki/SIE_(file_format)
- Open Banking landscape + Nordigen shutdown: openbankingtracker.com/open-banking-apis-europe, /guides/free-open-banking-apis, dev.to/johnfrandsen (Nordigen free-tier shutdown)
- Enable Banking free tier + licence: enablebanking.com blog; openbankingtracker
- GoCardless/Nordigen AISP: gocardless.com/blog/gocardless-acquire-open-banking-platform-nordigen
- Fortnox bank connection: fortnox.se/kopplingar/bank; support.fortnox.se … snabbare-koppling-till-din-bank
- Bygglet accounting-only: bygglet.com/funktion/tillval-koppling-till-bokforing
- Enrichment: docs.ntropy.com/enrichment/introduction
