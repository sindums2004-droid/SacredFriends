import React from 'react';
import { useAudio } from '../../context/AudioContext.jsx';

export const CompanionModal = ({ companion, isOpen, onClose }) => {
  const { playCompanionSound } = useAudio();

  if (!isOpen || !companion) return null;

  return (
    <div
      id="companion-modal"
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-character-name"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog">
        <button
          type="button"
          id="modal-close-btn"
          className="modal-close-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          &times;
        </button>

        <div className="companion-modal-body">
          <div className="companion-modal-artwork">
            <div className="companion-modal-halo" aria-hidden="true" />
            <img
              id="modal-character-img"
              className="companion-modal-img"
              src={companion.defaultImage}
              alt={`${companion.name} Artwork`}
            />
          </div>

          <div className="companion-modal-info">
            <span
              id="modal-character-tag"
              className="companion-tag"
              style={{ position: 'static', display: 'inline-block', marginBottom: '0.5rem' }}
            >
              {companion.categoryLabel || companion.category}
            </span>
            <h2
              id="modal-character-name"
              className="font-display"
              style={{ fontSize: '1.6rem', color: 'var(--color-warm-ivory)', marginBottom: '0.25rem' }}
            >
              {companion.name}
            </h2>
            <p
              id="modal-character-title"
              style={{ fontSize: '0.88rem', color: 'var(--color-gold-light)', marginBottom: '1rem' }}
            >
              {companion.title}
            </p>

            <p
              id="modal-character-desc"
              style={{ fontSize: '0.92rem', color: 'var(--color-soft-cream)', lineHeight: '1.6', marginBottom: '1rem' }}
            >
              {companion.description || companion.personality}
            </p>

            <div
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid var(--border-gold-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              <div style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                <strong style={{ color: 'var(--color-gold-light)' }}>Personality:</strong> {companion.personality}
              </div>
              <div style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                <strong style={{ color: 'var(--color-gold-light)' }}>Night Action:</strong> {companion.nightAction || 'Tranquil evening meditation'}
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  marginBottom: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <strong style={{ color: 'var(--color-gold-light)' }}>Special Action:</strong>{' '}
                  {companion.specialSoundAction || 'Sacred temple frequency'}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  id="modal-play-sound-btn"
                  onClick={() => playCompanionSound(companion.id)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.72rem',
                    borderColor: 'var(--border-gold-bright)',
                    color: 'var(--color-gold-light)'
                  }}
                >
                  🎵 Play Melodic Frequency
                </button>
              </div>
            </div>

            {companion.reminderReactions && companion.reminderReactions.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-gold-light)',
                    marginBottom: '0.4rem',
                    textTransform: 'uppercase'
                  }}
                >
                  Workday Reminder Reactions:
                </h4>
                <div id="modal-reminders">
                  {companion.reminderReactions.map((rem, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--color-muted-stone)',
                        marginBottom: '0.25rem',
                        lineHeight: 1.4
                      }}
                    >
                      <strong style={{ color: 'var(--color-warm-ivory)' }}>{rem.type}:</strong> {rem.message} —{' '}
                      <em>{rem.action}</em>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {companion.mythologyNote && (
              <p
                id="modal-mythology"
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--color-muted-stone)',
                  fontStyle: 'italic',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  paddingTop: '0.75rem'
                }}
              >
                {companion.mythologyNote}
              </p>
            )}

            <div style={{ marginTop: '1.25rem' }}>
              <a
                href="/api/download/v1"
                className="btn btn-primary btn-sm action-download-v1"
                download
                style={{ width: '100%', textAlign: 'center', display: 'block' }}
              >
                Get Companion in Sacred Friends Free (.exe)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
