import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { REPARTI_STANDARD, SKILLS_FOLDERS, DEFAULT_SKILLS } from '../constants.js';
import { getAvatarColor, getInitials, staffKey, staffLabel, workingDays } from '../utils.js';
import { ProdottiSelector, ProdottiBadges } from './ProdottiSelector.jsx';
import { creaTaskStandard } from './ProgettiView.jsx';
import * as XLSX from 'xlsx';

export function ProjectModal({ staff, clients, matrix, targetedEdit, onClose, onOpenProgetto }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCommessaId, setSelectedCommessaId] = useState('');
  const [f, setF] = useState({
    nome_commessa: '',
    pm_commessa: '',
    team: [],
    data_inizio: '',
    data_fine: '',
    attiva: true,
  });
  const [isEdit, setIsEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progettoId, setProgettoId] = useState(null);
  const [checkingProgetto, setCheckingProgetto] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Bolle
  const [bolleDisponibili, setBolleDisponibili] = useState([]);
  const [bolleAssociate, setBolleAssociate] = useState([]);

  useEffect(() => {
    if (targetedEdit) {
      setSelectedClientId(targetedEdit.clientId);
      setSelectedCommessaId(targetedEdit.commessaId || '');
    }
  }, [targetedEdit]);

  const pms = staff.filter((s) => s.ruolo === 'PM');
  const availableCommesse = clients.find((c) => c.id === selectedClientId)?.commesse || [];

  // Carica bolle quando cambia il cliente
  useEffect(() => {
    if (!selectedClientId) { setBolleDisponibili([]); return; }
    const client = clients.find(c => c.id === selectedClientId);
    if (!client?.codice_cliente) { setBolleDisponibili([]); return; }
    supabase.from('bolle_lavoro')
      .select('*')
      .eq('codice_cliente', client.codice_cliente)
      .then(({ data }) => setBolleDisponibili(data || []));
  }, [selectedClientId]);

  useEffect(() => {
    if (selectedCommessaId) {
      const comm = availableCommesse.find((c) => c.id === selectedCommessaId);
      if (comm) {
        setF({
          nome_commessa: comm.nome_commessa,
          pm_commessa: comm.pm_commessa || '',
          team: comm.team || [],
          data_inizio: comm.data_inizio || '',
          data_fine: comm.data_fine || '',
          attiva: comm.attiva !== false,
        });
        setIsEdit(true);
        setCheckingProgetto(true);
        supabase.from('progetti').select('id').eq('commessa_id', selectedCommessaId).single()
          .then(({ data }) => { setProgettoId(data?.id || null); setCheckingProgetto(false); });
        // Carica bolle già associate a questa commessa
        supabase.from('bolle_lavoro').select('id').eq('commessa_id', selectedCommessaId)
          .then(({ data }) => setBolleAssociate((data || []).map(b => b.id)));
      }
    } else {
      setF({ nome_commessa: '', pm_commessa: '', team: [], data_inizio: '', data_fine: '', attiva: true });
      setIsEdit(false);
      setProgettoId(null);
      setBolleAssociate([]);
    }
  }, [selectedCommessaId, selectedClientId]);

  const toggleBolla = (bollaId) => {
    setBolleAssociate(prev =>
      prev.includes(bollaId) ? prev.filter(id => id !== bollaId) : [...prev, bollaId]
    );
  };

  const handleChiudi = async () => {
    if (!window.confirm('Chiudere questa commessa?\n\nViene impostata come inattiva con data chiusura odierna.\nSe esiste un progetto collegato verrà bloccato in sola lettura.')) return;
    setIsClosing(true);
    const oggi = new Date().toISOString().slice(0, 10);
    try {
      await supabase.from('commesse').update({ attiva: false, data_fine: oggi, data_chiusura: oggi }).eq('id', selectedCommessaId);
      if (progettoId) await supabase.from('progetti').update({ chiuso: true }).eq('id', progettoId);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsClosing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClientId || !f.nome_commessa) return;
    setIsSaving(true);
    try {
      let commId = selectedCommessaId;
      const payload = {
        client_id: selectedClientId,
        nome_commessa: f.nome_commessa.trim(),
        pm_commessa: f.pm_commessa || null,
        data_inizio: f.data_inizio || null,
        data_fine: f.data_fine || null,
        attiva: f.attiva,
      };
      if (isEdit)
        await supabase.from('commesse').update(payload).eq('id', commId);
      else {
        const { data } = await supabase.from('commesse').insert(payload).select().single();
        commId = data.id;
      }

      // Team
      await supabase.from('project_team').delete().eq('commessa_id', commId);
      if (f.team.length > 0)
        await supabase.from('project_team').insert(f.team.map((t) => ({ commessa_id: commId, staff_name: t })));

      // Bolle — disassocia tutte poi associa quelle selezionate
      await supabase.from('bolle_lavoro').update({ commessa_id: null }).eq('commessa_id', commId);
      if (bolleAssociate.length > 0) {
        await supabase.from('bolle_lavoro').update({ commessa_id: commId }).in('id', bolleAssociate);
      }

      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '900px' }}>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>{isEdit ? 'Modifica Commessa' : 'Nuova Commessa'}</h3>
          <button className="btn-close-circle" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>

          {/* Colonna 1 — Dati commessa */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div className="form-group">
              <label>Cliente</label>
              <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}
                disabled={targetedEdit && targetedEdit.clientId && targetedEdit.commessaId === ''}>
                <option value="">Scegli...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome_progetto}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Commessa</label>
              <select value={selectedCommessaId} onChange={(e) => setSelectedCommessaId(e.target.value)} disabled={!selectedClientId}>
                <option value="">-- Nuova --</option>
                {availableCommesse.map((co) => (
                  <option key={co.id} value={co.id}>{co.nome_commessa}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nome</label>
              <input value={f.nome_commessa} onChange={(e) => setF({ ...f, nome_commessa: e.target.value })} />
            </div>
            <div className="form-group">
              <label>PM</label>
              <select value={f.pm_commessa} onChange={(e) => setF({ ...f, pm_commessa: e.target.value })}>
                <option value="">Scegli...</option>
                {pms.map((s) => <option key={staffKey(s)} value={staffKey(s)}>{staffLabel(s)}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Inizio</label>
                <input type="date" value={f.data_inizio} onChange={(e) => setF({ ...f, data_inizio: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Fine</label>
                <input type="date" value={f.data_fine} onChange={(e) => setF({ ...f, data_fine: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Colonna 2 — Team */}
          <div>
            <label className="label-title">Team</label>
            <div className="team-selection-grid" style={{ marginTop: '8px' }}>
              {staff.map((s) => {
                const sKey = staffKey(s);
                return (
                  <label key={sKey} className={`team-chip ${f.team.includes(sKey) ? 'active' : ''}`}>
                    <input type="checkbox" checked={f.team.includes(sKey)}
                      onChange={() => setF({ ...f, team: f.team.includes(sKey) ? f.team.filter((x) => x !== sKey) : [...f.team, sKey] })}
                    />{' '}{staffLabel(s)}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Colonna 3 — Bolle */}
          <div>
            <label className="label-title">
              Bolle associate
              {bolleDisponibili.length > 0 && (
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>
                  {bolleAssociate.length}/{bolleDisponibili.length} selezionate
                </span>
              )}
            </label>

            {!selectedClientId ? (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                Seleziona un cliente per vedere le bolle disponibili
              </div>
            ) : bolleDisponibili.length === 0 ? (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                Nessuna bolla disponibile per questo cliente
              </div>
            ) : (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                {bolleDisponibili.map(b => {
                  const isSelected = bolleAssociate.includes(b.id);
                  const giorniDisp = b.ore_previste ? (b.ore_previste / 8).toFixed(1) : (b.giorni_disponibili || 0).toFixed(1);
                  return (
                    <div key={b.id} onClick={() => toggleBolla(b.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                        border: `1px solid ${isSelected ? '#bfdbfe' : '#e2e8f0'}`,
                        background: isSelected ? '#eff6ff' : '#f8fafc',
                        transition: 'all 0.15s',
                      }}
                      onMouseOver={e => { if (!isSelected) { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderColor = '#bfdbfe'; } }}
                      onMouseOut={e => { if (!isSelected) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}
                    >
                      {/* Checkbox visuale */}
                      <div style={{
                        width: 16, height: 16, borderRadius: '4px', flexShrink: 0,
                        border: `2px solid ${isSelected ? '#0054a6' : '#cbd5e1'}`,
                        background: isSelected ? '#0054a6' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
                      </div>

                      {/* Codice bolla */}
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: isSelected ? '#0054a6' : '#475569', flexShrink: 0 }}>
                        {b.codice}
                      </span>

                      {/* Descrizione */}
                      <span style={{ fontSize: '11px', color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.descrizione || '—'}
                      </span>

                      {/* Giorni disponibili */}
                      <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#0054a6' : '#94a3b8', flexShrink: 0 }}>
                        {giorniDisp}g
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          {isEdit && selectedCommessaId && (
            <button
              onClick={async () => {
                if (progettoId) {
                  onOpenProgetto && onOpenProgetto(progettoId, selectedCommessaId);
                  onClose();
                } else {
                  const { data: newProg } = await supabase.from('progetti')
                    .insert({ commessa_id: selectedCommessaId, creato_da: f.pm_commessa })
                    .select().single();
                  if (newProg) {
                    await creaTaskStandard(newProg.id);
                    setProgettoId(newProg.id);
                    onOpenProgetto && onOpenProgetto(newProg.id, selectedCommessaId);
                    onClose();
                  }
                }
              }}
              disabled={checkingProgetto}
              style={{
                marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 18px', borderRadius: '10px', border: '1px solid',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                ...(progettoId
                  ? { background: '#f0fdf4', borderColor: '#22c55e', color: '#16a34a' }
                  : { background: '#eff6ff', borderColor: '#bfdbfe', color: '#0054a6' }),
              }}
            >
              {checkingProgetto ? '...' : progettoId ? '📂 Apri Progetto' : '🚀 Genera Progetto'}
            </button>
          )}
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          {isEdit && selectedCommessaId && f.attiva && (
            <button onClick={handleChiudi} disabled={isClosing}
              style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              {isClosing ? 'Chiusura...' : '🔒 Chiudi commessa'}
            </button>
          )}
          {isEdit && selectedCommessaId && !f.attiva && (
            <button onClick={async () => {
              if (!window.confirm('Riaprire questa commessa?')) return;
              await supabase.from('commesse').update({ attiva: true, data_chiusura: null }).eq('id', selectedCommessaId);
              if (progettoId) await supabase.from('progetti').update({ chiuso: false }).eq('id', progettoId);
              setF(p => ({ ...p, attiva: true }));
            }} style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              🔓 Riapri commessa
            </button>
          )}
          {isEdit && !f.attiva && (
            <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
              Commessa chiusa
            </div>
          )}
          <button className="btn-save" onClick={handleSave} disabled={isSaving || !f.attiva}>Salva</button>
        </div>
      </div>
    </div>
  );
}

export function ManageSkillsModal({ skillsConfig, setSkillsConfig, onClose }) {
  const [activeTab, setActiveTab] = useState(SKILLS_FOLDERS[0]);
  const [newSkill, setNewSkill] = useState('');
  const [isPending, setIsPending] = useState(false);

  const addSkill = async () => {
    if (!newSkill.trim() || isPending) return;
    setIsPending(true);
    const name = newSkill.trim();
    const { error } = await supabase.from('skills_settings').insert({ category: activeTab, skill_name: name });
    if (error) { alert('Errore DB: ' + error.message); }
    else { setSkillsConfig((prev) => ({ ...prev, [activeTab]: [...(prev[activeTab] || []), name] })); setNewSkill(''); }
    setIsPending(false);
  };

  const removeSkill = async (skill) => {
    if (!window.confirm('Eliminare?')) return;
    const { error } = await supabase.from('skills_settings').delete().eq('category', activeTab).eq('skill_name', skill);
    if (!error) setSkillsConfig((prev) => ({ ...prev, [activeTab]: prev[activeTab].filter((s) => s !== skill) }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>Gestione Skills</h3>
          <button className="btn-close-circle" onClick={onClose}>×</button>
        </div>
        <div className="folder-tabs" style={{ marginBottom: '15px' }}>
          {SKILLS_FOLDERS.map((f) => (
            <button key={f} className={activeTab === f ? 'active' : ''} onClick={() => setActiveTab(f)}>{f}</button>
          ))}
        </div>
        <div className="form-group">
          <label>Nuova voce in {activeTab}</label>
          <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
            <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
            <button className="btn-add-styled" onClick={addSkill}>{isPending ? '...' : '+'}</button>
          </div>
        </div>
        <div className="staff-scroll" style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '15px' }}>
          {skillsConfig[activeTab]?.map((s) => (
            <div key={s} className="staff-manage-row">
              <span>{s}</span>
              <button onClick={() => removeSkill(s)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>🗑️</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClientModal({ staff, matrix, onClose }) {
  const [n, setN] = useState('');
  const [codice, setCodice] = useState('');
  const [p, setP] = useState('');
  const [prodotti, setProdotti] = useState([]);
  const [errCodice, setErrCodice] = useState('');
  const pms = staff.filter((s) => s.ruolo === 'PM');
  const avatarColor = p ? getAvatarColor(p) : null;

  const handleCodice = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 8);
    setCodice(cleaned);
    setErrCodice('');
  };

  const handleSave = async () => {
    if (!n.trim()) return;
    if (!codice || codice.length !== 8) {
      setErrCodice('Il codice gestionale è obbligatorio (8 cifre).');
      return;
    }
    await supabase.from('projects').insert({
      nome_progetto: n.trim(),
      pm_name: p || null,
      prodotti,
      codice_cliente: codice,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>Nuovo Cliente</h3>
          <button className="btn-close-circle" onClick={onClose}>×</button>
        </div>
        <div className="modal-grid">
          <div className="modal-left">
            <div className="form-group">
              <label>Nome cliente</label>
              <input placeholder="Ragione sociale..." onChange={(e) => setN(e.target.value)} />
            </div>
            <div className="form-group">
              <label>
                Codice gestionale
                <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600, marginLeft: 6 }}>* obbligatorio</span>
              </label>
              <input
                placeholder="es. 00012345"
                value={codice}
                onChange={e => handleCodice(e.target.value)}
                style={{ fontFamily: 'monospace', letterSpacing: '0.1em', ...(errCodice ? { borderColor: '#fca5a5' } : {}) }}
                maxLength={8}
              />
              {errCodice && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: 4 }}>{errCodice}</div>}
              {codice.length > 0 && codice.length < 8 && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>{codice.length}/8 cifre</div>
              )}
            </div>
            <div className="form-group">
              <label>Project Manager</label>
              <select value={p} onChange={(e) => setP(e.target.value)}>
                <option value="">— nessuno —</option>
                {pms.map((s) => <option key={staffKey(s)} value={staffKey(s)}>{staffLabel(s)}</option>)}
              </select>
            </div>
            {p && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', marginTop: '4px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor?.bg, color: avatarColor?.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(p)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0C447C' }}>{p}</div>
                  <div style={{ fontSize: '11px', color: '#185FA5', fontStyle: 'italic' }}>Project Manager</div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-right">
            <label className="label-title" style={{ marginBottom: '14px', display: 'block' }}>Prodotti posseduti</label>
            <ProdottiSelector prodotti={prodotti} onChange={setProdotti} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={handleSave}>Salva</button>
        </div>
      </div>
    </div>
  );
}

export function EditClientModal({ client, staff, matrix, clients, onClose }) {
  const [pm, setPm] = useState(client.pm_name || '');
  const [codice, setCodice] = useState(client.codice_cliente || '');
  const [prodotti, setProdotti] = useState(client.prodotti || []);
  const [saving, setSaving] = useState(false);
  const [errCodice, setErrCodice] = useState('');
  const [commSearch, setCommSearch] = useState('');
  const [soloAttive, setSoloAttive] = useState(true);
  const [subModal, setSubModal] = useState(null);

  const pms = staff.filter((s) => s.ruolo === 'PM');
  const avatarColor = pm ? getAvatarColor(pm) : null;

  const commesse = client.commesse || [];
  const filteredComm = commesse
    .filter(co => !soloAttive || co.attiva !== false)
    .filter(co => co.nome_commessa.toLowerCase().includes(commSearch.toLowerCase()));

  const handleCodice = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 8);
    setCodice(cleaned);
    setErrCodice('');
  };

  const handleSave = async () => {
    if (!codice || codice.length !== 8) {
      setErrCodice('Il codice gestionale è obbligatorio (8 cifre).');
      return;
    }
    setSaving(true);
    await supabase.from('projects').update({
      pm_name: pm || null,
      prodotti,
      codice_cliente: codice,
    }).eq('id', client.id);
    setSaving(false);
    onClose();
  };

  if (subModal !== null) {
    return (
      <ProjectModal
        staff={staff} clients={clients} matrix={matrix}
        targetedEdit={subModal === 'new'
          ? { clientId: client.id, commessaId: '' }
          : { clientId: client.id, commessaId: subModal }}
        onClose={async () => {
          const { data: commData } = await supabase.from('commesse').select('*');
          const { data: tData } = await supabase.from('project_team').select('*');
          const freshComm = (commData || [])
            .filter(co => co.client_id === client.id)
            .map(co => ({ ...co, team: (tData || []).filter(t => t.commessa_id === co.id).map(t => t.staff_name) }));
          client.commesse = freshComm;
          setSubModal(null);
        }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe' }}>
              <svg width="18" height="18" viewBox="0 0 38 38" fill="none"><rect x="5" y="14" width="28" height="20" rx="2" stroke="#185FA5" strokeWidth="2"/><path d="M13 14V9a2 2 0 012-2h8a2 2 0 012 2v5" stroke="#185FA5" strokeWidth="2"/><rect x="10" y="20" width="5" height="5" rx="1" stroke="#185FA5" strokeWidth="1.5"/><rect x="23" y="20" width="5" height="5" rx="1" stroke="#185FA5" strokeWidth="1.5"/><rect x="16" y="22" width="6" height="12" rx="1" stroke="#185FA5" strokeWidth="1.5"/></svg>
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{client.nome_progetto}</h3>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>
                Modifica cliente
                {client.codice_cliente && (
                  <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', border: '0.5px solid #e2e8f0' }}>
                    {client.codice_cliente}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="btn-close-circle" onClick={onClose}>×</button>
        </div>

        <div className="modal-grid">
          <div className="modal-left" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

            {/* Codice gestionale */}
            <div className="form-group">
              <label>
                Codice gestionale
                <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600, marginLeft: 6 }}>* obbligatorio</span>
              </label>
              <input
                placeholder="es. 00012345"
                value={codice}
                onChange={e => handleCodice(e.target.value)}
                style={{ fontFamily: 'monospace', letterSpacing: '0.1em', ...(errCodice ? { borderColor: '#fca5a5' } : {}) }}
                maxLength={8}
              />
              {errCodice && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: 4 }}>{errCodice}</div>}
              {codice.length > 0 && codice.length < 8 && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>{codice.length}/8 cifre</div>
              )}
            </div>

            {/* PM */}
            <div className="form-group">
              <label>Project Manager</label>
              <select value={pm} onChange={(e) => setPm(e.target.value)}>
                <option value="">— nessuno —</option>
                {pms.map((s) => <option key={staffKey(s)} value={staffKey(s)}>{staffLabel(s)}</option>)}
              </select>
            </div>
            {pm && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor?.bg, color: avatarColor?.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(pm)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0C447C' }}>{pm}</div>
                  <div style={{ fontSize: '11px', color: '#185FA5', fontStyle: 'italic' }}>Project Manager</div>
                </div>
              </div>
            )}

            {/* Commesse */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>Commesse</label>
                <button onClick={() => setSoloAttive(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', border: '1px solid', fontSize: '11px', fontWeight: 600, cursor: 'pointer', ...(soloAttive ? { background: '#f0fdf4', borderColor: '#22c55e', color: '#16a34a' } : { background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }) }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {soloAttive && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', display: 'block' }} />}
                  </span>
                  Solo attive
                </button>
                <button onClick={() => setSubModal('new')}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                  + Nuova
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 10px', marginBottom: '8px' }}>
                <svg width="12" height="12" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
                  <path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input type="text" placeholder="Cerca commessa..." value={commSearch} onChange={e => setCommSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', flex: 1, color: '#0f172a' }} />
                {commSearch && <button onClick={() => setCommSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>}
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredComm.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>Nessuna commessa</div>
                )}
                {filteredComm.map(co => (
                  <div key={co.id} onClick={() => setSubModal(co.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff', transition: 'all 0.15s' }}
                    onMouseOver={e => { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: co.attiva !== false ? '#22c55e' : '#94a3b8' }} />
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a', flex: 1 }}>{co.nome_commessa}</span>
                    {co.pm_commessa && <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>{co.pm_commessa}</span>}
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-right">
            <label className="label-title" style={{ marginBottom: '14px', display: 'block' }}>Prodotti posseduti</label>
            <ProdottiSelector prodotti={prodotti} onChange={setProdotti} />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
        </div>
      </div>
    </div>
  );
}

export function ManageClientsModal({ clients, onClose, onEdit }) {
  const [search, setSearch] = useState('');

  const handleDelete = async (id) => {
    if (window.confirm('Eliminare cliente?')) {
      await supabase.from('projects').delete().eq('id', id);
      onClose();
    }
  };

  const filtered = clients.filter(c =>
    c.nome_progetto.toLowerCase().includes(search.toLowerCase()) ||
    (c.codice_cliente || '').includes(search)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>Anagrafica Clienti</h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '7px 12px', marginBottom: '14px' }}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input type="text" placeholder="Cerca cliente o codice..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', flex: 1, color: '#0f172a' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>}
        </div>

        <div className="staff-scroll" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '13px' }}>Nessun cliente trovato</div>
          )}
          {filtered.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f1f5f9', gap: '8px' }}>
              {c.codice_cliente && (
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8', background: '#f8fafc', padding: '1px 6px', borderRadius: '4px', border: '0.5px solid #e2e8f0', flexShrink: 0 }}>
                  {c.codice_cliente}
                </span>
              )}
              <span style={{ fontWeight: 600, cursor: 'pointer', color: '#2563eb', flex: 1, fontSize: '13px' }} onClick={() => onEdit(c)}>
                {c.nome_progetto}
              </span>
              {c.pm_name && (
                <span style={{ fontSize: '11px', color: '#64748b', marginRight: '10px', fontStyle: 'italic' }}>{c.pm_name}</span>
              )}
              <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ImportExcelModal({ onClose }) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImporting(true);
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname], { header: 1 });
        const rows = data.slice(1).filter(r => r.length >= 2 && r[1]);

        const records = rows.map(row => ({
          codice_cliente: row[0] ? String(row[0]).trim().replace(/\D/g, '').slice(0, 8) : null,
          nome_progetto: String(row[1] || '').trim(),
          pm_name: row[2] ? String(row[2]).trim() : null,
        })).filter(r => r.nome_progetto);

        const chunkSize = 500;
        const total = records.length;
        for (let i = 0; i < total; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          const { error } = await supabase.from('projects').insert(chunk);
          if (error) { alert('Errore importazione: ' + error.message); return; }
          setProgress(`Importati ${Math.min(i + chunkSize, total)} di ${total} clienti...`);
        }
        onClose();
      } finally {
        setImporting(false);
        setProgress('');
      }
    };
    reader.readAsBinaryString(file);
  };

  const cols = [
    { col: 'A', nome: 'Codice gestionale', fmt: '8 cifre (opzionale)' },
    { col: 'B', nome: 'Cliente', fmt: 'ragione sociale' },
    { col: 'C', nome: 'PM', fmt: 'nome PM (opzionale)' },
  ];

  return (
    <div className="modal-overlay" onClick={importing ? undefined : onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '360px' }}>
        <button className="btn-close-circle" onClick={importing ? undefined : onClose} style={{ opacity: importing ? 0.3 : 1 }}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>Importa clienti da Excel</h3>
        </div>

        <div style={{ background: '#1e3a5f', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Struttura file Excel</div>
          {cols.map(r => (
            <div key={r.col} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '5px', padding: '2px 7px', fontFamily: 'monospace', flexShrink: 0, minWidth: 22, textAlign: 'center' }}>{r.col}</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff', flex: 1 }}>{r.nome}</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{r.fmt}</span>
            </div>
          ))}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
            La prima riga viene ignorata (intestazioni)
          </div>
        </div>

        {importing ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '13px', color: '#0054a6', fontWeight: 600, marginBottom: 8 }}>Importazione in corso...</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{progress}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '20px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              ⬆ Scegli file Excel
              <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}