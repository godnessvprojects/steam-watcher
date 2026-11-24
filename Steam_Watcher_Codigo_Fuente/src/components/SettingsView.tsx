import React, { useState, useEffect } from 'react';
import {
  Clock,
  Globe,
  Palette,
  Bell,
  HardDrive,
  Download,
  Upload,
  Check,
  Save,
  Send,
  RotateCw,
  Monitor,
  Bookmark,
  Loader2,
} from 'lucide-react';
import { Settings } from '../types/game';
import { api } from '../services/api';

interface SettingsViewProps {
  onThemeChange: (theme: 'system' | 'light' | 'dark') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onThemeChange }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [testNotifSent, setTestNotifSent] = useState(false);
  const [steamIdInput, setSteamIdInput] = useState('');
  const [isSavingSteamId, setIsSavingSteamId] = useState(false);
  const [isSyncingWishlist, setIsSyncingWishlist] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);
  const [updateHasNew, setUpdateHasNew] = useState(false);
  const [updateDownloadUrl, setUpdateDownloadUrl] = useState<string | null>(null);
  const [updateNewVersion, setUpdateNewVersion] = useState<string | null>(null);

  const handleManualCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMessage(null);
    try {
      const info = await api.checkAppUpdate();
      if (info.has_update) {
        setUpdateHasNew(true);
        setUpdateNewVersion(info.latest_version);
        setUpdateDownloadUrl(info.download_url || info.html_url || null);
        setUpdateStatusMessage(`¡Nueva versión v${info.latest_version} disponible! Tus datos se conservarán.`);
      } else {
        setUpdateHasNew(false);
        setUpdateDownloadUrl(null);
        setUpdateStatusMessage(`Ya tienes la versión más reciente (v${info.current_version}).`);
        setTimeout(() => setUpdateStatusMessage(null), 4000);
      }
    } catch {
      setUpdateHasNew(false);
      setUpdateStatusMessage('No se pudo conectar con el servidor de actualizaciones.');
      setTimeout(() => setUpdateStatusMessage(null), 4000);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    try {
      await api.sendTestNotification();
      setTestNotifSent(true);
      setTimeout(() => setTestNotifSent(false), 3000);
    } catch (err) {
      console.error('Error al enviar notificación de prueba:', err);
    } finally {
      setIsTestingNotif(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const s = await api.getSettings();
        setSettings(s);
        if (s.steam_id) {
          setSteamIdInput(s.steam_id);
        }
      } catch (err) {
        console.error('Error al cargar configuración:', err);
      }
    };
    load();
  }, []);

  const handleSaveSteamId = async () => {
    if (!settings) return;
    setIsSavingSteamId(true);
    setSyncError(null);
    try {
      const cleanInput = steamIdInput.trim();
      const updated: Settings = { ...settings, steam_id: cleanInput ? cleanInput : null };
      await api.saveSettings(updated);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Error al guardar Steam ID:', err);
    } finally {
      setIsSavingSteamId(false);
    }
  };

  const handleSyncWishlist = async () => {
    setIsSyncingWishlist(true);
    setSyncStatus(null);
    setSyncError(null);
    try {
      const summary = await api.syncWishlist();
      setSyncStatus(
        `Sincronización completada: ${summary.imported_count} juegos nuevos añadidos, ${summary.already_in_library} ya estaban en tu biblioteca (${summary.total_found} en tu lista de deseados).`
      );
      setTimeout(() => setSyncStatus(null), 6000);
    } catch (err: unknown) {
      setSyncError(
        typeof err === 'string'
          ? err
          : 'Error al sincronizar la lista de deseados. Asegúrate de configurar tu perfil de Steam en Público.'
      );
      setTimeout(() => setSyncError(null), 6000);
    } finally {
      setIsSyncingWishlist(false);
    }
  };

  const handleSave = async (updated: Settings) => {
    setSettings(updated);
    setSaving(true);
    try {
      await api.saveSettings(updated);
      onThemeChange(updated.theme);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Error al guardar ajustes:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const json = await api.exportLibrary();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `steam-watcher-library-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando biblioteca:', err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const summary = await api.importLibrary(text);
      setImportStatus(
        `Importación completada: ${summary.imported_games} añadidos, ${summary.skipped_duplicates} duplicados omitidos.`
      );
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err) {
      setImportStatus('Error al importar el archivo JSON.');
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  if (!settings) return null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* 1. Frequency */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--accent-primary)" />
            <span>Frecuencia de Monitorización</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Intervalo de comprobación</span>
            <span className="settings-desc">
              Frecuencia con la que Steam Watcher verifica precios en la tienda
            </span>
          </div>
          <select
            value={settings.check_interval_minutes}
            onChange={(e) =>
              handleSave({ ...settings, check_interval_minutes: Number(e.target.value) })
            }
          >
            <option value={30}>Cada 30 minutos</option>
            <option value={60}>Cada hora (Recomendado)</option>
            <option value={180}>Cada 3 horas</option>
            <option value={360}>Cada 6 horas</option>
            <option value={720}>Cada 12 horas</option>
            <option value={1440}>Una vez al día</option>
          </select>
        </div>
      </div>

      {/* 2. Region & Currency */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} color="var(--accent-primary)" />
            <span>Región y Moneda de Steam</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Moneda</span>
            <span className="settings-desc">Unidad monetaria para precios y ofertas</span>
          </div>
          <select
            value={settings.currency}
            onChange={(e) => handleSave({ ...settings, currency: e.target.value })}
          >
            <option value="EUR">Euros (€ - EUR)</option>
            <option value="USD">Dólares ($ - USD)</option>
            <option value="GBP">Libras (£ - GBP)</option>
            <option value="MXN">Pesos Mexicanos ($ - MXN)</option>
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Región de tienda Steam</span>
            <span className="settings-desc">Código de país oficial utilizado para las peticiones</span>
          </div>
          <select
            value={settings.country_code}
            onChange={(e) => handleSave({ ...settings, country_code: e.target.value })}
          >
            <option value="es">España (es)</option>
            <option value="us">Estados Unidos (us)</option>
            <option value="gb">Reino Unido (gb)</option>
            <option value="mx">México (mx)</option>
          </select>
        </div>
      </div>

      {/* Sincronización de Lista de Deseados (Wishlist) de Steam */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bookmark size={16} color="var(--accent-primary)" />
            <span>Lista de Deseados (Wishlist) de Steam</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">ID o Perfil de Steam vinculado</span>
            <span className="settings-desc">
              SteamID64 (ej: 76561198...), vanity URL personalizada o enlace a tu perfil
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Ej: 76561198000000000 o mi_usuario"
              value={steamIdInput}
              onChange={(e) => setSteamIdInput(e.target.value)}
              style={{
                width: '240px',
                padding: '6px 12px',
                fontSize: '12.5px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              className="btn-secondary"
              onClick={handleSaveSteamId}
              disabled={isSavingSteamId}
              style={{ padding: '6px 12px', fontSize: '12.5px' }}
            >
              <Save size={13} />
              Guardar
            </button>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Sincronización automática periódica</span>
            <span className="settings-desc">
              Añadir automáticamente a tu biblioteca los nuevos videojuegos que agregues a tu lista de deseados de Steam
            </span>
          </div>
          <label className="apple-toggle">
            <input
              type="checkbox"
              checked={settings.auto_sync_wishlist}
              onChange={(e) =>
                handleSave({ ...settings, auto_sync_wishlist: e.target.checked })
              }
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Sincronizar ahora manualmente</span>
            <span className="settings-desc">
              Comprueba al instante tu lista de deseados e importa los nuevos títulos
            </span>
          </div>
          <button
            className="btn-secondary"
            onClick={handleSyncWishlist}
            disabled={isSyncingWishlist || !steamIdInput.trim()}
            style={{ padding: '6px 14px', fontSize: '12.5px' }}
          >
            {isSyncingWishlist ? (
              <>
                <Loader2 size={13} className="spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RotateCw size={13} />
                Sincronizar ahora
              </>
            )}
          </button>
        </div>

        {syncStatus && (
          <div
            style={{
              padding: '10px 16px',
              fontSize: '12.5px',
              color: 'var(--success-color)',
              background: 'rgba(52, 199, 89, 0.08)',
              border: '1px solid rgba(52, 199, 89, 0.2)',
              borderRadius: 'var(--radius-md)',
              margin: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={14} color="var(--success-color)" />
            <span>{syncStatus}</span>
          </div>
        )}

        {syncError && (
          <div
            style={{
              padding: '10px 16px',
              fontSize: '12.5px',
              color: 'var(--danger-color)',
              background: 'rgba(255, 69, 58, 0.08)',
              border: '1px solid rgba(255, 69, 58, 0.2)',
              borderRadius: 'var(--radius-md)',
              margin: '12px 16px',
            }}
          >
            {syncError}
          </div>
        )}
      </div>

      {/* 3. Appearance */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={16} color="var(--accent-primary)" />
            <span>Apariencia e Interfaz</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Tema visual</span>
            <span className="settings-desc">Estilo gráfico inspirado en macOS de Apple</span>
          </div>
          <div className="segmented-control">
            <button
              className={`segment-btn ${settings.theme === 'light' ? 'active' : ''}`}
              onClick={() => handleSave({ ...settings, theme: 'light' })}
            >
              Claro
            </button>
            <button
              className={`segment-btn ${settings.theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleSave({ ...settings, theme: 'dark' })}
            >
              Oscuro
            </button>
            <button
              className={`segment-btn ${settings.theme === 'system' ? 'active' : ''}`}
              onClick={() => handleSave({ ...settings, theme: 'system' })}
            >
              Automático
            </button>
          </div>
        </div>
      </div>

      {/* 4. Notifications */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} color="var(--accent-primary)" />
            <span>Filtros de Notificaciones de Windows</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Descuento mínimo para avisar</span>
            <span className="settings-desc">Filtrar ofertas por umbral porcentual</span>
          </div>
          <select
            value={settings.notify_min_discount}
            onChange={(e) =>
              handleSave({ ...settings, notify_min_discount: Number(e.target.value) })
            }
          >
            <option value={0}>Cualquier descuento (desde 1%)</option>
            <option value={20}>Únicamente a partir del 20%</option>
            <option value={50}>Únicamente a partir del 50%</option>
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Avisar al alcanzar precio objetivo</span>
            <span className="settings-desc">
              Notificar cuando el juego iguale o mejore el precio fijado manualmente
            </span>
          </div>
          <label className="apple-toggle">
            <input
              type="checkbox"
              checked={settings.notify_target_price}
              onChange={(e) =>
                handleSave({ ...settings, notify_target_price: e.target.checked })
              }
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Avisar por nuevo mínimo histórico</span>
            <span className="settings-desc">
              Notificar cuando el juego alcance su precio más bajo registrado por la aplicación
            </span>
          </div>
          <label className="apple-toggle">
            <input
              type="checkbox"
              checked={settings.notify_historical_low}
              onChange={(e) =>
                handleSave({ ...settings, notify_historical_low: e.target.checked })
              }
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Avisar sobre juegos y promociones 100% gratis</span>
            <span className="settings-desc">
              Notificar con prioridad cuando un juego de Steam esté temporalmente gratis (100% de descuento)
            </span>
          </div>
          <label className="apple-toggle">
            <input
              type="checkbox"
              checked={settings.notify_giveaways}
              onChange={(e) =>
                handleSave({ ...settings, notify_giveaways: e.target.checked })
              }
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Prueba de notificaciones de Windows</span>
            <span className="settings-desc">
              Envía una alerta de prueba en vivo para verificar que las notificaciones nativas funcionan
            </span>
          </div>
          <button
            className="btn-secondary"
            onClick={handleTestNotification}
            disabled={isTestingNotif}
          >
            {testNotifSent ? (
              <>
                <Check size={14} color="var(--success-color)" />
                ¡Notificación enviada!
              </>
            ) : (
              <>
                <Send size={14} />
                Enviar notificación de prueba
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. Comportamiento en Windows */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Monitor size={16} color="var(--accent-primary)" />
            <span>Comportamiento en Windows</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Iniciar automáticamente con Windows</span>
            <span className="settings-desc">
              Arranca en segundo plano para monitorizar ofertas desde el encendido del PC
            </span>
          </div>
          <label className="apple-toggle">
            <input
              type="checkbox"
              checked={settings.autostart}
              onChange={async (e) => {
                const nextVal = e.target.checked;
                await api.setAutostart(nextVal);
                handleSave({ ...settings, autostart: nextVal });
              }}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Minimizar a la bandeja del sistema</span>
            <span className="settings-desc">
              Al cerrar la ventana (X), permanece activo junto al reloj de Windows
            </span>
          </div>
          <label className="apple-toggle">
            <input
              type="checkbox"
              checked={settings.minimize_to_tray}
              onChange={(e) =>
                handleSave({ ...settings, minimize_to_tray: e.target.checked })
              }
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* 6. Actualizaciones del Sistema */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCw size={16} color="var(--accent-primary)" />
            <span>Actualizaciones del Sistema</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Actualizaciones automáticas</span>
            <span className="settings-desc">
              Comprobar y notificar automáticamente cuando existan nuevas versiones disponibles de Steam Watcher
            </span>
          </div>
          <label className="apple-toggle">
            <input
              type="checkbox"
              checked={settings.auto_update}
              onChange={(e) =>
                handleSave({ ...settings, auto_update: e.target.checked })
              }
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Comprobar actualizaciones ahora</span>
            <span className="settings-desc">
              Versión actual instalada: v1.0.0 (tus datos se conservan al actualizar)
            </span>
          </div>
          <button
            className="btn-secondary"
            onClick={handleManualCheckUpdate}
            disabled={isCheckingUpdate}
            style={{ padding: '6px 14px', fontSize: '12.5px' }}
          >
            {isCheckingUpdate ? (
              <>
                <Loader2 size={13} className="spin" />
                Comprobando...
              </>
            ) : (
              <>
                <RotateCw size={13} />
                Buscar actualización
              </>
            )}
          </button>
        </div>

        {updateStatusMessage && (
          <div
            style={{
              padding: '10px 16px',
              fontSize: '12.5px',
              color: updateHasNew ? 'var(--success-color)' : 'var(--text-secondary)',
              background: updateHasNew ? 'rgba(52, 199, 89, 0.08)' : 'var(--bg-surface-secondary)',
              border: `1px solid ${updateHasNew ? 'rgba(52, 199, 89, 0.25)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              margin: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={14} color={updateHasNew ? 'var(--success-color)' : 'var(--accent-primary)'} />
              <span>{updateStatusMessage}</span>
            </div>
            {updateDownloadUrl && (
              <button
                className="btn-primary"
                onClick={() => api.openSteamUrl(updateDownloadUrl)}
                style={{ padding: '5px 12px', fontSize: '12px', background: 'var(--success-color)' }}
              >
                Descargar v{updateNewVersion}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 6. Data & Backup */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={16} color="var(--accent-primary)" />
            <span>Datos y Biblioteca</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Exportar biblioteca de juegos</span>
            <span className="settings-desc">
              Descarga un archivo JSON de respaldo con todos tus juegos y configuraciones
            </span>
          </div>
          <button className="btn-secondary" onClick={handleExport}>
            <Download size={14} />
            Exportar JSON
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-label-group">
            <span className="settings-title">Importar biblioteca</span>
            <span className="settings-desc">
              Restaura o combina juegos desde un archivo JSON previo
            </span>
          </div>
          <label className="btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={14} />
            Importar JSON
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </label>
        </div>

        {importStatus && (
          <div style={{ padding: '12px 20px', fontSize: '12.5px', color: 'var(--accent-primary)' }}>
            {importStatus}
          </div>
        )}
      </div>

      {savedSuccess && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--text-primary)',
            color: 'var(--bg-surface)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-dropdown)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <Check size={16} color="var(--success-color)" />
          Ajustes guardados correctamente
        </div>
      )}
    </div>
  );
};
