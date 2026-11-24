import React from 'react';
import { Tag } from 'lucide-react';
import { Game } from '../types/game';
import { ViewMode } from './Header';
import { LibraryView } from './LibraryView';

interface DealsViewProps {
  games: Game[];
  viewMode: ViewMode;
  onSelectGame: (game: Game) => void;
  onRefreshGame: (appid: number) => void;
  onDeleteGame: (appid: number) => void;
  onOpenAddModal: () => void;
  refreshingAppid?: number | null;
}

export const DealsView: React.FC<DealsViewProps> = ({
  games,
  viewMode,
  onSelectGame,
  onRefreshGame,
  onDeleteGame,
  onOpenAddModal,
  refreshingAppid,
}) => {
  const deals = games.filter((g) => g.is_on_sale && g.discount_percent > 0);

  const totalSavings = deals.reduce(
    (sum, g) => sum + (g.original_price - g.current_price),
    0
  );

  const maxDiscount = deals.reduce(
    (max, g) => Math.max(max, g.discount_percent),
    0
  );

  if (deals.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <div className="empty-icon">
          <Tag size={24} strokeWidth={1.5} />
        </div>
        <h3>No hay ofertas activas detectadas</h3>
        <p style={{ maxWidth: '400px', fontSize: '13px' }}>
          Actualmente ninguno de los videojuegos en tu biblioteca tiene descuento
          en la tienda de Steam. El monitor te notificará de inmediato cuando comience alguna oferta.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Summary KPI Banner */}
      <div className="deals-summary-banner">
        <div className="summary-card">
          <span className="summary-card-title">Ofertas Activas</span>
          <span className="summary-card-value">{deals.length}</span>
        </div>

        <div className="summary-card">
          <span className="summary-card-title">Ahorro Económico Potencial</span>
          <span className="summary-card-value accent">
            {totalSavings.toFixed(2).replace('.', ',')} €
          </span>
        </div>

        <div className="summary-card">
          <span className="summary-card-title">Mayor Descuento Detectado</span>
          <span className="summary-card-value accent">-{maxDiscount}%</span>
        </div>
      </div>

      {/* Render Games with existing responsive layout */}
      <LibraryView
        games={deals}
        viewMode={viewMode}
        onSelectGame={onSelectGame}
        onRefreshGame={onRefreshGame}
        onDeleteGame={onDeleteGame}
        onOpenAddModal={onOpenAddModal}
        refreshingAppid={refreshingAppid}
      />
    </div>
  );
};
