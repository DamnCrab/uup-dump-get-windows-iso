@echo off 
echo Starting UUP script simulation... 
timeout /t 5 /nobreak >nul 
echo Creating dummy ISO file... 
echo This is a test ISO file > "F:\CODE\uup-dump-get-windows-iso\test-monitor-output\test-windows.iso" 
timeout /t 3 /nobreak >nul 
echo UUP script completed successfully! 
