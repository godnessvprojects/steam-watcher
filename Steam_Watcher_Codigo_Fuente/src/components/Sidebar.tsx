import React from 'react';
import {
  Library,
  Tag,
  Package,
  TrendingDown,
  Settings as SettingsIcon,
  RotateCw,
  Eye,
  Heart,
  Gift,
} from 'lucide-react';
import { api } from '../services/api';

export type ActiveTab = 'library' | 'deals' | 'dlc-deals' | 'giveaways' | 'history' | 'settings' | 'credits';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  gameCount: number;
  dealCount: number;
  dlcDealCount: number;
  giveawaysCount?: number;
  isChecking: boolean;
  onRefreshAll: () => void;
  lastCheckTime?: string | null;
  secondsRemaining: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  gameCount,
  dealCount,
  dlcDealCount,
  giveawaysCount,
  isChecking,
  onRefreshAll,
  lastCheckTime,
  secondsRemaining,
}) => {
  const formatTime = (iso?: string | null) => {
    if (!iso) return 'Pendiente';
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Reciente';
    }
  };

  const formatCountdown = (secs: number) => {
    if (secs < 0) return '00:00';
    if (secs >= 3600) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Eye size={17} strokeWidth={2.2} />
        </div>
        <div className="brand-title">Steam Watcher</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div
          className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => onTabChange('library')}
        >
          <div className="nav-label">
            <Library size={16} strokeWidth={1.8} />
            <span>Biblioteca</span>
          </div>
          <span className="nav-badge">{gameCount}</span>
        </div>

        <div
          className={`nav-item ${activeTab === 'deals' ? 'active' : ''}`}
          onClick={() => onTabChange('deals')}
        >
          <div className="nav-label">
            <Tag size={16} strokeWidth={1.8} />
            <span>Ofertas activas</span>
          </div>
          {dealCount > 0 && (
            <span className="nav-badge active-deal">{dealCount}</span>
          )}
        </div>

        <div
          className={`nav-item ${activeTab === 'dlc-deals' ? 'active' : ''}`}
          onClick={() => onTabChange('dlc-deals')}
        >
          <div className="nav-label">
            <Package size={16} strokeWidth={1.8} />
            <span>DLC en oferta</span>
          </div>
          {dlcDealCount > 0 && (
            <span className="nav-badge active-deal">{dlcDealCount}</span>
          )}
        </div>

        <div
          className={`nav-item ${activeTab === 'giveaways' ? 'active' : ''}`}
          onClick={() => onTabChange('giveaways')}
        >
          <div className="nav-label">
            <Gift size={16} strokeWidth={1.8} />
            <span>Juegos gratis</span>
          </div>
          {giveawaysCount !== undefined && giveawaysCount > 0 && (
            <span
              className="nav-badge active-deal"
              style={{
                background: 'var(--success-color)',
                color: '#ffffff',
                fontWeight: 700,
              }}
            >
              {giveawaysCount}
            </span>
          )}
        </div>

        <div
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => onTabChange('history')}
        >
          <div className="nav-label">
            <TrendingDown size={16} strokeWidth={1.8} />
            <span>Historial precios</span>
          </div>
        </div>

        <div
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
        >
          <div className="nav-label">
            <SettingsIcon size={16} strokeWidth={1.8} />
            <span>Ajustes</span>
          </div>
        </div>

        <div
          className={`nav-item ${activeTab === 'credits' ? 'active' : ''}`}
          onClick={() => onTabChange('credits')}
        >
          <div className="nav-label">
            <Heart size={16} strokeWidth={1.8} />
            <span>Créditos / Contact me</span>
          </div>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="sidebar-footer">
        <div className="monitor-status-box">
          <div className="monitor-status-left" style={{ minWidth: 0, flex: 1, gap: '8px' }}>
            <span className="pulse-indicator" style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', textAlign: 'left' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11px', letterSpacing: '-0.01em' }}>
                {isChecking ? 'Comprobando...' : `Próxima: ${formatCountdown(secondsRemaining)}`}
              </span>
              <span className="caption" style={{ fontSize: '10px' }}>
                Última: {formatTime(lastCheckTime)}
              </span>
            </div>
          </div>
          <button
            className="btn-ghost"
            style={{ padding: '3px 5px', flexShrink: 0 }}
            onClick={onRefreshAll}
            disabled={isChecking}
            title="Comprobar todos los juegos ahora (reinicia el contador)"
          >
            <RotateCw
              size={13}
              style={{
                animation: isChecking ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
        </div>

        <button
          onClick={() => api.openSteamUrl('https://discord.gg/tPP2yE4X5Y')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            width: '100%',
            padding: '7px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(88, 101, 242, 0.1)',
            border: '1px solid rgba(88, 101, 242, 0.28)',
            color: '#5865F2',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '8px',
            transition: 'all 0.2s ease',
          }}
          title="Entrar al servidor oficial de Discord de Steam Watcher"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 127.14 96.36"
            fill="currentColor"
            style={{ display: 'block', flexShrink: 0 }}
          >
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
          </svg>
          <span>Discord Oficial</span>
        </button>

        <div className="footer-meta">
          <span className="caption">Steam Watcher</span>
          <span className="caption">v1.0.0</span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </aside>
  );
};
