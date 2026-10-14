@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d C:\relay\frontend
"C:\Program Files\nodejs\npm.cmd" run dev > C:\relay\frontend-dev.log 2>&1
