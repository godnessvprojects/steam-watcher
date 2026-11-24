# Steam Watcher 🎮

> **Aplicación de escritorio premium para monitorizar videojuegos y ofertas en Steam.**  
> Diseñada con la elegancia, precisión tipográfica y sobriedad de las aplicaciones nativas de Apple (macOS HIG), optimizada para Windows 10 y 11.

---

## 🌟 Visión del Producto

**Steam Watcher** es un monitor de precios nativo de alto rendimiento que permite al usuario seguir videojuegos de Steam mediante su URL oficial o AppID, detectar automáticamente descuentos, bajadas de precio, nuevos mínimos históricos y ofertas en expansiones (DLC), notificando de forma nativa en Windows en tiempo real sin requerir inicio de sesión en Steam.

---

## 🏗️ Arquitectura Técnica

```
steam-watcher/
├── src/                          # Frontend React 18 + TypeScript + Vite
│   ├── components/               # Componentes con diseño editorial Apple
│   │   ├── Sidebar.tsx           # Navegación lateral con estado del monitor y badges
│   │   ├── Header.tsx            # Cabecera con selector de vista (grid/tabla) y filtros
│   │   ├── LibraryView.tsx       # Vista principal (cuadrícula amplia / lista compacta)
│   │   ├── DealsView.tsx         # Vista de ofertas activas con métricas de ahorro
│   │   ├── DlcDealsView.tsx      # Monitor independiente de DLCs y expansiones rebajadas
│   │   ├── PriceHistoryView.tsx  # Gráfica minimalista de evolución de precio
│   │   ├── GameDetailModal.tsx   # Ficha técnica, precio objetivo y contexto de oferta
│   │   ├── AddGameModal.tsx      # Modal para pegar URL o AppID con validación
│   │   └── SettingsView.tsx      # Ajustes de frecuencia, región, moneda y backup
│   ├── services/
│   │   └── api.ts                # Clientes tipados de invocación Tauri v2
│   ├── styles/                   # Sistema de diseño Apple macOS
│   │   ├── variables.css         # Tokens de color, modo claro/oscuro y transiciones
│   │   ├── global.css            # Tipografía, scrollbars finos y badges
│   │   ├── layout.css            # Arquitectura de 3 áreas principales
│   │   └── components.css        # Tarjetas, modales, tablas y controles segmentados
│   ├── types/
│   │   └── game.ts               # Modelos TypeScript del dominio
│   ├── App.tsx                   # Coordinador central de estado y tema
│   └── main.tsx
├── src-tauri/                    # Backend Nativo en Rust (Tauri v2)
│   ├── src/
│   │   ├── models.rs             # Estructuras de datos (Game, DLC, History, Settings)
│   │   ├── db.rs                 # Capa de persistencia SQLite (rusqlite) con migraciones
│   │   ├── steam_service.rs      # Cliente Steam Store API y News API con rate limiting
│   │   ├── monitor.rs            # Scheduler de comprobación y motor de notificaciones
│   │   ├── commands.rs           # Comandos invocables desde el frontend
│   │   ├── lib.rs                # Inicialización de plugins y ciclo de vida de la app
│   │   └── main.rs
│   ├── capabilities/             # Permisos de Tauri v2
│   ├── Cargo.toml
│   └── tauri.conf.json           # Configuración de ventana nativa y empaquetador
```

---

## 🔍 Análisis de Fuentes de Steam y Límites Técnicos

1. **Steam Store API (`store.steampowered.com/api/appdetails`)**:
   - **Datos obtenidos**: Nombre oficial, cápsula de alta resolución (`header_image`), descripción, precio inicial, precio final rebajado, porcentaje de descuento, moneda y lista de AppIDs de DLCs.
   - **Límites y Gestión**: Steam limita peticiones a ~200 consultas cada 5 minutos. El monitor implementa peticiones secuenciales con retardos de 150-300 ms entre consultas para evitar bloqueos por IP (HTTP 429).
   
2. **Steam News API (`api.steampowered.com/ISteamNews/GetNewsForApp`)**:
   - **Detección de motivos de oferta**: Analiza anuncios oficiales del editor y notas de parches para identificar eventos confirmados (Rebajas de Otoño/Invierno/Verano, Ofertas de Fin de Semana, Aniversarios, Actualizaciones Mayores).
   - **Transparencia y honestidad**: Si no existe anuncio explícito pero coincide con la ventana estacional de Steam, se clasifica como *"Inferencia de Calendario Estacional"*. De lo contrario, se indica expresamente *"Motivo de la oferta no identificado"* sin inventar datos.

3. **Historial de Precios**:
   - La API pública en vivo de Steam no incluye un log histórico de precios pasados.
   - *Steam Watcher* registra de forma persistente cada cambio en SQLite, mostrando un gráfico de pasos (*step line*) y destacando con transparencia: *"Mínimo registrado por Steam Watcher: X € (desde su incorporación local)"*.

---

## 💾 Modelo de Base de Datos SQLite

La base de datos local se crea y migra automáticamente en la carpeta de datos de usuario de Windows (`%LOCALAPPDATA%\com.steamwatcher.desktop\steam_watcher.db`):

- **`games`**: AppID, título, URL, carátula, precios, descuento, fecha de alta, precio objetivo y mínimo registrado.
- **`price_history`**: Registro cronológico de cambios de precio y porcentaje de descuento.
- **`dlcs`**: Expansiones asociadas a cada juego, precio actual y estado de oferta.
- **`notifications`**: Historial de alertas enviadas a Windows para prevenir duplicados.
- **`deal_reasons`**: Contexto identificado del motivo del descuento, fuente y nivel de certeza.
- **`settings`**: Frecuencia de comprobación, moneda, región, tema visual y umbrales de alerta.

---

## 🚀 Ejecución y Distribución

### 1. Probar en desarrollo:
```powershell
cd C:\Users\mrsfm\.gemini\antigravity\scratch\steam-watcher
npm run dev
# o con Tauri en vivo:
npx tauri dev
```

### 2. Ejecutable compilado para Windows:
- **Binario directo optimizado**:
  `src-tauri\target\release\steam-watcher.exe` (15,4 MB, ejecución sin dependencias externas)
- **Instalador oficial de Windows (.exe NSIS)**:
  `src-tauri\target\release\bundle\nsis\Steam Watcher_1.0.0_x64-setup.exe` (3,91 MB, listo para distribución comercial limpia)
