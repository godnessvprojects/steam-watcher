import React, { useState } from 'react';
import { Heart, Copy, Check, MessageSquare, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

const DiscordLogo = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 127.14 96.36"
    fill="currentColor"
    style={{ display: 'block', flexShrink: 0 }}
  >
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
  </svg>
);

export const CreditsView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyDiscord = () => {
    navigator.clipboard.writeText('@zzgodness');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinDiscord = () => {
    api.openSteamUrl('https://discord.gg/tPP2yE4X5Y');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '680px', margin: '20px auto 0 auto' }}>
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
        }}
      >
        {/* Avatar / Icon Badge */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, #1D1D1F 0%, #3A3A3C 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          }}
        >
          <Sparkles size={34} strokeWidth={1.8} />
        </div>

        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Steam Watcher
          </h2>
          <span className="caption" style={{ marginTop: '2px', display: 'inline-block' }}>
            Versión 1.0.0 Oficial
          </span>
        </div>

        {/* Creator Info Box */}
        <div
          style={{
            width: '100%',
            background: 'var(--bg-surface-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginTop: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Heart size={16} color="var(--sale-badge-text)" />
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Creado por GodNess (ESP)
            </span>
          </div>

          {/* Servidor Oficial de Discord */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.15) 0%, rgba(88, 101, 242, 0.05) 100%)',
              border: '1px solid rgba(88, 101, 242, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: '#5865F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(88, 101, 242, 0.35)',
                }}
              >
                <DiscordLogo size={20} />
              </div>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                  Servidor Oficial de Discord
                </span>
                <span className="caption" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Comunidad, alertas de ofertas en vivo y soporte
                </span>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleJoinDiscord}
              style={{
                background: '#5865F2',
                color: '#ffffff',
                fontSize: '12.5px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <DiscordLogo size={16} />
              <span>Unirme al Discord</span>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Contacto Directo por Discord */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={17} color="var(--accent-primary)" />
              <div style={{ textAlign: 'left' }}>
                <span className="caption" style={{ display: 'block', fontSize: '11px' }}>
                  Discord de Contacto Directo
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  @zzgodness
                </span>
              </div>
            </div>

            <button
              className="btn-secondary"
              onClick={handleCopyDiscord}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              {copied ? (
                <>
                  <Check size={14} color="var(--success-color)" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copiar usuario
                </>
              )}
            </button>
          </div>
        </div>

        {/* Philosophy Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            marginTop: '8px',
          }}
        >
          <ShieldCheck size={14} color="var(--success-color)" />
          <span>Monitor nativo de alta precisión para Steam sin recopilación de datos privados</span>
        </div>
      </div>
    </div>
  );
};
