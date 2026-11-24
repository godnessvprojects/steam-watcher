================================================================================
          STEAM WATCHER - CONFIGURACIÓN DEL BOT DE DISCORD 24/7 GRATIS
================================================================================
Desarrollador: GodNess (ESP) | Contacto Discord: @zzgodness
================================================================================

Este bot publicará de forma 100% automática y gratuita:
  1. Juegos y DLCs 100% GRATIS por tiempo limitado en Steam (Free-to-keep).
  2. Grandes ofertas destacadas del día en Steam (descuentos >= 70%).

Sigue estos 4 sencillos pasos para dejarlo funcionando en 5 minutos:

--------------------------------------------------------------------------------
PASO 1: CREAR EL WEBHOOK EN TU SERVIDOR DE DISCORD
--------------------------------------------------------------------------------
1. Abre tu Discord y entra a tu servidor.
2. Ve a los ajustes del canal donde quieras que salgan las ofertas 
   (por ejemplo el canal "#ofertas-steam" o "#juegos-gratis").
3. Haz clic en "Editar canal" (el icono de engranaje) ➔ "Integraciones".
4. Pulsa en "Webhooks" ➔ "Nuevo Webhook".
5. Ponle de nombre "Steam Watcher" (puedes ponerle el icono de la app si quieres).
6. Haz clic en "Copiar URL de Webhook".
   (Guárdate ese enlace, lo usarás en el Paso 3).

--------------------------------------------------------------------------------
PASO 2: CREAR UN REPOSITORIO GRATIS EN GITHUB
--------------------------------------------------------------------------------
1. Entra a tu cuenta en https://github.com/ (si no tienes, crea una gratis).
2. Haz clic en el botón verde "New" (o "Nuevo repositorio").
3. Nombre del repositorio: ej. "steam-watcher-bot"
4. Selecciona "Private" (Privado) para que solo tú tengas acceso.
5. Haz clic en "Create repository".
6. Sube los archivos de esta carpeta "discord-bot":
   - steam_bot.js
   - package.json
   - posted_deals.json
   - La carpeta ".github/workflows/steam_deals.yml"
   (Puedes arrastrarlos directamente a la página de GitHub donde dice 
    "uploading an existing file").

--------------------------------------------------------------------------------
PASO 3: GUARDAR TU WEBHOOK EN SECRETS (100% PROTEGIDO)
--------------------------------------------------------------------------------
1. En tu repositorio de GitHub, haz clic en la pestaña "Settings" (Ajustes).
2. En el menú de la izquierda, baja hasta "Secrets and variables" ➔ "Actions".
3. Haz clic en el botón verde "New repository secret".
4. En "Name" escribe exactamente:
   DISCORD_WEBHOOK_URL
5. En "Secret" pega la URL del Webhook de Discord que copiaste en el Paso 1.
6. Haz clic en "Add secret".
   (Nadie en internet podrá ver jamás tu webhook, queda cifrado en GitHub).

--------------------------------------------------------------------------------
PASO 4: DAR PERMISO DE ESCRITURA Y PROBARLO
--------------------------------------------------------------------------------
1. En GitHub, en "Settings" ➔ "Actions" ➔ "General":
   Baja hasta la sección "Workflow permissions" y selecciona:
   "Read and write permissions" (para que pueda guardar el historial de ofertas).
   Pulsa "Save".

2. ¡Listo! Para probarlo de inmediato:
   - Ve a la pestaña "Actions" arriba en tu repositorio.
   - En la izquierda haz clic en "Steam Watcher Discord Bot".
   - Pulsa en "Run workflow" ➔ botón verde "Run workflow".
   - Verás que en unos segundos se pone en verde y ¡aparecerán las primeras 
     ofertas directamente en tu canal de Discord!

A partir de ahí, el bot se ejecutará automáticamente cada hora, las 24 horas 
del día, los 365 días del año sin necesidad de que tengas tu ordenador encendido.
================================================================================
