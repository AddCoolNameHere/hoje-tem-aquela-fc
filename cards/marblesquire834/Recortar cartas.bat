@echo off
chcp 65001 >nul
title Recortar cartas
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\tools\recortar-cartas.ps1" -Pasta "%~dp0."
pause