import React from 'react';
import { Search, LayoutGrid, List, Plus, Bookmark } from 'lucide-react';
import { ActiveTab } from './Sidebar';

export type ViewMode = 'grid' | 'table';
export type SortOption = 'discount_desc' | 'savings_desc' | 'price_asc' | 'name_asc';

interface HeaderProps {
  activeTab: ActiveTab;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenAddModal: (initialTab?: 'single' | 'wishlist') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  onOpenAddModal,
}) => {
  const getTitles = () => {
    switch (activeTab) {
      case 'library':
        return {
          title: 'Biblioteca',
          subtitle: 'Videojuegos en seguimiento activo en Steam',
        };
      case 'deals':
        return {
          title: 'Ofertas detectadas',
          subtitle: 'Juegos de tu biblioteca con descuentos vigentes',
        };
      case 'dlc-deals':
        return {
          title: 'DLC en oferta',
          subtitle: 'Expansiones y complementos rebajados',
        };
      case 'giveaways':
        return {
          title: 'Juegos y promociones gratis',
          subtitle: 'Títulos y DLCs de Steam al 100% de descuento o sorteos para reclamar sin coste',
        };
      case 'history':
        return {
          title: 'Historial de precios',
          subtitle: 'Evolución cronológica y mínimos registrados',
        };
      case 'settings':
        return {
          title: 'Ajustes',
          subtitle: 'Configuración de comprobaciones, alertas y datos',
        };
      case 'credits':
        return {
          title: 'Créditos / Contact me',
          subtitle: 'Información del desarrollador y contacto',
        };
    }
  };

  const { title, subtitle } = getTitles();
  const showControls = activeTab === 'library' || activeTab === 'deals';

  return (
    <header className="content-header">
      <div className="header-titles">
        <h2>{title}</h2>
        <span className="caption">{subtitle}</span>
      </div>

      <div className="header-actions">
        {showControls && (
          <>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={14} />
              <input
                type="text"
                placeholder="Buscar juego..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              style={{ padding: '6px 10px', fontSize: '12.5px' }}
            >
              <option value="discount_desc">Mayor descuento %</option>
              <option value="savings_desc">Mayor ahorro €</option>
              <option value="price_asc">Menor precio actual</option>
              <option value="name_asc">Nombre (A - Z)</option>
            </select>

            <div className="segmented-control">
              <button
                className={`segment-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => onViewModeChange('grid')}
                title="Vista en cuadrícula"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                className={`segment-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => onViewModeChange('table')}
                title="Vista compacta de lista"
              >
                <List size={15} />
              </button>
            </div>
          </>
        )}

        <button
          className="btn-secondary"
          onClick={() => onOpenAddModal('wishlist')}
          title="Importar lista de deseados de Steam en 1 clic"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Bookmark size={14} />
          <span>Importar Wishlist</span>
        </button>

        <button className="btn-primary" onClick={() => onOpenAddModal('single')}>
          <Plus size={15} strokeWidth={2.2} />
          <span>Añadir videojuego</span>
        </button>
      </div>
    </header>
  );
};
