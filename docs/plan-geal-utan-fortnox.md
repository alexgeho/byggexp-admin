# Geal Entreprenad AB utan Fortnox — lön, AGI och bokföring i ByggExp

Beslut 2026-10-27: Geal säger upp Fortnox. Lön, arbetsgivardeklaration (AGI) och bokföring körs i ByggExp.
Ansvaret för bokföringen ligger kvar hos Geals styrelse (bokföringslagen); ByggExp gör jobbet, en redovisningskonsult/revisor granskar bokslutet.

## 0. Innan Fortnox stängs (måste göras först)
- [ ] Exportera från Fortnox (Geal Entreprenad AB): SIE4 alla räkenskapsår + verifikationsunderlag (PDF) + kund-/leverantörsregister + lönespecar. Spara i arkiv (7 år, BFL 7 kap).
- [ ] Ingående balanser per 2027-01-01 (eller bytesdatum) från Fortnox balansrapport → importeras i ByggExp.
- [ ] Byt datum: helst vid årsskifte eller månadsskifte efter sista lön i Fortnox.

## 1. Lön (fas 1)
- Lönekörning per månad från Ekonomi → Löner (attesterade dagar): timlön, övertid, OB, frånvaro, traktamente och km (skattefria upp till Skatteverkets belopp).
- Skatt per anställd via skattetabell (tabell + kolumn på personen; SKV-dataset ska vara konfigurerat på prod — kontrollera).
- Arbetsgivaravgift 31,42 % (nedsatt för födda före/efter gränsår enligt gällande regler).
- Lönespecifikation PDF per anställd (finns), utbetalningsfil till banken (fas 2).

## 2. AGI (fas 1)
- XML-fil per redovisningsperiod enligt Skatteverkets tekniska beskrivning → laddas upp i Skatteverkets e-tjänst med BankID. Senast den 12:e månaden efter (17:e i jan/aug för mindre arbetsgivare — kontrollera).
- Betalning: skatt + arbetsgivaravgifter till skattekontot, bankgiro 5050-1055 med Geals OCR. Belopp och OCR visas i ByggExp.
- Kräver: personnummer på alla anställda, orgnr på företaget.

## 3. Bank (fas 2)
- Löneutbetalning: betalfil (pain.001/ISO 20022) eller lista för manuell betalning.
- Bankimport finns: matcha kundinbetalningar, leverantörsbetalningar, lön, skattekonto.

## 4. Bokföring (fas 3)
- Verifikationer automatiskt: kundfakturor (finns), leverantörsfakturor (finns), lön (P-serie), betalningar, skattekonto.
- Rapporter: huvudbok, resultat- och balansräkning per period.
- Momsdeklaration: underlag per period (ruta 05/10/24/30/48/49…), lämnas i Skatteverkets e-tjänst.
- Årsbokslut K2 + årsredovisning: underlag från ByggExp, granskas/skrivs under med revisor/konsult, lämnas till Bolagsverket.

## Behöver från ägaren
- Bytesdatum (när sista lönen går via Fortnox).
- Momsperiod (månad/kvartal/år) och bank för Geal.
- Att personnummer + skattetabell/kolumn är ifyllda på Geals anställda.
