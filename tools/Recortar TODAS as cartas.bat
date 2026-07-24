@echo off
chcp 65001 >nul
title Recortar TODAS as cartas
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0recortar-cartas.ps1" -Todas
pause