import React, { useEffect, useState } from 'react';
import { Package, ExternalLink, RefreshCw } from 'lucide-react';
import { DlcItem } from '../types/game';
import { api } from '../services/api';

export const DlcDealsView: React.FC = () => {
  const [dlcs, setDlcs] = useState<DlcItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDlcDeals = async () => {
    try {
      setLoading(true);
      const data = await api.getDlcDeals();
      setDlcs(data);
    } catch (err) {
      console.error('Error al cargar ofertas de DLC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDlcDeals();
  }, []);

  const formatPrice = (val: number, currency: string) => {
    const symbol = currency === 'EUR' ? '€' : currency;
    return `${val.toFixed(2).replace('.', ',')} ${symbol}`;
  };

  if (loading) {
    return (
      <div className="empty-state">
        <RefreshCw size={24} className="pulse-indicator" />
        <p>Buscando expansiones y DLCs en oferta...</p>
      </div>
    );
  }

  if (dlcs.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <div className="empty-icon">
          <Package size={24} strokeWidth={1.5} />
        </div>
        <h3>No hay DLCs en oferta actualmente</h3>
        <p style={{ maxWidth: '420px', fontSize: '13px' }}>
          Ninguna de las expansiones de los videojuegos en tu biblioteca cuenta con descuento
          activo en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="caption">Se han detectado {dlcs.length} DLCs rebajados</span>
        <button className="btn-secondary" onClick={fetchDlcDeals} style={{ padding: '4px 10px', fontSize: '12px' }}>
          <RefreshCw size={12} />
          Actualizar lista
        </button>
      </div>

      <div className="table-container">
        <table className="game-table">
          <thead>
            <tr>
              <th>Expansión / DLC</th>
              <th>Videojuego Principal</th>
              <th>Precio actual</th>
              <th>Precio original</th>
              <th>Descuento</th>
              <th>Ahorro</th>
              <th style={{ textAlign: 'right' }}>Steam</th>
            </tr>
          </thead>
          <tbody>
            {dlcs.map((dlc) => {
              const savings = dlc.original_price - dlc.current_price;

              return (
                <tr key={dlc.dlc_appid}>
                  <td>
                    <div className="table-game-col">
                      {dlc.header_image ? (
                        <img
                          src={dlc.header_image}
                          alt={dlc.name}
                          className="table-game-thumb"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className="table-game-thumb"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Package size={16} color="var(--text-tertiary)" />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {dlc.name}
                        </div>
                        <span className="caption">AppID: {dlc.dlc_appid}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="badge-pill badge-normal">
                      {dlc.parent_name || `AppID ${dlc.parent_appid}`}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--sale-text)' }}>
                      {dlc.is_free ? 'Gratis' : formatPrice(dlc.current_price, dlc.currency)}
                    </span>
                  </td>

                  <td>
                    <span className="original-price-strikethrough">
                      {formatPrice(dlc.original_price, dlc.currency)}
                    </span>
                  </td>

                  <td>
                    <span className="badge-pill badge-sale">
                      -{dlc.discount_percent}%
                    </span>
                  </td>

                  <td>
                    <span style={{ color: 'var(--sale-text)', fontWeight: 500 }}>
                      {formatPrice(savings, dlc.currency)}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11.5px' }}
                      onClick={() => api.openSteamUrl(dlc.steam_url)}
                    >
                      <ExternalLink size={12} />
                      Ver en Steam
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
