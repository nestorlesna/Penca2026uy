$env:PGPASSWORD = "2026........."

$fecha = Get-Date -Format "yyyyMMdd_HHmmss"

& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" `
  --host=aws-1-us-east-2.pooler.supabase.com `
  --port=5432 `
  --username=postgres.twdruhhhnsbrpyzlfxmg `
  --dbname=postgres `
  --data-only --no-owner --no-privileges -t auth.users -t auth.identities -f "auth_v1_$fecha.sql"
  

& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" `
  --host=aws-1-us-east-2.pooler.supabase.com `
  --port=5432 `
  --username=postgres.twdruhhhnsbrpyzlfxmg `
  --dbname=postgres `
  --no-owner --no-privileges --schema=public -f "public_v1_$fecha.sql"