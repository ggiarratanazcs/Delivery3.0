import React, { useState } from 'react';
import { supabase } from '../supabase.js';
import { RUOLI, RUOLO_COLORS } from '../constants.js';
import { getAvatarColor, getInitials, staffKey, staffLabel } from '../utils.js';

export function ManageStaffModal({ staff, onClose, isAdmin }) {
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = (staff || []).filter(s =>
    staffLabel(s).toLowerCase().includes(search.toLowerCase()) ||
    (s.codice || '').includes(search)
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare collaboratore?')) return;
    await supabase.from('staff').delete().eq('id', id);
    onClose();
  };

  if (editTarget !== null || showNew) {
    return (
      <StaffFormModal
        staff={editTarget}
        isAdmin={isAdmin}
        onClose={() => { setEditTarget(null); setShowNew(false); onClose(); }}
        onBack={() => { setEditTarget(null); setShowNew(false); }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '480px' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>Gestione Risorse</h3>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px' }}>
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
              <path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Cerca risorsa o codice..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', flex: 1, color: '#0f172a' }} />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
            )}
          </div>
          <button onClick={() => setShowNew(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            + Nuova risorsa
          </button>
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '13px' }}>Nessuna risorsa trovata</div>
          )}
          {filtered.map(s => {
            const ac = getAvatarColor(staffLabel(s));
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, border: `1px solid ${ac.text}22` }}>
                  {getInitials(staffLabel(s))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', cursor: 'pointer' }}
                    onClick={() => setEditTarget(s)}>
                    {staffLabel(s)}
                  </div>
                </div>
                <button onClick={() => handleDelete(s.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#94a3b8', flexShrink: 0 }}>🗑️</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function StaffFormModal({ staff: s, onClose, onBack, isAdmin }) {
  const isEdit = !!s;
  const [codice, setCodice] = useState(s?.codice || '');
  const [nome, setNome] = useState(s?.nome || '');
  const [cognome, setCognome] = useState(s?.cognome || '');
  const [ruolo, setRuolo] = useState(s?.ruolo || 'Consulente');
  const [email, setEmail] = useState(s?.email || '');
  const [staffIsAdmin, setStaffIsAdmin] = useState(s?.is_admin || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!codice.trim() || !nome.trim() || !cognome.trim()) {
      setError('Compila tutti i campi obbligatori.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      codice: codice.trim().padStart(3, '0'),
      nome: nome.trim(),
      cognome: cognome.trim(),
      ruolo,
      email: email.trim() || null,
      is_admin: staffIsAdmin,
    };
    if (isEdit) {
      await supabase.from('staff').update(payload).eq('id', s.id);
    } else {
      const { error: err } = await supabase.from('staff').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    onClose();
  };

  const rc = RUOLO_COLORS[ruolo] || RUOLO_COLORS.Consulente;
  const displayName = (nome || 'Nome') + ' ' + (cognome || 'Cognome');
  const avatarColor = nome ? getAvatarColor(displayName) : { bg: '#f1f5f9', text: '#64748b' };

  return (
    <div className="modal-overlay" onClick={onBack}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '420px' }}>
        <button className="btn-close-circle" onClick={onBack}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, border: `1px solid ${avatarColor.text}22` }}>
              {nome && cognome ? getInitials(displayName) : '?'}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{isEdit ? staffLabel(s) : 'Nuova risorsa'}</h3>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>{isEdit ? 'Modifica dati' : 'Inserisci i dati'}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Codice <span style={{ color: '#94a3b8', fontWeight: 400 }}>(numerico, es. 042)</span></label>
            <input placeholder="001" value={codice} maxLength={3}
              onChange={e => setCodice(e.target.value.replace(/\D/g, ''))}
              style={{ width: '100px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nome</label>
              <input placeholder="Mario" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Cognome</label>
              <input placeholder="Rossi" value={cognome} onChange={e => setCognome(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Ruolo</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {RUOLI.map(r => {
                const rc2 = RUOLO_COLORS[r] || RUOLO_COLORS.Consulente;
                const active = ruolo === r;
                return (
                  <div key={r} onClick={() => setRuolo(r)} style={{
                    padding: '7px 16px', borderRadius: '20px', cursor: 'pointer',
                    border: `1px solid ${active ? rc2.border : '#e2e8f0'}`,
                    background: active ? rc2.bg : '#f8fafc',
                    color: active ? rc2.text : '#64748b',
                    fontSize: '13px', fontWeight: active ? 700 : 400,
                    transition: 'all 0.15s', userSelect: 'none',
                  }}>
                    {r}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Email</label>
            <input
              type="email"
              placeholder="mario.rossi@zcscompany.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Toggle Admin — visibile solo agli admin */}
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: staffIsAdmin ? '#fef9c3' : '#f8fafc', borderRadius: '10px', border: `1px solid ${staffIsAdmin ? '#fde68a' : '#e2e8f0'}`, transition: 'all 0.15s', cursor: 'pointer' }}
              onClick={() => setStaffIsAdmin(v => !v)}>
              <div style={{ width: 36, height: 20, borderRadius: '20px', background: staffIsAdmin ? '#f59e0b' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: staffIsAdmin ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: staffIsAdmin ? '#92400e' : '#475569' }}>
                  {staffIsAdmin ? 'Amministratore' : 'Utente standard'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {staffIsAdmin ? 'Accesso completo a tutte le sezioni' : 'Accesso a Pianificazione e Progetti'}
                </div>
              </div>
            </div>
          )}

          {nome && cognome && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: avatarColor.bg, borderRadius: '10px', border: `1px solid ${avatarColor.text}22` }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0, border: `1px solid ${avatarColor.text}33` }}>
                {getInitials(displayName)}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: avatarColor.text }}>{displayName}</div>
                <div style={{ fontSize: '11px', color: rc.text, fontStyle: 'italic' }}>{ruolo} {codice ? `· ${codice.padStart(3, '0')}` : ''}</div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: '#dc2626', fontSize: '12px', padding: '6px 10px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>{error}</div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="btn-cancel" onClick={onBack}>Annulla</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}