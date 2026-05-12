import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { PRIORITA_COLORS, COL_COLORS } from '../constants.js';
import { staffKey, staffLabel, getAvatarColor, getInitials } from '../utils.js';
import { MultiPillFilter } from './MultiPillFilter.jsx';
import { HamburgerIcon } from './HamburgerIcon.jsx';
import { useIsMobile } from './DesktopOnly.jsx';

export function TodoView({ staff, clients }) {
  const [workflows, setWorkflows] = useState([]);
  const [colonne, setColonne] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showWfModal, setShowWfModal] = useState(false);
  const [showColModal, setShowColModal] = useState(false);
  const [showWfEditor, setShowWfEditor] = useState(false);
  const [showSidebarTodo, setShowSidebarTodo] = useState(false);
  const [transizioni, setTransizioni] = useState([]);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [targetColId, setTargetColId] = useState(null);

  const [dragCard, setDragCard] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const isMobile = useIsMobile();

  useEffect(() => { loadTodo(); }, []);

  const loadTodo = async () => {
    setLoading(true);
    const { data: wf } = await supabase.from('workflows').select('*').order('created_at');
    const { data: col } = await supabase.from('workflow_colonne').select('*').order('ordine');
    const { data: att } = await supabase.from('attivita').select('*').order('ordine');
    const { data: trans } = await supabase.from('workflow_transizioni').select('*');
    setWorkflows(wf || []);
    setColonne(col || []);
    setAttivita(att || []);
    setTransizioni(trans || []);
    if (wf && wf.length > 0 && !selectedWorkflow) setSelectedWorkflow(wf[0].id);
    setLoading(false);
  };

  const isTransizioneConsentita = (daColId, aColId) => {
    if (!daColId) return true;
    if (daColId === aColId) return false;
    return transizioni.some(t => t.da_colonna_id === daColId && t.a_colonna_id === aColId);
  };

  const currentColonne = colonne.filter(c => c.workflow_id === selectedWorkflow);
  const currentAttivita = attivita.filter(a => a.workflow_id === selectedWorkflow);

  const onDragStart = (card) => setDragCard(card);

  const onDragEnd = () => {
    setDragCard(null);
    setDragOver(null);
  };

  const onDragOver = (e, colId) => {
    if (dragCard && !isTransizioneConsentita(dragCard.colonna_id, colId)) return;
    e.preventDefault();
    setDragOver(colId);
  };

  const onDrop = async (e, colId) => {
    e.preventDefault();
    if (!dragCard || dragCard.colonna_id === colId) { setDragCard(null); setDragOver(null); return; }
    if (!isTransizioneConsentita(dragCard.colonna_id, colId)) {
      const fromCol = currentColonne.find(c => c.id === dragCard.colonna_id);
      const toCol = currentColonne.find(c => c.id === colId);
      alert(`Transizione non consentita: "${fromCol?.nome || '—'}" → "${toCol?.nome || '—'}"\n\nConfigura le transizioni nell'editor del workflow.`);
      setDragCard(null); setDragOver(null); return;
    }
    const updated = { ...dragCard, colonna_id: colId };
    setAttivita(prev => prev.map(a => a.id === dragCard.id ? updated : a));
    await supabase.from('attivita').update({ colonna_id: colId }).eq('id', dragCard.id);
    setDragCard(null); setDragOver(null);
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
      Caricamento...
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>

      {/* ── TOOLBAR ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: isMobile ? '10px 12px' : '10px 24px',
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        <button className="menu-trigger-inline" onClick={() => setShowSidebarTodo(true)}>
          <HamburgerIcon />
        </button>

        {isMobile ? (
          <select
            value={selectedWorkflow || ''}
            onChange={e => setSelectedWorkflow(e.target.value || null)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              border: '1.5px solid #e2e8f0', background: '#f8fafc',
              fontSize: '14px', fontWeight: 600, color: '#0054a6',
              outline: 'none', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%230054a6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
            }}
          >
            <option value="">Seleziona workflow...</option>
            {workflows.map(wf => (
              <option key={wf.id} value={wf.id}>{wf.nome}</option>
            ))}
          </select>
        ) : (
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '2px' }}>
            {workflows.map(wf => (
              <button key={wf.id} onClick={() => setSelectedWorkflow(wf.id)}
                style={{
                  padding: '5px 14px', borderRadius: '7px', border: 'none', fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: selectedWorkflow === wf.id ? '#fff' : 'transparent',
                  color: selectedWorkflow === wf.id ? '#0054a6' : '#64748b',
                  fontWeight: selectedWorkflow === wf.id ? 600 : 400,
                  boxShadow: selectedWorkflow === wf.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >{wf.nome}</button>
            ))}
          </div>
        )}

        {selectedWorkflow && (
          <button
            onClick={() => { setEditCard(null); setTargetColId(currentColonne[0]?.id || null); setShowCardModal(true); }}
            style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: isMobile ? '7px 12px' : '7px 18px',
              borderRadius: '20px', border: '1px solid #bfdbfe', background: '#eff6ff',
              color: '#0054a6', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#dbeafe'}
            onMouseOut={e => e.currentTarget.style.background = '#eff6ff'}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            {!isMobile && ' Nuova attività'}
          </button>
        )}
      </div>

      {/* ── SIDEBAR ── */}
      <div className={`sidebar-overlay ${showSidebarTodo ? 'active' : ''}`} onClick={() => setShowSidebarTodo(false)}>
        <div className="sidebar-content" onClick={e => e.stopPropagation()}>
          <div className="sidebar-header">
            <h3>Gestione To Do</h3>
            <button className="btn-close-circle" onClick={() => setShowSidebarTodo(false)}>×</button>
          </div>
          <div className="sidebar-body">
            <button className="sidebar-item" onClick={() => { setShowWfModal(true); setShowSidebarTodo(false); }}>
              ➕ Nuovo workflow
            </button>
            {selectedWorkflow && (
              <>
                <button className="sidebar-item" onClick={() => { setShowColModal(true); setShowSidebarTodo(false); }}>
                  📋 Aggiungi colonna
                </button>
                <button className="sidebar-item" onClick={() => { setShowWfEditor(true); setShowSidebarTodo(false); }}>
                  ⚙️ Configura workflow
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── BOARD KANBAN ── */}
      {!selectedWorkflow ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>
          Crea o seleziona un workflow per iniziare
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px 12px' : '24px', background: '#f8fafc', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', gap: isMobile ? '12px' : '20px', alignItems: 'flex-start', minWidth: 'max-content' }}>

            {currentColonne.map(col => {
              const cards = currentAttivita.filter(a => a.colonna_id === col.id).sort((a, b) => a.ordine - b.ordine);
              const isDragTarget = dragOver === col.id;
              const isDragBlocked = dragCard && dragCard.colonna_id !== col.id && !isTransizioneConsentita(dragCard.colonna_id, col.id);

              return (
                <div key={col.id}
                  onDragOver={(e) => onDragOver(e, col.id)}
                  onDrop={(e) => onDrop(e, col.id)}
                  style={{
                    minWidth: isMobile ? '200px' : '230px',
                    maxWidth: isMobile ? '200px' : '230px',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    opacity: isDragBlocked ? 0.35 : 1, transition: 'opacity 0.15s',
                  }}>

                  {/* Header colonna */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    paddingBottom: '10px',
                    borderBottom: `2px solid ${isDragBlocked ? '#e2e8f0' : isDragTarget ? '#3b82f6' : col.colore}`,
                    transition: 'border-color 0.15s',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>{col.nome}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', background: '#f1f5f9', padding: '1px 8px', borderRadius: '20px', fontWeight: 500 }}>{cards.length}</span>
                    <button onClick={() => { setEditCard(null); setTargetColId(col.id); setShowCardModal(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', lineHeight: 1, padding: '0 2px' }} title="Aggiungi attività">+</button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Eliminare la colonna "${col.nome}"? Le attività non saranno eliminate.`)) return;
                        await supabase.from('workflow_colonne').delete().eq('id', col.id);
                        loadTodo();
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '13px', lineHeight: 1, padding: '0 2px', transition: 'color 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}
                      title="Elimina colonna">🗑</button>
                  </div>

                  {/* Cards */}
                  {cards.map(card => {
                    const staffObj = staff.find(s => staffKey(s) === card.assegnata_a);
                    const clientObj = clients.find(c => c.id === card.cliente_id);
                    const ac = staffObj ? getAvatarColor(staffLabel(staffObj)) : null;
                    const pCol = PRIORITA_COLORS[card.priorita] || PRIORITA_COLORS.media;
                    return (
                      <div key={card.id}
                        draggable
                        onDragStart={() => onDragStart(card)}
                        onDragEnd={onDragEnd}
                        onClick={() => { setEditCard(card); setTargetColId(card.colonna_id); setShowCardModal(true); }}
                        style={{
                          background: '#fff', borderRadius: '10px', padding: '12px 14px',
                          border: '0.5px solid #e2e8f0', borderLeft: `3px solid ${col.colore}`,
                          cursor: 'grab',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)',
                          transition: 'box-shadow 0.15s, transform 0.12s',
                          opacity: dragCard?.id === card.id ? 0.4 : 1,
                        }}
                        onMouseOver={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <p style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', margin: '0 0 10px', lineHeight: 1.4 }}>{card.titolo}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: pCol.bg, color: pCol.text, fontWeight: 500, border: `0.5px solid ${pCol.border}` }}>{card.priorita}</span>
                          {clientObj && (
                            <span style={{ fontSize: '10px', color: '#64748b', background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {clientObj.nome_progetto}
                            </span>
                          )}
                          {card.scadenza && (
                            <span style={{ fontSize: '10px', color: new Date(card.scadenza) < new Date() ? '#dc2626' : '#94a3b8', marginLeft: 'auto' }}>
                              {new Date(card.scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                          {ac && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, flexShrink: 0, marginLeft: card.scadenza ? '0' : 'auto', border: `0.5px solid ${ac.text}33` }} title={staffLabel(staffObj)}>
                              {getInitials(staffLabel(staffObj))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {cards.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '12px', padding: '24px 0', fontStyle: 'italic', border: '1px dashed #e2e8f0', borderRadius: '10px' }}>
                      nessuna attività
                    </div>
                  )}
                </div>
              );
            })}

            {currentColonne.length === 0 && (
              <div style={{ minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #e2e8f0', borderRadius: '12px', padding: '40px 20px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
                onClick={() => setShowColModal(true)}>
                + Aggiungi colonna
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALI */}
      {showWfEditor && selectedWorkflow && (
        <WfEditorModal
          workflowId={selectedWorkflow}
          workflowNome={workflows.find(w => w.id === selectedWorkflow)?.nome}
          onClose={() => { setShowWfEditor(false); loadTodo(); }}
          onDelete={async () => {
            setShowWfEditor(false);
            setSelectedWorkflow(null);
            loadTodo();
          }}
        />
      )}
      {showWfModal && <WfModal onClose={() => { setShowWfModal(false); loadTodo(); }} />}
      {showColModal && selectedWorkflow && <ColModal workflowId={selectedWorkflow} onClose={() => { setShowColModal(false); loadTodo(); }} />}
      {showCardModal && (
        <CardModal
          card={editCard} colonne={currentColonne} defaultColId={targetColId}
          workflowId={selectedWorkflow} staff={staff} clients={clients} transizioni={transizioni}
          onClose={() => { setShowCardModal(false); setEditCard(null); loadTodo(); }}
          onDelete={async () => {
            if (editCard) await supabase.from('attivita').delete().eq('id', editCard.id);
            setShowCardModal(false); setEditCard(null); loadTodo();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// WORKFLOW EDITOR MODAL
// ─────────────────────────────────────────────
export function WfEditorModal({ workflowId, workflowNome, onClose, onDelete }) {
  const [colonne, setColonne] = useState([]);
  const [transizioni, setTransizioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newColNome, setNewColNome] = useState('');
  const [newColColore, setNewColColore] = useState('#64748b');
  const [editingCol, setEditingCol] = useState(null);
  const [dragCol, setDragCol] = useState(null);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState(workflowNome || '');
  const [editingNome, setEditingNome] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [deletingWf, setDeletingWf] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: cols } = await supabase.from('workflow_colonne').select('*').eq('workflow_id', workflowId).order('ordine');
    const { data: trans } = await supabase.from('workflow_transizioni').select('*').eq('workflow_id', workflowId);
    setColonne(cols || []);
    setTransizioni(trans || []);
    setLoading(false);
  };

  const saveNome = async () => {
    if (!nome.trim()) return;
    await supabase.from('workflows').update({ nome: nome.trim() }).eq('id', workflowId);
    setEditingNome(false);
  };

  const handleDeleteWorkflow = async () => {
    if (!window.confirm(`Eliminare il workflow "${nome || workflowNome}"?\n\nSaranno eliminati anche tutte le colonne, le attività e le transizioni associate. Questa operazione non è reversibile.`)) return;
    setDeletingWf(true);
    try {
      await supabase.from('attivita').delete().eq('workflow_id', workflowId);
      await supabase.from('workflow_transizioni').delete().eq('workflow_id', workflowId);
      await supabase.from('workflow_colonne').delete().eq('workflow_id', workflowId);
      await supabase.from('workflows').delete().eq('id', workflowId);
      onDelete && onDelete();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione del workflow.');
      setDeletingWf(false);
    }
  };

  const addColonna = async () => {
    if (!newColNome.trim()) return;
    setSaving(true);
    const nextOrdine = colonne.length > 0 ? Math.max(...colonne.map(c => c.ordine)) + 1 : 0;
    await supabase.from('workflow_colonne').insert({ workflow_id: workflowId, nome: newColNome.trim(), colore: newColColore, ordine: nextOrdine });
    setNewColNome(''); setNewColColore('#64748b');
    await loadData(); setSaving(false);
  };

  const saveColonna = async (col) => {
    await supabase.from('workflow_colonne').update({ nome: col.nome, colore: col.colore }).eq('id', col.id);
    setEditingCol(null); await loadData();
  };

  const deleteColonna = async (id) => {
    if (!window.confirm('Eliminare la colonna?')) return;
    await supabase.from('workflow_colonne').delete().eq('id', id);
    await loadData();
  };

  const toggleTransizione = async (daId, aId) => {
    if (daId === aId) return;
    const exists = transizioni.find(t => t.da_colonna_id === daId && t.a_colonna_id === aId);
    if (exists) await supabase.from('workflow_transizioni').delete().eq('id', exists.id);
    else await supabase.from('workflow_transizioni').insert({ workflow_id: workflowId, da_colonna_id: daId, a_colonna_id: aId });
    await loadData();
  };

  const hasTransizione = (daId, aId) => transizioni.some(t => t.da_colonna_id === daId && t.a_colonna_id === aId);

  const onDragColStart = (col) => setDragCol(col);
  const onDropCol = async (targetCol) => {
    if (!dragCol || dragCol.id === targetCol.id) { setDragCol(null); return; }
    const reordered = [...colonne];
    const fromIdx = reordered.findIndex(c => c.id === dragCol.id);
    const toIdx = reordered.findIndex(c => c.id === targetCol.id);
    reordered.splice(fromIdx, 1); reordered.splice(toIdx, 0, dragCol);
    await Promise.all(reordered.map((c, i) => supabase.from('workflow_colonne').update({ ordine: i }).eq('id', c.id)));
    setDragCol(null); await loadData();
  };

  const renderGraph = () => {
    const N = colonne.length;
    if (N === 0) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Nessuno stato configurato</div>;
    const NODE_W = 160, NODE_H = 56, H_GAP = 100, V_GAP = 90;
    const COLS_PER_ROW = N <= 5 ? N : Math.ceil(N / 2);
    const ROWS = Math.ceil(N / COLS_PER_ROW);
    const SVG_W = COLS_PER_ROW * NODE_W + (COLS_PER_ROW - 1) * H_GAP + 80;
    const SVG_H = ROWS * NODE_H + (ROWS - 1) * V_GAP + 80;

    const nodePos = (idx) => {
      const row = Math.floor(idx / COLS_PER_ROW);
      const col = idx % COLS_PER_ROW;
      const rowCount = row === ROWS - 1 ? N - row * COLS_PER_ROW : COLS_PER_ROW;
      const offsetX = row === ROWS - 1 ? (COLS_PER_ROW - rowCount) * (NODE_W + H_GAP) / 2 : 0;
      return { x: 40 + offsetX + col * (NODE_W + H_GAP), y: 40 + row * (NODE_H + V_GAP) };
    };

    const arrows = [];
    transizioni.forEach(t => {
      const fromIdx = colonne.findIndex(c => c.id === t.da_colonna_id);
      const toIdx = colonne.findIndex(c => c.id === t.a_colonna_id);
      if (fromIdx === -1 || toIdx === -1) return;
      const from = nodePos(fromIdx);
      const to = nodePos(toIdx);
      const cx1 = from.x + NODE_W, cy1 = from.y + NODE_H / 2;
      const cx2 = to.x, cy2 = to.y + NODE_H / 2;
      const fromRow = Math.floor(fromIdx / COLS_PER_ROW);
      const toRow = Math.floor(toIdx / COLS_PER_ROW);
      const sameRow = fromRow === toRow;
      let d;
      if (sameRow && toIdx === fromIdx + 1) { d = `M ${cx1} ${cy1} L ${cx2} ${cy2}`; }
      else if (sameRow) { const arcY = from.y - 36; d = `M ${cx1} ${cy1} C ${cx1} ${arcY}, ${cx2} ${arcY}, ${cx2} ${cy2}`; }
      else { const bendX = (cx1 + cx2) / 2; d = `M ${cx1} ${cy1} C ${bendX} ${cy1}, ${bendX} ${cy2}, ${cx2} ${cy2}`; }
      arrows.push({ key: t.id, d, colore: colonne[fromIdx].colore, daId: colonne[fromIdx].id });
    });

    return (
      <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          {colonne.map(col => (
            <marker key={col.id} id={`arr-${col.id}`} viewBox="0 0 12 12" refX="10" refY="6" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M2 2L10 6L2 10" fill="none" stroke={col.colore} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          ))}
        </defs>
        {arrows.map(a => <path key={a.key} d={a.d} fill="none" stroke={a.colore} strokeWidth="1.8" strokeOpacity="0.65" markerEnd={`url(#arr-${a.daId})`} />)}
        {colonne.map((col, idx) => {
          const { x, y } = nodePos(idx);
          return (
            <g key={col.id} style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.10))' }}>
              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx="10" fill="#fff" stroke={col.colore} strokeWidth="2" />
              <rect x={x} y={y + 10} width={5} height={NODE_H - 20} rx="3" fill={col.colore} />
              <text x={x + 18} y={y + 16} fontSize="10" fill={col.colore} fontWeight="700" fontFamily="Inter, sans-serif" opacity="0.8">#{idx + 1}</text>
              <text x={x + 18} y={y + 34} fontSize="13" fontWeight="600" fill="#0f172a" fontFamily="Inter, sans-serif">
                {col.nome.length > 17 ? col.nome.slice(0, 16) + '…' : col.nome}
              </text>
              <circle cx={x} cy={y + NODE_H / 2} r="4" fill="#fff" stroke={col.colore} strokeWidth="1.5"/>
              <circle cx={x + NODE_W} cy={y + NODE_H / 2} r="4" fill={col.colore}/>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '820px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 64px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden',
      }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>

        <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '52px' }}>
          <div style={{ flex: 1 }}>
            {editingNome ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input value={nome} onChange={e => setNome(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveNome(); if (e.key === 'Escape') setEditingNome(false); }}
                  autoFocus style={{ fontSize: '16px', fontWeight: 700, border: 'none', borderBottom: '2px solid #0054a6', borderRadius: 0, outline: 'none', padding: '2px 4px', width: '220px' }} />
                <button onClick={saveNome} style={{ background: '#0054a6', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}>Salva</button>
                <button onClick={() => { setNome(workflowNome); setEditingNome(false); }} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', color: '#64748b' }}>Annulla</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setEditingNome(true)}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{nome || workflowNome}</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>✏️</span>
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 2 }}>Editor workflow</div>
          </div>

          <button onClick={() => setShowGraph(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: '#f8fafc', color: '#64748b' }}
            onMouseOver={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.color = '#0054a6'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="2" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="7" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="12" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="7" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M3.5 7h2M8.5 7h2M7 3.5v2M7 8.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Visualizza grafico
          </button>
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {showGraph && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }} onClick={() => setShowGraph(false)}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '1200px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Grafico del workflow</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: 2 }}>{colonne.length} stati · {transizioni.length} transizioni</div>
                  </div>
                  <button onClick={() => setShowGraph(false)} style={{ background: 'none', border: 'none', fontSize: '22px', color: '#94a3b8', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>×</button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '48px 56px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                  {renderGraph()}
                </div>
                {colonne.length > 0 && (
                  <div style={{ padding: '14px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '20px', flexWrap: 'wrap', flexShrink: 0, background: '#f8fafc' }}>
                    {colonne.map((col, i) => (
                      <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.colore }} />
                        <span style={{ fontSize: '11px', color: '#475569' }}><span style={{ fontWeight: 600, color: '#94a3b8', marginRight: 4 }}>#{i + 1}</span>{col.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STATI ── */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
              Stati <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>trascina per riordinare</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {loading ? <div style={{ color: '#94a3b8', fontSize: '13px' }}>Caricamento...</div> :
                colonne.map(col => (
                  <div key={col.id} draggable
                    onDragStart={() => onDragColStart(col)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => onDropCol(col)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: dragCol?.id === col.id ? '#f0f7ff' : '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'grab' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '16px', cursor: 'grab' }}>⠿</span>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: editingCol?.id === col.id ? editingCol.colore : col.colore, flexShrink: 0 }} />
                    {editingCol?.id === col.id ? (
                      <>
                        <input value={editingCol.nome} onChange={e => setEditingCol({ ...editingCol, nome: e.target.value })}
                          style={{ flex: 1, fontSize: '13px', padding: '4px 8px', border: '1px solid #bfdbfe', borderRadius: '6px' }}
                          onKeyDown={e => e.key === 'Enter' && saveColonna(editingCol)} autoFocus />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {COL_COLORS.map(c => <div key={c} onClick={() => setEditingCol({ ...editingCol, colore: c })} style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', border: editingCol.colore === c ? '2px solid #0f172a' : '1px solid transparent' }} />)}
                        </div>
                        <button onClick={() => saveColonna(editingCol)} style={{ background: '#0054a6', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>✓</button>
                        <button onClick={() => setEditingCol(null)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', color: '#64748b' }}>✕</button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{col.nome}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>#{col.ordine + 1}</span>
                        <button onClick={() => setEditingCol({ id: col.id, nome: col.nome, colore: col.colore })} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 9px', cursor: 'pointer', fontSize: '12px', color: '#475569' }}>✏️</button>
                        <button onClick={() => deleteColonna(col.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#94a3b8' }}>🗑️</button>
                      </>
                    )}
                  </div>
                ))
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #e2e8f0' }}>
              <input placeholder="Nuovo stato..." value={newColNome} onChange={e => setNewColNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addColonna()}
                style={{ flex: 1, fontSize: '13px', border: 'none', background: 'transparent', outline: 'none' }} />
              <div style={{ display: 'flex', gap: '4px' }}>
                {COL_COLORS.map(c => <div key={c} onClick={() => setNewColColore(c)} style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', border: newColColore === c ? '2px solid #0f172a' : '1px solid transparent' }} />)}
              </div>
              <button onClick={addColonna} disabled={saving} style={{ background: '#0054a6', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>+ Aggiungi</button>
            </div>
          </div>

          {/* ── TRANSIZIONI ── */}
          {colonne.length > 1 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Transizioni consentite</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px' }}>Clicca su una cella per abilitare/disabilitare. ✓ = transizione permessa.</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 4, fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Da ↓ / A →</th>
                      {colonne.map(col => (
                        <th key={col.id} style={{ padding: '6px 10px', textAlign: 'center', minWidth: 90 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.colore }} />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a' }}>{col.nome}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {colonne.map(rowCol => (
                      <tr key={rowCol.id}>
                        <td style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: rowCol.colore }} />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a' }}>{rowCol.nome}</span>
                          </div>
                        </td>
                        {colonne.map(colCol => {
                          const isSelf = rowCol.id === colCol.id;
                          const active = !isSelf && hasTransizione(rowCol.id, colCol.id);
                          return (
                            <td key={colCol.id} onClick={() => !isSelf && toggleTransizione(rowCol.id, colCol.id)}
                              style={{ textAlign: 'center', padding: '6px', background: isSelf ? '#f1f5f9' : active ? '#f0fdf4' : '#fff', border: `1px solid ${isSelf ? '#e2e8f0' : active ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '8px', cursor: isSelf ? 'default' : 'pointer', transition: 'all 0.15s', minWidth: 80 }}>
                              {isSelf ? <span style={{ color: '#cbd5e1', fontSize: '14px' }}>—</span>
                                : active ? <span style={{ color: '#16a34a', fontSize: '16px', fontWeight: 700 }}>✓</span>
                                : <span style={{ color: '#e2e8f0', fontSize: '16px' }}>○</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer con elimina workflow */}
        <div style={{ padding: '14px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={handleDeleteWorkflow}
            disabled={deletingWf}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s', opacity: deletingWf ? 0.6 : 1 }}
            onMouseOver={e => { if (!deletingWf) e.currentTarget.style.background = '#fef2f2'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
          >
            🗑 {deletingWf ? 'Eliminazione...' : 'Elimina workflow'}
          </button>
          <button className="btn-save" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}

export function WfModal({ onClose }) {
  const [nome, setNome] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '340px' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}><h3>Nuovo workflow</h3></div>
        <div className="form-group">
          <label>Nome workflow</label>
          <input placeholder="es. Delivery, Sviluppo..." value={nome} onChange={e => setNome(e.target.value)} autoFocus />
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={async () => {
            if (!nome.trim()) return;
            await supabase.from('workflows').insert({ nome: nome.trim() });
            onClose();
          }}>Salva</button>
        </div>
      </div>
    </div>
  );
}

export function ColModal({ workflowId, onClose }) {
  const [nome, setNome] = useState('');
  const [colore, setColore] = useState('#64748b');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '340px' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}><h3>Nuova colonna</h3></div>
        <div className="form-group">
          <label>Nome colonna</label>
          <input placeholder="es. Da fare, In corso, Fatto..." value={nome} onChange={e => setNome(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label>Colore</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {COL_COLORS.map(c => (
              <div key={c} onClick={() => setColore(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: colore === c ? '3px solid #0f172a' : '2px solid transparent', boxSizing: 'border-box', transition: 'all 0.15s' }} />
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={async () => {
            if (!nome.trim()) return;
            const { data: existing } = await supabase.from('workflow_colonne').select('ordine').eq('workflow_id', workflowId).order('ordine', { ascending: false }).limit(1);
            const nextOrdine = existing && existing.length > 0 ? existing[0].ordine + 1 : 0;
            await supabase.from('workflow_colonne').insert({ workflow_id: workflowId, nome: nome.trim(), colore, ordine: nextOrdine });
            onClose();
          }}>Salva</button>
        </div>
      </div>
    </div>
  );
}

export function CardModal({ card, colonne, defaultColId, workflowId, staff, clients, transizioni, onClose, onDelete }) {
  const isEdit = !!card;
  const [titolo, setTitolo] = useState(card?.titolo || '');
  const [colId, setColId] = useState(card?.colonna_id || defaultColId || '');
  const [assegnata, setAssegnata] = useState(card?.assegnata_a || '');
  const [clienteId, setClienteId] = useState(card?.cliente_id || '');
  const [priorita, setPriorita] = useState(card?.priorita || 'media');
  const [scadenza, setScadenza] = useState(card?.scadenza || '');
  const [saving, setSaving] = useState(false);

  const colonneDisponibili = colonne.filter(c => {
    if (!card?.colonna_id) return true;
    if (c.id === card.colonna_id) return true;
    return (transizioni || []).some(t => t.da_colonna_id === card.colonna_id && t.a_colonna_id === c.id);
  });

  const handleSave = async () => {
    if (!titolo.trim()) return;
    if (!colId) { alert('Seleziona una colonna per l\'attività.'); return; }
    setSaving(true);
    const payload = {
      workflow_id: workflowId, colonna_id: colId || null,
      titolo: titolo.trim(), assegnata_a: assegnata || null,
      cliente_id: clienteId || null, priorita, scadenza: scadenza || null,
    };
    if (isEdit) await supabase.from('attivita').update(payload).eq('id', card.id);
    else await supabase.from('attivita').insert(payload);
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '340px', width: '100%', maxWidth: '420px' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>{isEdit ? 'Modifica attività' : 'Nuova attività'}</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Titolo</label>
            <input placeholder="Descrivi l'attività..." value={titolo} onChange={e => setTitolo(e.target.value)} autoFocus />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Colonna <span style={{ color: '#dc2626' }}>*</span></label>
            <select value={colId} onChange={e => setColId(e.target.value)} style={{ borderColor: !colId ? '#fca5a5' : undefined }}>
              <option value="">— seleziona colonna —</option>
              {colonneDisponibili.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {isEdit && colonneDisponibili.length < colonne.length && (
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px', fontStyle: 'italic' }}>
                Solo le transizioni consentite dal workflow sono disponibili.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Assegnata a</label>
              <select value={assegnata} onChange={e => setAssegnata(e.target.value)}>
                <option value="">— nessuno —</option>
                {staff.map(s => <option key={staffKey(s)} value={staffKey(s)}>{staffLabel(s)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Cliente</label>
              <select value={clienteId} onChange={e => setClienteId(e.target.value)}>
                <option value="">— nessuno —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nome_progetto}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Priorità</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['bassa', 'media', 'alta'].map(p => {
                  const pc = PRIORITA_COLORS[p];
                  return (
                    <div key={p} onClick={() => setPriorita(p)} style={{
                      flex: 1, textAlign: 'center', padding: '7px', borderRadius: '8px', cursor: 'pointer',
                      border: `1px solid ${priorita === p ? pc.border : '#e2e8f0'}`,
                      background: priorita === p ? pc.bg : '#f8fafc',
                      color: priorita === p ? pc.text : '#64748b',
                      fontSize: '12px', fontWeight: priorita === p ? 700 : 400,
                      transition: 'all 0.15s', userSelect: 'none', textTransform: 'capitalize',
                    }}>{p}</div>
                  );
                })}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Scadenza</label>
              <input type="date" value={scadenza} onChange={e => setScadenza(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          {isEdit && (
            <button onClick={onDelete} style={{ background: 'none', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', marginRight: 'auto' }}>
              Elimina
            </button>
          )}
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
        </div>
      </div>
    </div>
  );
}