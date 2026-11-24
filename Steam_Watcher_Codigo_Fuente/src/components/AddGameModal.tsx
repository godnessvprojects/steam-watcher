import React, { useState } from 'react';
import { X, Plus, AlertCircle, Loader2, Link2, Bookmark, CheckCircle2, Info } from 'lucide-react';
import { api } from '../services/api';
import { WishlistImportSummary } from '../types/game';

interface AddGameModalProps {
  onClose: () => void;
  onGameAdded: () => void;
  initialTab?: 'single' | 'wishlist';
}

export const AddGameModal: React.FC<AddGameModalProps> = ({
  onClose,
  onGameAdded,
  initialTab = 'single',
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'wishlist'>(initialTab);
  const [inputUrl, setInputUrl] = useState('');
  const [wishlistInput, setWishlistInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wishlistSummary, setWishlistSummary] = useState<WishlistImportSummary | null>(null);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setErrorMessage('Por favor introduce una URL o AppID de Steam.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await api.addGame(trimmed);
      onGameAdded();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        typeof err === 'string'
          ? err
          : 'Error al consultar Steam Store. Verifica que la URL sea correcta y el juego exista.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleWishlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = wishlistInput.trim();
    if (!trimmed) {
      setErrorMessage('Por favor introduce tu Steam ID, nombre de perfil o enlace de Steam.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setWishlistSummary(null);

    try {
      const summary = await api.importWishlist(trimmed);
      setWishlistSummary(summary);
      onGameAdded();
    } catch (err: unknown) {
      setErrorMessage(
        typeof err === 'string'
          ? err
          : 'Error al importar la lista de deseados. Asegúrate de que el perfil y los detalles de juegos estén configurados como "Público" en la privacidad de Steam.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'single' ? (
              <Link2 size={18} color="var(--accent-primary)" />
            ) : (
              <Bookmark size={18} color="var(--accent-primary)" />
            )}
            <h3>Añadir a seguimiento</h3>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            style={{ padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ padding: '12px 20px 0 20px' }}>
          <div className="segmented-control" style={{ width: '100%', display: 'flex' }}>
            <button
              type="button"
              className={`segment-btn ${activeTab === 'single' ? 'active' : ''}`}
              style={{ flex: 1, padding: '7px 0', fontSize: '13px' }}
              onClick={() => {
                setActiveTab('single');
                setErrorMessage(null);
                setWishlistSummary(null);
              }}
            >
              <Link2 size={14} style={{ marginRight: '6px' }} />
              Por enlace de Steam
            </button>
            <button
              type="button"
              className={`segment-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
              style={{ flex: 1, padding: '7px 0', fontSize: '13px' }}
              onClick={() => {
                setActiveTab('wishlist');
                setErrorMessage(null);
                setWishlistSummary(null);
              }}
            >
              <Bookmark size={14} style={{ marginRight: '6px' }} />
              Importar Wishlist completa
            </button>
          </div>
        </div>

        {activeTab === 'single' ? (
          <form onSubmit={handleSingleSubmit}>
            <div className="modal-sheet-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Introduce el enlace de la tienda de Steam o el AppID del videojuego que deseas
                monitorizar:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="https://store.steampowered.com/app/1867240/WARDOGS/"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isLoading}
                  autoFocus
                />
                <span className="caption">
                  Ejemplo: https://store.steampowered.com/app/1867240/ o simplemente 1867240
                </span>
              </div>

              {errorMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    background: 'rgba(255, 59, 48, 0.08)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(255, 59, 48, 0.2)',
                    color: '#D70015',
                    fontSize: '12px',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="modal-sheet-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !inputUrl.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <span>Consultando Steam...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Añadir a la biblioteca</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleWishlistSubmit}>
            <div className="modal-sheet-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Importa todos los juegos de tu lista de deseados de Steam automáticamente en un solo clic:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="https://steamcommunity.com/id/tunombre o tu SteamID64"
                  value={wishlistInput}
                  onChange={(e) => {
                    setWishlistInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isLoading}
                  autoFocus
                />
                <span className="caption">
                  Formatos válidos: URL completa de tu perfil, nombre personalizado (vanity) o SteamID de 17 dígitos
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  background: 'var(--bg-surface-secondary)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                }}
              >
                <Info size={16} style={{ flexShrink: 0, marginTop: '1px', color: 'var(--accent-primary)' }} />
                <span>
                  <strong>Nota de privacidad:</strong> Para que Steam permita leer tu lista de deseados, asegúrate de que en los ajustes de privacidad de tu perfil de Steam los <em>"Detalles de los juegos"</em> estén configurados como <em>Público</em>.
                </span>
              </div>

              {errorMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    background: 'rgba(255, 59, 48, 0.08)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(255, 59, 48, 0.2)',
                    color: '#D70015',
                    fontSize: '12px',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {wishlistSummary && (
                <div
                  style={{
                    background: 'rgba(52, 199, 89, 0.08)',
                    border: '1px solid rgba(52, 199, 89, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle2 size={18} color="var(--success-color)" />
                    <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      ¡Lista de deseados procesada con éxito!
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {wishlistSummary.total_found}
                      </div>
                      <div className="caption">En Wishlist</div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success-color)' }}>
                        +{wishlistSummary.imported_count}
                      </div>
                      <div className="caption">Añadidos</div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {wishlistSummary.already_in_library}
                      </div>
                      <div className="caption">Ya existentes</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-sheet-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                {wishlistSummary ? 'Cerrar' : 'Cancelar'}
              </button>
              {wishlistSummary ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onClose}
                >
                  Ver biblioteca actualizada
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading || !wishlistInput.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      <span>Importando deseados de Steam...</span>
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} />
                      <span>Comenzar importación</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
