@echo off
echo ========================================================
echo        LoanLens - Agentic Digital Lending Compliance
echo ========================================================
echo Starting local LoanLens server...
start http://localhost:8080
python server.py
pause
