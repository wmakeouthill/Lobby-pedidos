@echo off
cd /d "%~dp0"
javaw -jar "%~dp0backend\target\lobby-pedidos-1.0.0.jar" %*

