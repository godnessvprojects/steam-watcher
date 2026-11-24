import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  Game,
  GameDetailResponse,
  PriceHistoryItem,
  DlcItem,
  NotificationItem,
  Settings,
  CheckSummary,
  ImportSummary,
  WishlistImportSummary,
  FreeGiveaway,
  AppUpdateInfo,
} from '../types/game';

export const api = {
  async getGames(): Promise<Game[]> {
    return await invoke<Game[]>('get_games');
  },

  async getGameDetails(appid: number): Promise<GameDetailResponse> {
    return await invoke<GameDetailResponse>('get_game_details', { appid });
  },

  async addGame(input: string): Promise<Game> {
    return await invoke<Game>('add_game', { input });
  },

  async refreshGame(appid: number): Promise<Game> {
    return await invoke<Game>('refresh_game', { appid });
  },

  async checkAllGames(): Promise<CheckSummary> {
    return await invoke<CheckSummary>('check_all_games');
  },

  async deleteGame(appid: number): Promise<boolean> {
    return await invoke<boolean>('delete_game', { appid });
  },

  async toggleGameNotifications(appid: number, enabled: boolean): Promise<boolean> {
    return await invoke<boolean>('toggle_game_notifications', { appid, enabled });
  },

  async setPriceTarget(appid: number, targetPrice: number | null): Promise<boolean> {
    return await invoke<boolean>('set_price_target', { appid, targetPrice });
  },

  async getPriceHistory(appid: number): Promise<PriceHistoryItem[]> {
    return await invoke<PriceHistoryItem[]>('get_price_history', { appid });
  },

  async getDlcs(parentAppid: number): Promise<DlcItem[]> {
    return await invoke<DlcItem[]>('get_dlcs', { parentAppid });
  },

  async getDlcDeals(): Promise<DlcItem[]> {
    return await invoke<DlcItem[]>('get_dlc_deals');
  },

  async getNotifications(limit?: number): Promise<NotificationItem[]> {
    return await invoke<NotificationItem[]>('get_notifications', { limit });
  },

  async getSettings(): Promise<Settings> {
    return await invoke<Settings>('get_settings');
  },

  async saveSettings(settings: Settings): Promise<boolean> {
    return await invoke<boolean>('save_settings', { settings });
  },

  async sendTestNotification(): Promise<boolean> {
    return await invoke<boolean>('send_test_notification');
  },

  async setAutostart(enabled: boolean): Promise<boolean> {
    return await invoke<boolean>('set_autostart', { enabled });
  },

  async exportLibrary(): Promise<string> {
    return await invoke<string>('export_library');
  },

  async importLibrary(jsonData: string): Promise<ImportSummary> {
    return await invoke<ImportSummary>('import_library', { jsonData });
  },

  async importWishlist(steamIdOrUrl: string): Promise<WishlistImportSummary> {
    return await invoke<WishlistImportSummary>('import_wishlist', { steamIdOrUrl });
  },

  async syncWishlist(): Promise<WishlistImportSummary> {
    return await invoke<WishlistImportSummary>('sync_wishlist');
  },

  async getFreeGiveaways(): Promise<FreeGiveaway[]> {
    return await invoke<FreeGiveaway[]>('get_free_giveaways');
  },

  async checkAppUpdate(): Promise<AppUpdateInfo> {
    return await invoke<AppUpdateInfo>('check_app_update');
  },

  async openSteamUrl(url: string): Promise<void> {
    try {
      await openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  },
};
