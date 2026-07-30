# Payroll — preliminärskatt via Skatteverkets skattetabell

Payroll can compute each worker's preliminary tax from Skatteverket's official
**skattetabell** instead of a flat percentage.

## How it works
- Each employee has a **Skattetabell** (tabellnr, e.g. 31) and **Kolumn** (1–6),
  set in the user form (Ekonomi/Profil).
- When a payroll run is created, for each line the backend looks up the monthly
  tax for `(tabellnr, kolumn, bruttolön)` from Skatteverket's open *rowstore*
  dataset.
- If the table/column is not set, the dataset is not configured, or the lookup
  fails for any reason → payroll **falls back to the flat percentage** (`taxRate`,
  default 30 %). So behaviour is safe and unchanged until this is configured.
- Arbetsgivaravgift stays at **31,42 %** (standard rate).

## Configuration (backend env)
Set these on the backend so tax comes from the correct, current-year dataset:

```
SKV_TAX_ROWSTORE_URL   = <Skatteverket rowstore dataset URL for monthly tax tables>
SKV_TAX_FIELD_TABLE    = tabellnr            # field name for the table number
SKV_TAX_FIELD_FROM     = inkomst fr.o.m.     # income-bracket lower bound field
SKV_TAX_FIELD_TO       = inkomst t.o.m.      # income-bracket upper bound field
SKV_TAX_COLUMN_PREFIX  = "kolumn "           # column fields become "kolumn 1".."kolumn 6"
```

The field names above are defaults and **must be verified** against the actual
dataset you point to (open the dataset, check the real column names, adjust the
env vars to match). The dataset changes each year — update `SKV_TAX_ROWSTORE_URL`
accordingly.

## ⚠️ Verify before running real payroll
Preliminary tax is legally sensitive. The mechanism here uses official Skatteverket
data when configured, but **confirm the numbers against a real löneprogram or with
your accountant** before paying salaries. Until `SKV_TAX_ROWSTORE_URL` is set and
verified, payroll uses the flat percentage.
