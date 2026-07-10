@echo off  
powershell -Command "$content = Get-Content -Path '%~f0' -Raw -Encoding UTF8 | Select-Object -Skip 1; Set-Content -Path 'database\schema.sql' -Value $content -Encoding UTF8; Write-Host 'schema.sql written'" 
