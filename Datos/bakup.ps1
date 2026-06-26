$env:PGPASSWORD = "2026.........."

$fecha = Get-Date -Format "yyyyMMdd_HHmmss"

& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" `
  --host=aws-1-us-east-2.pooler.supabase.com `
  --port=5432 `
  --username=postgres.twdruhhhnsbrpyzlfxmg `
  --dbname=postgres `
  --no-owner `
  --no-privileges `
  -f "backup_$fecha.sql"
  
  
