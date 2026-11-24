import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Bell,
  BellOff,
  Package,
  TrendingDown,
  Info,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
} from 'lucide-react';
import { Game, GameDetailResponse } from '../types/game';
import { api } from '../services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface GameDetailModalProps {
  game: Game;
  onClose: () => void;
  onRefresh: (appid: number) => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  onClose,
  onRefresh,
}) => {
  const [details, setDetails] = useState<GameDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetPriceInput, setTargetPriceInput] = useState<string>(
    game.target_price ? game.target_price.toString() : ''
  );
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    game.notifications_enabled
  );

  useEffect(() => {
    const loadDetails = async () => {
      try {
        setLoading(true);
        const data = await api.getGameDetails(game.appid);
        setDetails(data);
        if (data.game.target_price) {
          setTargetPriceInput(data.game.target_price.toString());
        }
        setNotificationsEnabled(data.game.notifications_enabled);
      } catch (err) {
        console.error('Error al cargar ficha de juego:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [game.appid]);

  const handleSaveTarget = async () => {
    setIsSavingTarget(true);
    try {
      const val = targetPriceInput.trim() ? parseFloat(targetPriceInput) : null;
      await api.setPriceTarget(game.appid, val);
      onRefresh(game.appid);
    } catch (err) {
      console.error('Error al guardar precio objetivo:', err);
    } finally {
      setIsSavingTarget(false);
    }
  };

  const handleToggleNotifications = async () => {
    const nextState = !notificationsEnabled;
    setNotificationsEnabled(nextState);
    await api.toggleGameNotifications(game.appid, nextState);
  };

  const formatPrice = (val: number, currency: string) => {
    const symbol = currency === 'EUR' ? '€' : currency;
    return `${val.toFixed(2).replace('.', ',')} ${symbol}`;
  };

  const isSale = game.is_on_sale && game.discount_percent > 0;
  const savings = game.original_price - game.current_price;

  const chartData = (details?.history || []).map((item) => ({
    date: new Date(item.recorded_at).toLocaleDateString([], { day: '2-digit', month: 'short' }),
    precio: item.price,
    original: item.original_price,
    descuento: item.discount_percent,
  }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet modal-sheet-large animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3>Ficha del Videojuego</h3>
            <span className="caption">AppID: {game.appid}</span>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{ padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-sheet-body">
          {/* Hero Banner with Title Scrim */}
          <div className="detail-banner">
            <img
              src={game.header_image}
              alt={game.name}
              className="detail-banner-img"
            />
            <div className="detail-banner-gradient">
              <h1 style={{ color: '#FFFFFF', fontSize: '26px' }}>{game.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
                  {game.is_free ? 'Gratis' : formatPrice(game.current_price, game.currency)}
                </span>
                {isSale && (
                  <>
                    <span
                      style={{
                        fontSize: '14px',
                        textDecoration: 'line-through',
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {formatPrice(game.original_price, game.currency)}
                    </span>
                    <span className="badge-pill badge-sale">
                      -{game.discount_percent}% de descuento
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-primary"
                onClick={() => api.openSteamUrl(game.url)}
              >
                <ExternalLink size={14} />
                Abrir en Steam Store
              </button>
              <button
                className={`btn-secondary ${notificationsEnabled ? '' : 'btn-danger'}`}
                onClick={handleToggleNotifications}
              >
                {notificationsEnabled ? (
                  <>
                    <Bell size={14} /> Notificaciones activas
                  </>
                ) : (
                  <>
                    <BellOff size={14} /> Notificaciones silenciadas
                  </>
                )}
              </button>
            </div>

            <div className="caption">
              Última comprobación: {new Date(game.last_checked_at).toLocaleString()}
            </div>
          </div>

          {/* Short Description */}
          {game.short_description && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {game.short_description}
            </div>
          )}

          {/* Motivo de la Oferta (Verified Reason Section) */}
          {isSale && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                Motivo y contexto de la promoción
              </div>
              {details?.deal_reason ? (
                <div
                  className={`deal-reason-callout ${
                    details.deal_reason.confidence === 'confirmed'
                      ? 'confirmed'
                      : details.deal_reason.confidence === 'seasonal_inference'
                      ? 'seasonal'
                      : 'unidentified'
                  }`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    {details.deal_reason.confidence === 'confirmed' && (
                      <>
                        <CheckCircle2 size={16} color="var(--sale-badge-text)" />
                        <span>Promoción Verificada</span>
                      </>
                    )}
                    {details.deal_reason.confidence === 'seasonal_inference' && (
                      <>
                        <AlertCircle size={16} color="var(--warning-color)" />
                        <span>Inferencia de Calendario Estacional (Sin confirmar)</span>
                      </>
                    )}
                    {details.deal_reason.confidence === 'unidentified' && (
                      <>
                        <HelpCircle size={16} color="var(--text-tertiary)" />
                        <span>Motivo no identificado</span>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '2px' }}>
                    {details.deal_reason.reason}
                  </div>
                  <div className="caption" style={{ marginTop: '4px' }}>
                    Fuente: {details.deal_reason.source} | Fecha:{' '}
                    {new Date(details.deal_reason.identified_at).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="deal-reason-callout unidentified">
                  <div style={{ fontWeight: 600 }}>Motivo de la oferta no identificado</div>
                  <div className="caption">
                    Descuento temporal directo configurado por el desarrollador o editor en Steam.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Target Price Feature */}
          <div className="target-price-box">
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>
                Establecer precio objetivo
              </div>
              <div className="caption">
                Te avisaremos automáticamente cuando este título cueste este precio o menos.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                step="0.5"
                placeholder="Ej. 14.99"
                style={{ width: '100px' }}
                value={targetPriceInput}
                onChange={(e) => setTargetPriceInput(e.target.value)}
              />
              <span style={{ fontWeight: 600 }}>€</span>
              <button
                className="btn-secondary"
                onClick={handleSaveTarget}
                disabled={isSavingTarget}
              >
                <Save size={13} />
                Guardar
              </button>
            </div>
          </div>

          {/* Minimalist Price History Chart */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontWeight: 600 }}>Historial de Precios</div>
              {game.lowest_recorded_price !== null && (
                <span className="caption" style={{ color: 'var(--success-color)' }}>
                  Mínimo registrado: {formatPrice(game.lowest_recorded_price, game.currency)}
                </span>
              )}
            </div>

            {chartData.length > 0 ? (
              <div
                style={{
                  height: '180px',
                  background: 'var(--bg-surface-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis unit="€" tick={{ fontSize: 10 }} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line
                      type="stepAfter"
                      dataKey="precio"
                      stroke="var(--accent-primary)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="caption" style={{ padding: '20px 0', textAlign: 'center' }}>
                Historial comenzando a registrarse...
              </div>
            )}
          </div>

          {/* DLC and Expansions Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={16} />
                <span>DLC y expansiones ({details?.dlcs.length || 0})</span>
              </div>
            </div>

            {details?.dlcs && details.dlcs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {details.dlcs.map((dlc) => (
                  <div
                    key={dlc.dlc_appid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: dlc.is_on_sale ? 'var(--sale-badge-subtle)' : 'var(--bg-surface-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{dlc.name}</span>
                      {dlc.is_on_sale && (
                        <span className="badge-pill badge-sale">
                          -{dlc.discount_percent}%
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 600, color: dlc.is_on_sale ? 'var(--sale-text)' : 'inherit' }}>
                        {dlc.is_free ? 'Gratis' : formatPrice(dlc.current_price, dlc.currency)}
                      </span>
                      <button
                        className="btn-ghost"
                        style={{ padding: '3px 6px' }}
                        title="Ver DLC en Steam"
                        onClick={() => api.openSteamUrl(dlc.steam_url)}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="caption" style={{ padding: '12px 0' }}>
                {loading ? 'Cargando expansiones asociadas...' : 'No se detectaron DLCs adicionales para este juego.'}
              </div>
            )}
          </div>

          {/* Notifications Log */}
          {details?.recent_notifications && details.recent_notifications.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                Últimos cambios detectados
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {details.recent_notifications.map((notif) => (
                  <div
                    key={notif.id}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-surface-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600 }}>{notif.event_type.replace('_', ' ').toUpperCase()}</span>
                      <span className="caption">{new Date(notif.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {notif.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-sheet-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            Cerrar ficha
          </button>
        </div>
      </div>
    </div>
  );
};
