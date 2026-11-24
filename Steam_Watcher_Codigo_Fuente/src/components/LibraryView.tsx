import React from 'react';
import { ExternalLink, Trash2, RotateCw, Eye } from 'lucide-react';
import { Game } from '../types/game';
import { ViewMode } from './Header';
import { api } from '../services/api';

interface LibraryViewProps {
  games: Game[];
  viewMode: ViewMode;
  onSelectGame: (game: Game) => void;
  onRefreshGame: (appid: number) => void;
  onDeleteGame: (appid: number) => void;
  onOpenAddModal: () => void;
  refreshingAppid?: number | null;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  games,
  viewMode,
  onSelectGame,
  onRefreshGame,
  onDeleteGame,
  onOpenAddModal,
  refreshingAppid,
}) => {
  const formatPrice = (val: number, currency: string) => {
    const symbol = currency === 'EUR' ? '€' : currency;
    return `${val.toFixed(2).replace('.', ',')} ${symbol}`;
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString([], {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Reciente';
    }
  };

  if (games.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <div className="empty-icon">
          <Eye size={24} strokeWidth={1.5} />
        </div>
        <h3>No tienes videojuegos en seguimiento</h3>
        <p style={{ maxWidth: '400px', fontSize: '13px' }}>
          Añade un juego pegando su URL de la tienda de Steam para comenzar a monitorizar
          sus variaciones de precio y descuentos.
        </p>
        <button
          className="btn-primary"
          style={{ marginTop: '8px' }}
          onClick={onOpenAddModal}
        >
          Añadir videojuego ahora
        </button>
      </div>
    );
  }

  if (viewMode === 'table') {
    return (
      <div className="table-container animate-fade-in">
        <table className="game-table">
          <thead>
            <tr>
              <th>Videojuego</th>
              <th>Precio actual</th>
              <th>Precio original</th>
              <th>Descuento</th>
              <th>Estado</th>
              <th>Comprobado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const isSale = game.is_on_sale && game.discount_percent > 0;
              const savings = game.original_price - game.current_price;

              return (
                <tr key={game.appid} onClick={() => onSelectGame(game)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="table-game-col">
                      <img
                        src={game.header_image}
                        alt={game.name}
                        className="table-game-thumb"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/460x215?text=Steam';
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {game.name}
                        </div>
                        <div className="caption">AppID: {game.appid}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      style={{
                        fontWeight: 600,
                        color: isSale ? 'var(--sale-text)' : 'var(--text-primary)',
                      }}
                    >
                      {game.is_free ? 'Gratis' : formatPrice(game.current_price, game.currency)}
                    </span>
                  </td>

                  <td>
                    {isSale ? (
                      <span className="original-price-strikethrough">
                        {formatPrice(game.original_price, game.currency)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>

                  <td>
                    {isSale ? (
                      <span className="badge-pill badge-sale">
                        -{game.discount_percent}%
                      </span>
                    ) : (
                      <span className="badge-pill badge-normal">0%</span>
                    )}
                  </td>

                  <td>
                    {isSale ? (
                      <span className="badge-pill badge-sale">
                        Ahorro {formatPrice(savings, game.currency)}
                      </span>
                    ) : (
                      <span className="badge-pill badge-normal">Precio habitual</span>
                    )}
                  </td>

                  <td className="caption">{formatDate(game.last_checked_at)}</td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '4px 6px' }}
                        title="Abrir en Steam"
                        onClick={() => api.openSteamUrl(game.url)}
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '4px 6px' }}
                        title="Actualizar precio"
                        disabled={refreshingAppid === game.appid}
                        onClick={() => onRefreshGame(game.appid)}
                      >
                        <RotateCw
                          size={14}
                          style={{
                            animation: refreshingAppid === game.appid ? 'spin 1s linear infinite' : 'none',
                          }}
                        />
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '4px 6px', color: '#D70015' }}
                        title="Eliminar de la biblioteca"
                        onClick={() => onDeleteGame(game.appid)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="game-grid animate-fade-in">
      {games.map((game) => {
        const isSale = game.is_on_sale && game.discount_percent > 0;
        const savings = game.original_price - game.current_price;

        return (
          <div
            key={game.appid}
            className="game-card"
            onClick={() => onSelectGame(game)}
          >
            <img
              src={game.header_image}
              alt={game.name}
              className="card-header-image"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/460x215?text=Steam';
              }}
            />

            <div className="card-body">
              <div className="card-title-row">
                <span className="card-game-title">{game.name}</span>
                {isSale && (
                  <span className="badge-pill badge-sale">
                    -{game.discount_percent}%
                  </span>
                )}
              </div>

              {isSale ? (
                <div style={{ fontSize: '11.5px', color: 'var(--sale-text)', fontWeight: 500 }}>
                  Ahorras {formatPrice(savings, game.currency)}
                </div>
              ) : (
                <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                  {game.dlc_count > 0 ? `${game.dlc_count} DLCs monitoreados` : 'Sin DLCs'}
                </div>
              )}

              <div className="card-price-section">
                <div className="price-group">
                  <span className={`current-price ${isSale ? 'is-sale' : ''}`}>
                    {game.is_free ? 'Gratis' : formatPrice(game.current_price, game.currency)}
                  </span>
                  {isSale && (
                    <span className="original-price-strikethrough">
                      {formatPrice(game.original_price, game.currency)}
                    </span>
                  )}
                </div>

                <div
                  style={{ display: 'flex', gap: '3px' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn-ghost"
                    style={{ padding: '3px 5px' }}
                    title="Abrir en Steam"
                    onClick={() => api.openSteamUrl(game.url)}
                  >
                    <ExternalLink size={13} />
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ padding: '3px 5px' }}
                    title="Actualizar datos"
                    disabled={refreshingAppid === game.appid}
                    onClick={() => onRefreshGame(game.appid)}
                  >
                    <RotateCw
                      size={13}
                      style={{
                        animation: refreshingAppid === game.appid ? 'spin 1s linear infinite' : 'none',
                      }}
                    />
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ padding: '3px 5px', color: '#D70015' }}
                    title="Eliminar"
                    onClick={() => onDeleteGame(game.appid)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="card-meta-row">
                <span>Comprobado: {formatDate(game.last_checked_at)}</span>
                {game.target_price && (
                  <span className="caption" style={{ color: 'var(--accent-primary)' }}>
                    Obj: {formatPrice(game.target_price, game.currency)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
