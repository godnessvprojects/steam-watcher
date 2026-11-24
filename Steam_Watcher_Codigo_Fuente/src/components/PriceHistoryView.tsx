import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingDown, Info } from 'lucide-react';
import { Game, PriceHistoryItem } from '../types/game';
import { api } from '../services/api';

interface PriceHistoryViewProps {
  games: Game[];
}

export const PriceHistoryView: React.FC<PriceHistoryViewProps> = ({ games }) => {
  const [selectedAppid, setSelectedAppid] = useState<number>(
    games.length > 0 ? games[0].appid : 0
  );
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (games.length > 0 && selectedAppid === 0) {
      setSelectedAppid(games[0].appid);
    }
  }, [games, selectedAppid]);

  useEffect(() => {
    if (!selectedAppid) return;
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await api.getPriceHistory(selectedAppid);
        setHistory(data);
      } catch (err) {
        console.error('Error al cargar historial:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [selectedAppid]);

  const currentGame = games.find((g) => g.appid === selectedAppid);

  const formatChartDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  const chartData = history.map((item) => ({
    date: formatChartDate(item.recorded_at),
    fullDate: item.recorded_at,
    precio: item.price,
    original: item.original_price,
    descuento: item.discount_percent,
  }));

  const lowestPrice = history.length > 0
    ? Math.min(...history.map((h) => h.price))
    : currentGame?.current_price ?? 0;

  if (games.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <div className="empty-icon">
          <TrendingDown size={24} strokeWidth={1.5} />
        </div>
        <h3>Sin datos históricos</h3>
        <p style={{ maxWidth: '400px', fontSize: '13px' }}>
          Añade videojuegos a la biblioteca para comenzar a trazar sus curvas de precios.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 600 }}>Seleccionar videojuego:</span>
          <select
            value={selectedAppid}
            onChange={(e) => setSelectedAppid(Number(e.target.value))}
            style={{ minWidth: '220px' }}
          >
            {games.map((g) => (
              <option key={g.appid} value={g.appid}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {currentGame && (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>
              <span className="caption">Precio actual: </span>
              <strong style={{ color: currentGame.is_on_sale ? 'var(--sale-text)' : 'inherit' }}>
                {currentGame.current_price.toFixed(2).replace('.', ',')} €
              </strong>
            </div>
            <div>
              <span className="caption">Mínimo registrado: </span>
              <strong style={{ color: 'var(--success-color)' }}>
                {lowestPrice.toFixed(2).replace('.', ',')} €
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Main Chart Box */}
      <div
        style={{
          background: 'var(--bg-surface)',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <div style={{ marginBottom: '18px' }}>
          <h3>Curva de evolución de precio</h3>
          <span className="caption">
            Registros comprobados para {currentGame?.name}
          </span>
        </div>

        {loading ? (
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="caption">Cargando gráfico...</span>
          </div>
        ) : chartData.length > 0 ? (
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickLine={false}
                />
                <YAxis
                  unit=" €"
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: 'var(--radius-md)',
                            padding: '8px 12px',
                            boxShadow: 'var(--shadow-dropdown)',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                            {data.fullDate ? new Date(data.fullDate).toLocaleString() : data.date}
                          </div>
                          <div>Precio: <strong>{data.precio.toFixed(2).replace('.', ',')} €</strong></div>
                          {data.descuento > 0 && (
                            <div style={{ color: 'var(--sale-text)' }}>
                              Descuento: -{data.descuento}% (Original: {data.original.toFixed(2).replace('.', ',')} €)
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey="precio"
                  stroke="var(--accent-primary)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--accent-primary)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="caption">No hay suficientes registros para graficar aún.</span>
          </div>
        )}
      </div>

      {/* Honest Disclosure Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          background: 'var(--bg-surface-secondary)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-primary)' }} />
        <div>
          <strong>Aviso de transparencia sobre el mínimo histórico:</strong> El precio mínimo mostrado
          corresponde exclusivamente al valor más bajo detectado por <em>Steam Watcher</em> desde que
          el videojuego fue añadido a tu biblioteca local. No equivale necesariamente al mínimo histórico
          absoluto de la historia de Steam.
        </div>
      </div>
    </div>
  );
};
