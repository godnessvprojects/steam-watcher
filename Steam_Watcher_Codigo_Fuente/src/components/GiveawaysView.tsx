import React, { useState, useEffect } from 'react';
import {
  Gift,
  ExternalLink,
  RotateCw,
  Search,
  Sparkles,
  Clock,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FreeGiveaway } from '../types/game';
import { api } from '../services/api';

export const GiveawaysView: React.FC = () => {
  const [giveaways, setGiveaways] = useState<FreeGiveaway[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'games' | 'dlc' | 'other'>('all');
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});

  const loadGiveaways = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await api.getFreeGiveaways();
      setGiveaways(data);
    } catch (err) {
      console.error('Error cargando promociones gratuitas:', err);
      setErrorMessage(
        'No se pudieron cargar las promociones gratuitas en este momento. Revisa tu conexión a internet.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadGiveaways();
  }, []);

  const toggleInstructions = (id: string) => {
    setExpandedInstructions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredGiveaways = giveaways.filter((item) => {
    // Type filter
    if (filterType === 'games') {
      const isGame = item.giveaway_type.toLowerCase().includes('juego') || item.giveaway_type.toLowerCase().includes('game');
      if (!isGame) return false;
    } else if (filterType === 'dlc') {
      const isDlc = item.giveaway_type.toLowerCase().includes('dlc') || item.giveaway_type.toLowerCase().includes('expansión');
      if (!isDlc) return false;
    } else if (filterType === 'other') {
      const isGame = item.giveaway_type.toLowerCase().includes('juego') || item.giveaway_type.toLowerCase().includes('game');
      const isDlc = item.giveaway_type.toLowerCase().includes('dlc') || item.giveaway_type.toLowerCase().includes('expansión');
      if (isGame || isDlc) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.giveaway_type.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
      {/* Banner editorial de bienvenida */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.12) 0%, rgba(0, 113, 227, 0.08) 100%)',
          border: '1px solid rgba(52, 199, 89, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--success-color)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Gift size={20} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Promociones 100% Gratis y Regalos para Steam</span>
              <Sparkles size={14} color="var(--success-color)" />
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Juegos completos, DLCs y claves temporales al 100% de descuento. Reclámalos para conservarlos en tu cuenta permanentemente.
            </div>
          </div>
        </div>

        <button
          className="btn-secondary"
          onClick={() => loadGiveaways(true)}
          disabled={isRefreshing || isLoading}
          title="Actualizar lista de promociones"
          style={{ padding: '7px 14px', fontSize: '12.5px', flexShrink: 0 }}
        >
          <RotateCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* Barra de filtros y búsqueda */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div className="segmented-control" style={{ maxWidth: '480px' }}>
          <button
            className={`segment-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Todos ({giveaways.length})
          </button>
          <button
            className={`segment-btn ${filterType === 'games' ? 'active' : ''}`}
            onClick={() => setFilterType('games')}
          >
            Juegos
          </button>
          <button
            className={`segment-btn ${filterType === 'dlc' ? 'active' : ''}`}
            onClick={() => setFilterType('dlc')}
          >
            DLCs / Extras
          </button>
          <button
            className={`segment-btn ${filterType === 'other' ? 'active' : ''}`}
            onClick={() => setFilterType('other')}
          >
            Betas / Otros
          </button>
        </div>

        <div className="search-input-wrapper" style={{ width: '260px' }}>
          <Search className="search-icon" size={14} />
          <input
            type="text"
            placeholder="Filtrar por título..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Estados de Carga / Error */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <RotateCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
          <p style={{ fontSize: '13px' }}>Buscando juegos y DLCs 100% gratis en Steam...</p>
        </div>
      )}

      {errorMessage && !isLoading && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(255, 69, 58, 0.08)',
            border: '1px solid rgba(255, 69, 58, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger-color)',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMessage && filteredGiveaways.length === 0 && (
        <div className="empty-state animate-fade-in" style={{ padding: '60px 20px' }}>
          <div className="empty-icon" style={{ background: 'rgba(52, 199, 89, 0.1)', color: 'var(--success-color)' }}>
            <Gift size={24} strokeWidth={1.5} />
          </div>
          <h3>No se encontraron promociones con ese filtro</h3>
          <p style={{ maxWidth: '400px', fontSize: '13px' }}>
            Prueba a seleccionar la categoría "Todos" o borrar el término de búsqueda para ver los regalos disponibles.
          </p>
        </div>
      )}

      {/* Grid de Tarjetas de Giveaways */}
      {!isLoading && !errorMessage && filteredGiveaways.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredGiveaways.map((item) => {
            const hasInstructions = !!item.instructions && item.instructions.trim().length > 0;
            const isExpanded = !!expandedInstructions[item.id];

            return (
              <div
                key={item.id}
                className="game-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-card)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Cabecera / Miniatura */}
                <div style={{ position: 'relative', width: '100%', height: '150px', background: '#0f141c', overflow: 'hidden' }}>
                  <img
                    src={item.image || item.thumbnail}
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e) => {
                      // Fallback si la imagen no carga
                      (e.target as HTMLImageElement).src =
                        'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/440/header.jpg';
                    }}
                  />

                  {/* Badges superiores */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      display: 'flex',
                      gap: '6px',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        background: 'var(--success-color)',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        letterSpacing: '0.02em',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      100% GRATIS
                    </span>

                    {item.worth && item.worth !== 'N/A' && (
                      <span
                        style={{
                          background: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(4px)',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '3px 7px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        Valor: {item.worth}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '10px',
                      background: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: 'var(--text-secondary)',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {item.giveaway_type}
                  </div>
                </div>

                {/* Contenido de la tarjeta */}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      lineHeight: '1.3',
                      marginBottom: '8px',
                      color: 'var(--text-primary)',
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </h4>

                  <p
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.45',
                      marginBottom: '12px',
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.description || 'Promoción de Steam disponible por tiempo limitado.'}
                  </p>

                  {/* Fecha de fin si está disponible */}
                  {item.end_date && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11.5px',
                        color: 'var(--accent-primary)',
                        marginBottom: '12px',
                      }}
                    >
                      <Clock size={12} />
                      <span>Termina: {item.end_date.replace(' 23:59:00', '')}</span>
                    </div>
                  )}

                  {/* Instrucciones desplegables si requiere pasos */}
                  {hasInstructions && (
                    <div style={{ marginBottom: '12px' }}>
                      <button
                        onClick={() => toggleInstructions(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0',
                          fontSize: '11.5px',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <HelpCircle size={12} />
                        <span>{isExpanded ? 'Ocultar instrucciones' : 'Ver cómo reclamar'}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '10px 12px',
                            background: 'var(--bg-surface)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            fontSize: '11.5px',
                            lineHeight: '1.45',
                            color: 'var(--text-primary)',
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {item.instructions}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botón de acción */}
                  <button
                    className="btn-primary"
                    onClick={() => api.openSteamUrl(item.claim_url)}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: 'var(--success-color)',
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>Reclamar gratis</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
