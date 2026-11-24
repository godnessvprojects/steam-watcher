import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header, ViewMode, SortOption } from './components/Header';
import { LibraryView } from './components/LibraryView';
import { DealsView } from './components/DealsView';
import { DlcDealsView } from './components/DlcDealsView';
import { PriceHistoryView } from './components/PriceHistoryView';
import { SettingsView } from './components/SettingsView';
import { CreditsView } from './components/CreditsView';
import { GiveawaysView } from './components/GiveawaysView';
import { GameDetailModal } from './components/GameDetailModal';
import { AddGameModal } from './components/AddGameModal';
import { Game, Settings, AppUpdateInfo } from './types/game';
import { api } from './services/api';
import { Sparkles } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { onAction } from '@tauri-apps/plugin-notification';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('discount_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [selectedGameForModal, setSelectedGameForModal] = useState<Game | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'single' | 'wishlist'>('single');
  const [isChecking, setIsChecking] = useState(false);
  const [refreshingAppid, setRefreshingAppid] = useState<number | null>(null);
  const [dlcDealsCount, setDlcDealsCount] = useState(0);
  const [giveawaysCount, setGiveawaysCount] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600);
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdateInfo | null>(null);

  // Apply Theme
  const applyTheme = useCallback((theme: 'system' | 'light' | 'dark') => {
    let resolved = theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [gamesData, settingsData, dlcDeals, freeGiveaways] = await Promise.all([
        api.getGames(),
        api.getSettings(),
        api.getDlcDeals().catch(() => []),
        api.getFreeGiveaways().catch(() => []),
      ]);
      setGames(gamesData);
      setSettings(settingsData);
      setDlcDealsCount(dlcDeals.length);
      setGiveawaysCount(freeGiveaways.length);
      applyTheme(settingsData.theme);

      // Check for updates if auto_update is enabled
      if (settingsData.auto_update) {
        api.checkAppUpdate().then((info) => {
          if (info.has_update) {
            setAvailableUpdate(info);
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Error cargando datos de Steam Watcher:', err);
    }
  }, [applyTheme]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh data on focus, visibility change, and native Tauri events
  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };

    window.addEventListener('focus', handleFocus);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let unlisten: (() => void) | undefined;
    listen('refresh-data', () => {
      loadData();
    })
      .then((f) => {
        unlisten = f;
      })
      .catch(() => {});

    let unlistenAction: { unregister: () => Promise<void> } | undefined;
    onAction(() => {
      loadData();
    })
      .then((l) => {
        unlistenAction = l;
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (unlisten) unlisten();
      if (unlistenAction) unlistenAction.unregister();
    };
  }, [loadData]);

  // Handle Refresh Single Game (Single game refresh DOES NOT reset countdown)
  const handleRefreshGame = async (appid: number) => {
    setRefreshingAppid(appid);
    try {
      const updated = await api.refreshGame(appid);
      setGames((prev) => prev.map((g) => (g.appid === appid ? updated : g)));
      setSelectedGameForModal((current) => {
        // Only update if the modal is currently open for this game. If the user closed it, keep it closed!
        return current && current.appid === appid ? updated : current;
      });
    } catch (err) {
      console.error('Error al actualizar juego:', err);
    } finally {
      setRefreshingAppid(null);
    }
  };

  // Handle Refresh All Games (All games refresh RESETS countdown)
  const handleRefreshAll = useCallback(async () => {
    setIsChecking(true);
    try {
      await api.checkAllGames();
      await loadData();
      // Reset countdown to configured interval when ALL games are refreshed
      if (settings?.check_interval_minutes) {
        setSecondsRemaining(settings.check_interval_minutes * 60);
      }
    } catch (err) {
      console.error('Error comprobando todos los juegos:', err);
    } finally {
      setIsChecking(false);
    }
  }, [loadData, settings?.check_interval_minutes]);

  // Countdown timer effect for automatic checks
  useEffect(() => {
    if (!settings) return;
    const intervalSec = (settings.check_interval_minutes || 60) * 60;

    let initialSec = intervalSec;
    if (settings.last_check_timestamp) {
      try {
        const lastCheckMs = new Date(settings.last_check_timestamp).getTime();
        const elapsedSec = Math.floor((Date.now() - lastCheckMs) / 1000);
        if (elapsedSec >= 0 && elapsedSec < intervalSec) {
          initialSec = intervalSec - elapsedSec;
        }
      } catch {
        initialSec = intervalSec;
      }
    }
    setSecondsRemaining(initialSec);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleRefreshAll();
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [settings?.check_interval_minutes, handleRefreshAll]);

  // Handle Delete Game
  const handleDeleteGame = async (appid: number) => {
    try {
      await api.deleteGame(appid);
      setGames((prev) => prev.filter((g) => g.appid !== appid));
      if (selectedGameForModal?.appid === appid) {
        setSelectedGameForModal(null);
      }
    } catch (err) {
      console.error('Error al eliminar juego:', err);
    }
  };

  // Filter and Sort Games
  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) => g.name.toLowerCase().includes(q) || g.appid.toString().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case 'discount_desc':
          return b.discount_percent - a.discount_percent;
        case 'savings_desc':
          return (
            b.original_price - b.current_price - (a.original_price - a.current_price)
          );
        case 'price_asc':
          return a.current_price - b.current_price;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [games, searchQuery, sortOption]);

  const dealsCount = games.filter((g) => g.is_on_sale && g.discount_percent > 0).length;

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        gameCount={games.length}
        dealCount={dealsCount}
        dlcDealCount={dlcDealsCount}
        giveawaysCount={giveawaysCount}
        isChecking={isChecking}
        onRefreshAll={handleRefreshAll}
        lastCheckTime={settings?.last_check_timestamp}
        secondsRemaining={secondsRemaining}
      />

      {/* Main Area */}
      <main className="app-content">
        {/* Banner de Actualización Disponible */}
        {availableUpdate && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.15) 0%, rgba(0, 113, 227, 0.1) 100%)',
              borderBottom: '1px solid rgba(52, 199, 89, 0.3)',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px',
              color: 'var(--text-primary)',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={16} color="var(--success-color)" />
              <span>
                <strong>¡Nueva versión disponible (v{availableUpdate.latest_version})!</strong> Tus juegos y datos se conservarán automáticamente al actualizar.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn-primary"
                onClick={() => api.openSteamUrl(availableUpdate.download_url || availableUpdate.html_url || '')}
                style={{ padding: '5px 12px', fontSize: '12px', background: 'var(--success-color)' }}
              >
                Actualizar ahora
              </button>
              <button
                className="btn-ghost"
                onClick={() => setAvailableUpdate(null)}
                style={{ padding: '4px 8px', fontSize: '12px' }}
                title="Cerrar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <Header
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenAddModal={(tab = 'single') => {
            setAddModalTab(tab);
            setIsAddModalOpen(true);
          }}
        />

        <div className="content-body">
          {activeTab === 'library' && (
            <LibraryView
              games={filteredAndSortedGames}
              viewMode={viewMode}
              onSelectGame={setSelectedGameForModal}
              onRefreshGame={handleRefreshGame}
              onDeleteGame={handleDeleteGame}
              onOpenAddModal={() => {
                setAddModalTab('single');
                setIsAddModalOpen(true);
              }}
              refreshingAppid={refreshingAppid}
            />
          )}

          {activeTab === 'deals' && (
            <DealsView
              games={filteredAndSortedGames}
              viewMode={viewMode}
              onSelectGame={setSelectedGameForModal}
              onRefreshGame={handleRefreshGame}
              onDeleteGame={handleDeleteGame}
              onOpenAddModal={() => {
                setAddModalTab('single');
                setIsAddModalOpen(true);
              }}
              refreshingAppid={refreshingAppid}
            />
          )}

          {activeTab === 'dlc-deals' && <DlcDealsView />}

          {activeTab === 'giveaways' && <GiveawaysView />}

          {activeTab === 'history' && <PriceHistoryView games={games} />}

          {activeTab === 'settings' && (
            <SettingsView onThemeChange={applyTheme} />
          )}

          {activeTab === 'credits' && <CreditsView />}
        </div>
      </main>

      {/* Game Details Modal Sheet */}
      {selectedGameForModal && (
        <GameDetailModal
          game={selectedGameForModal}
          onClose={() => setSelectedGameForModal(null)}
          onRefresh={handleRefreshGame}
        />
      )}

      {/* Add Game Modal Sheet */}
      {isAddModalOpen && (
        <AddGameModal
          initialTab={addModalTab}
          onClose={() => setIsAddModalOpen(false)}
          onGameAdded={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
export default App;
