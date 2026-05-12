import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase.js';
import { staffKey, staffLabel, workingDays } from '../utils.js';
import { Avatar } from './Avatar.jsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESI_LABEL = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];

function annoMeseToLabel(annoMese) {
  const [anno, mese] = annoMese.split('-');
  return `${MESI_LABEL[parseInt(mese) - 1]} ${anno.slice(2)}`;
}

function buildPeriod(endExclusive, nMonths) {
  const result = [];
  for (let i = nMonths - 1; i >= 0; i--) {
    const dt = new Date(endExclusive.getFullYear(), endExclusive.getMonth() - i - 1, 1);
    result.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

function scostColor(pct) {
  const abs = Math.abs(pct);
  if (abs < 15) return { text: '#3B6D11', bg: '#EAF3DE', border: '#C0DD97', bar: '#97C459' };
  if (abs < 30) return { text: '#854F0B', bg: '#FAEEDA', border: '#FAC775', bar: '#EF9F27' };
  return { text: '#A32D2D', bg: '#FCEBEB', border: '#F7C1C1', bar: '#F09595' };
}

function satColor(pct) {
  if (pct > 95) return '#F09595';
  if (pct > 80) return '#EF9F27';
  return '#97C459';
}

function precRingStyle(prec) {
  if (prec === null) return { border: '#e2e8f0', color: '#94a3b8', bg: '#f1f5f9' };
  if (prec >= 80) return { border: '#97C459', color: '#3B6D11', bg: '#EAF3DE' };
  if (prec >= 60) return { border: '#EF9F27', color: '#854F0B', bg: '#FAEEDA' };
  return { border: '#F09595', color: '#A32D2D', bg: '#FCEBEB' };
}

function precisioneDistribuzione(commesse, assignments, consOp, staffCodice, periodoMesi) {
  let sumPeso = 0, sumScost = 0;
  commesse.forEach(co => {
    (co.bolle || []).forEach(codBolla => {
      periodoMesi.forEach(annoMese => {
        const label = annoMeseToLabel(annoMese);
        const plan = parseFloat(assignments[`${co.id}-${staffCodice}-${label}`] || 0);
        if (plan <= 0) return;
        const cons = (consOp[`${codBolla}-${annoMese}-${staffCodice}`] || 0) / 8;
        sumScost += Math.abs(cons - plan) / plan * plan;
        sumPeso += plan;
      });
    });
  });
  if (sumPeso === 0) return null;
  return Math.max(0, Math.round((1 - sumScost / sumPeso) * 100));
}

// ─── Stili condivisi ─────────────────────────────────────────────────────────

const S = {
  page:        { flex: 1, overflow: 'auto', padding: '20px 24px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '18px' },
  card:        { background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px' },
  cardSm:      { background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' },
  sectionLbl:  { fontSize: '11px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' },
  kpiLbl:      { fontSize: '12px', color: '#475569', marginBottom: '10px' },
  kpiNum:      { fontSize: '26px', fontWeight: 500, color: '#0f172a', lineHeight: 1 },
  kpiSub:      { fontSize: '11px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 },
  progTrack:   { height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' },
  badge:       (bg, text) => ({ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: bg, color: text }),
  thCell:      (align) => ({ fontSize: '10px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', textAlign: align || 'left' }),
  tdNum:       { fontSize: '13px', color: '#0f172a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
};

// ─── Componente principale ────────────────────────────────────────────────────

export function KpiPianificazione({ staff, clients, assignments }) {
  const [horizon, setHorizon] = useState(6);
  const [offset, setOffset]   = useState(0);
  const [consOp, setConsOp]   = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRisorsa, setSelectedRisorsa] = useState('all');
  const [expandedStaff, setExpandedStaff]     = useState({});
  const [drillMonth, setDrillMonth]           = useState(null);

  const today        = new Date();
  const endExclusive = new Date(today.getFullYear(), today.getMonth(), 1);

  const periodo = useMemo(() => {
    const shifted = new Date(endExclusive.getFullYear(), endExclusive.getMonth() - offset * horizon, 1);
    return buildPeriod(shifted, horizon);
  }, [horizon, offset]);

  const periodoLabel = periodo.length > 0
    ? `${annoMeseToLabel(periodo[0])} — ${annoMeseToLabel(periodo[periodo.length - 1])}`
    : '';

  useEffect(() => {
    if (!periodo.length) return;
    const load = async () => {
      setLoading(true);
      setDrillMonth(null);
      const { data } = await supabase
        .from('consuntivi_globali')
        .select('codice_bolla, anno_mese, ore_tecniche, codice_operatore')
        .in('anno_mese', periodo);
      const map = {};
      (data || []).forEach(r => {
        if (!r.codice_operatore) return;
        const key = `${r.codice_bolla}-${r.anno_mese}-${String(r.codice_operatore).trim()}`;
        map[key] = (map[key] || 0) + (parseFloat(r.ore_tecniche) || 0);
      });
      setConsOp(map);
      setLoading(false);
    };
    load();
  }, [periodo.join(',')]);

  const staffConCodice = staff.filter(s => s.codice);

  const staffData = useMemo(() => {
    return staffConCodice.map(sObj => {
      const sName  = staffKey(sObj);
      const codice = String(sObj.codice).trim();
      const commesse = clients.flatMap(c => c.commesse.filter(co => co.team?.includes(sName)));
      let totalPlan = 0, totalCons = 0, totalDisp = 0;
      periodo.forEach(annoMese => {
        const label = annoMeseToLabel(annoMese);
        totalDisp += workingDays(label);
        commesse.forEach(co => {
          const plan = parseFloat(assignments[`${co.id}-${sName}-${label}`] || 0);
          totalPlan += plan;
          (co.bolle || []).forEach(cb => { totalCons += (consOp[`${cb}-${annoMese}-${codice}`] || 0) / 8; });
        });
      });
      const scostPerc  = totalPlan > 0 ? Math.round(((totalCons - totalPlan) / totalPlan) * 100) : null;
      const satPerc    = totalDisp > 0 ? Math.round((totalPlan / totalDisp) * 100) : 0;
      const precisione = precisioneDistribuzione(commesse, assignments, consOp, codice, periodo);
      const monthly    = periodo.map(annoMese => {
        const label = annoMeseToLabel(annoMese);
        let plan = 0, cons = 0;
        commesse.forEach(co => {
          plan += parseFloat(assignments[`${co.id}-${sName}-${label}`] || 0);
          (co.bolle || []).forEach(cb => { cons += (consOp[`${cb}-${annoMese}-${codice}`] || 0) / 8; });
        });
        return { annoMese, label, plan: Math.round(plan * 10) / 10, cons: Math.round(cons * 10) / 10 };
      });
      return { sObj, sName, codice, commesse,
        totalPlan: Math.round(totalPlan * 10) / 10,
        totalCons: Math.round(totalCons * 10) / 10,
        totalDisp, scostPerc, satPerc, precisione, monthly };
    }).filter(d => d.totalPlan > 0 || d.totalCons > 0);
  }, [staffConCodice, clients, assignments, consOp, periodo]);

  // KPI globali
  const globalPlan   = Math.round(staffData.reduce((s, d) => s + d.totalPlan, 0) * 10) / 10;
  const globalCons   = Math.round(staffData.reduce((s, d) => s + d.totalCons, 0) * 10) / 10;
  const globalScost  = globalPlan > 0 ? Math.round(((globalCons - globalPlan) / globalPlan) * 100) : null;
  const globalSat    = staffData.length > 0 ? Math.round(staffData.reduce((s, d) => s + d.satPerc, 0) / staffData.length) : 0;
  const precValide   = staffData.filter(d => d.precisione !== null);
  const globalPrec   = precValide.length > 0 ? Math.round(precValide.reduce((s, d) => s + d.precisione, 0) / precValide.length) : null;
  const globalRealiz = globalPlan > 0 ? Math.round((globalCons / globalPlan) * 100) : 0;
  const scostGlobal  = globalScost !== null ? scostColor(globalScost) : null;
  const precGlobal   = globalPrec  !== null ? scostColor(100 - globalPrec) : null;

  const badgeLabel = (p) => {
    if (p === null) return '—';
    if (p >= 85) return 'ottima';
    if (p >= 70) return 'buona';
    if (p >= 55) return 'migliorabile';
    return 'critica';
  };

  // Dati grafico
  const graficoDati = useMemo(() => {
    if (selectedRisorsa === 'all') {
      return periodo.map(annoMese => {
        let plan = 0, cons = 0;
        staffData.forEach(d => { const m = d.monthly.find(x => x.annoMese === annoMese); if (m) { plan += m.plan; cons += m.cons; } });
        return { annoMese, label: annoMeseToLabel(annoMese), plan: Math.round(plan * 10) / 10, cons: Math.round(cons * 10) / 10 };
      });
    }
    return staffData.find(d => d.sObj.codice === selectedRisorsa)?.monthly || [];
  }, [selectedRisorsa, staffData, periodo]);

  // Dati drill-down
  const drillDati = useMemo(() => {
    if (!drillMonth) return [];
    const label   = annoMeseToLabel(drillMonth);
    const targets = selectedRisorsa === 'all' ? staffData : staffData.filter(d => d.sObj.codice === selectedRisorsa);
    const map = {};
    targets.forEach(d => {
      d.commesse.forEach(co => {
        const plan = parseFloat(assignments[`${co.id}-${d.sName}-${label}`] || 0);
        let cons = 0;
        (co.bolle || []).forEach(cb => { cons += (consOp[`${cb}-${drillMonth}-${d.codice}`] || 0) / 8; });
        if (plan > 0 || cons > 0) {
          if (!map[co.id]) map[co.id] = { name: co.nome_commessa, plan: 0, cons: 0 };
          map[co.id].plan += plan;
          map[co.id].cons += cons;
        }
      });
    });
    return Object.values(map)
      .map(r => ({ ...r, plan: Math.round(r.plan * 10) / 10, cons: Math.round(r.cons * 10) / 10 }))
      .filter(r => r.plan > 0 || r.cons > 0)
      .sort((a, b) => b.plan - a.plan);
  }, [drillMonth, selectedRisorsa, staffData, assignments, consOp]);

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
      Caricamento KPI...
    </div>
  );

  return (
    <div style={S.page}>

      {/* ── TOOLBAR ─────────────────────────────────────────────────────────── */}
      <div style={{ ...S.card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[3, 6, 12].map(h => (
            <button key={h} onClick={() => { setHorizon(h); setOffset(0); setDrillMonth(null); }}
              style={{ padding: '5px 12px', borderRadius: '8px', border: `0.5px solid ${horizon === h ? '#94a3b8' : '#e2e8f0'}`, background: horizon === h ? '#fff' : '#f8fafc', color: horizon === h ? '#0f172a' : '#475569', fontSize: '12px', fontWeight: horizon === h ? 500 : 400, cursor: 'pointer' }}>
              {h}m
            </button>
          ))}
        </div>
        <div style={{ width: '0.5px', height: '20px', background: '#e2e8f0' }} />
        <button onClick={() => { setOffset(o => o + 1); setDrillMonth(null); }}
          style={{ padding: '5px 11px', borderRadius: '8px', border: '0.5px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '14px', lineHeight: 1, cursor: 'pointer' }}>‹</button>
        <span style={{ background: '#eff6ff', color: '#0054a6', borderRadius: '8px', padding: '5px 14px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {periodoLabel}
        </span>
        <button onClick={() => { if (offset > 0) { setOffset(o => o - 1); setDrillMonth(null); } }}
          style={{ padding: '5px 11px', borderRadius: '8px', border: '0.5px solid #cbd5e1', background: '#f8fafc', color: offset === 0 ? '#cbd5e1' : '#475569', fontSize: '14px', lineHeight: 1, cursor: offset === 0 ? 'default' : 'pointer', opacity: offset === 0 ? 0.4 : 1 }}>›</button>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8' }}>Mese corrente escluso</span>
      </div>

      {/* ── KPI GLOBALI ─────────────────────────────────────────────────────── */}
      <div>
        <div style={S.sectionLbl}>Riepilogo del periodo</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '12px' }}>

          {/* Piano vs Consuntivo */}
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <div style={S.kpiLbl}>Piano vs consuntivo</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Pianificati</div>
                    <div style={S.kpiNum}>{globalPlan}<span style={{ fontSize: '13px', fontWeight: 400, color: '#94a3b8' }}> gg</span></div>
                  </div>
                  <div style={{ fontSize: '16px', color: '#cbd5e1', alignSelf: 'center' }}>→</div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Consuntivati</div>
                    <div style={{ ...S.kpiNum, color: scostGlobal ? scostGlobal.text : '#0f172a' }}>
                      {globalCons}<span style={{ fontSize: '13px', fontWeight: 400, color: '#94a3b8' }}> gg</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              </div>
            </div>
            <div style={S.progTrack}>
              <div style={{ width: `${Math.min(globalRealiz, 100)}%`, height: '100%', background: '#5DCAA5', borderRadius: '3px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>{globalRealiz}% realizzato</span>
              {globalScost !== null && (
                <span style={S.badge(scostGlobal.bg, scostGlobal.text)}>
                  {globalScost > 0 ? '+' : ''}{globalScost}% vs piano
                </span>
              )}
            </div>
          </div>

          {/* Precisione distribuzione */}
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <div style={S.kpiLbl}>Precisione distribuzione</div>
                <div style={S.kpiNum}>
                  {globalPrec !== null ? globalPrec : '—'}
                  <span style={{ fontSize: '13px', fontWeight: 400, color: '#94a3b8' }}>{globalPrec !== null ? '%' : ''}</span>
                </div>
                <div style={S.kpiSub}>quanto le ore sono<br />allocate sui clienti giusti</div>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
            </div>
            {globalPrec !== null && (
              <>
                <div style={S.progTrack}>
                  <div style={{ width: `${globalPrec}%`, height: '100%', background: precGlobal?.bar || '#EF9F27', borderRadius: '3px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <span style={S.badge(precGlobal?.bg, precGlobal?.text)}>{badgeLabel(globalPrec)}</span>
                </div>
              </>
            )}
          </div>

          {/* Saturazione */}
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <div style={S.kpiLbl}>Saturazione media team</div>
                <div style={S.kpiNum}>{globalSat}<span style={{ fontSize: '13px', fontWeight: 400, color: '#94a3b8' }}>%</span></div>
                <div style={S.kpiSub}>giorni pianificati<br />su giorni lavorativi disponibili</div>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
            </div>
            <div style={S.progTrack}>
              <div style={{ width: `${Math.min(globalSat, 100)}%`, height: '100%', background: satColor(globalSat), borderRadius: '3px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>ottimale tra 70–85%</span>
              <span style={S.badge(globalSat > 95 ? '#FCEBEB' : globalSat > 80 ? '#FAEEDA' : '#EAF3DE', globalSat > 95 ? '#A32D2D' : globalSat > 80 ? '#854F0B' : '#3B6D11')}>
                {globalSat > 95 ? 'sovraccarico' : globalSat > 80 ? 'attenzione' : 'nella norma'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── GRAFICO ─────────────────────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', flex: 1 }}>
            {drillMonth ? `Dettaglio commesse — ${annoMeseToLabel(drillMonth)}` : 'Pianificato vs consuntivato per mese'}
          </span>
          {drillMonth ? (
            <button onClick={() => setDrillMonth(null)}
              style={{ fontSize: '12px', color: '#0054a6', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Tutti i mesi
            </button>
          ) : (
            <select value={selectedRisorsa} onChange={e => setSelectedRisorsa(e.target.value)}
              style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', border: '0.5px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', cursor: 'pointer' }}>
              <option value="all">Tutto il team</option>
              {staffConCodice.map(s => <option key={s.codice} value={s.codice}>{staffLabel(s)}</option>)}
            </select>
          )}
        </div>
        {drillMonth && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginBottom: '14px' }}>
            <span style={{ color: '#0054a6', cursor: 'pointer' }} onClick={() => setDrillMonth(null)}>Tutti i mesi</span>
            <span style={{ color: '#94a3b8' }}>›</span>
            <span style={{ color: '#0f172a', fontWeight: 500 }}>{annoMeseToLabel(drillMonth)}</span>
          </div>
        )}
        {!drillMonth
          ? <GraficoMesi dati={graficoDati} onClickMonth={setDrillMonth} />
          : <GraficoDrill dati={drillDati} />
        }
      </div>

      {/* ── TABELLA RISORSE ──────────────────────────────────────────────────── */}
      <div>
        <div style={S.sectionLbl}>Dettaglio per risorsa</div>
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 130px 110px', padding: '9px 16px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0' }}>
            {[['Risorsa','left'],['Pianificati','right'],['Consuntivati','right'],['Scostamento','right'],['Saturazione','left'],['Precisione dist.','center']].map(([h, align]) => (
              <div key={h} style={S.thCell(align)}>{h}</div>
            ))}
          </div>

          {staffData.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              Nessun dato nel periodo selezionato
            </div>
          ) : staffData.map(d => {
            const isOpen = !!expandedStaff[d.sName];
            const sc   = d.scostPerc !== null ? scostColor(d.scostPerc) : null;
            const ring = precRingStyle(d.precisione);

            return (
              <React.Fragment key={d.sName}>
                <div
                  onClick={() => setExpandedStaff(p => ({ ...p, [d.sName]: !isOpen }))}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 130px 110px', padding: '12px 16px', borderTop: '0.5px solid #e2e8f0', alignItems: 'center', cursor: 'pointer', background: isOpen ? '#f8fafc' : '#fff', transition: 'background .12s' }}
                  onMouseOver={e => { if (!isOpen) e.currentTarget.style.background = '#fafbfc'; }}
                  onMouseOut={e => { if (!isOpen) e.currentTarget.style.background = '#fff'; }}>

                  {/* Risorsa */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'inline-block', transition: 'transform .15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                    <Avatar name={staffLabel(d.sObj)} avatarUrl={d.sObj.avatar_url} size={30} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{staffLabel(d.sObj)}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{d.sObj.ruolo || 'Consulente'}</div>
                    </div>
                  </div>

                  <div style={S.tdNum}>{d.totalPlan}</div>
                  <div style={S.tdNum}>{d.totalCons}</div>

                  {/* Scostamento */}
                  <div style={{ ...S.tdNum, fontWeight: 500, color: sc ? sc.text : '#94a3b8' }}>
                    {d.scostPerc !== null ? `${d.scostPerc > 0 ? '+' : ''}${d.scostPerc}%` : '—'}
                  </div>

                  {/* Saturazione */}
                  <div style={{ paddingRight: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#0f172a', marginBottom: '4px' }}>{d.satPerc}%</div>
                    <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(d.satPerc, 100)}%`, height: '100%', background: satColor(d.satPerc), borderRadius: '3px' }} />
                    </div>
                  </div>

                  {/* Precisione — cerchio */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2.5px solid ${ring.border}`, background: ring.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, color: ring.color }}>
                      {d.precisione !== null ? `${d.precisione}%` : '—'}
                    </div>
                  </div>
                </div>

                {/* Dettaglio commesse espanso */}
                {isOpen && (
                  <div style={{ background: '#f8fafc', borderTop: '0.5px solid #e2e8f0', padding: '14px 16px 16px 58px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
                      Scostamento per commessa — {periodoLabel}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {d.commesse.map(co => {
                        let plan = 0, cons = 0;
                        periodo.forEach(annoMese => {
                          const label = annoMeseToLabel(annoMese);
                          plan += parseFloat(assignments[`${co.id}-${d.sName}-${label}`] || 0);
                          (co.bolle || []).forEach(cb => { cons += (consOp[`${cb}-${annoMese}-${d.codice}`] || 0) / 8; });
                        });
                        plan = Math.round(plan * 10) / 10;
                        cons = Math.round(cons * 10) / 10;
                        if (plan === 0 && cons === 0) return null;
                        const sc2  = plan > 0 ? Math.round(((cons - plan) / plan) * 100) : null;
                        const col2 = sc2 !== null ? scostColor(sc2) : null;
                        const maxV = Math.max(plan, cons, 1);
                        return (
                          <div key={co.id} style={{ ...S.cardSm, border: `0.5px solid ${col2 ? col2.border : '#e2e8f0'}` }}>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={co.nome_commessa}>
                              {co.nome_commessa}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '12px', color: '#475569' }}>
                                pian. <strong style={{ color: '#0f172a' }}>{plan}g</strong>
                                <span style={{ margin: '0 5px', color: '#cbd5e1' }}>→</span>
                                cons. <strong style={{ color: '#0f172a' }}>{cons}g</strong>
                              </span>
                              {sc2 !== null && (
                                <span style={S.badge(col2.bg, col2.text)}>
                                  {sc2 > 0 ? '+' : ''}{sc2}%
                                </span>
                              )}
                            </div>
                            {/* Barre P / C */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '10px', color: '#0c447c', width: '14px', flexShrink: 0, fontWeight: 500 }}>P</span>
                                <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${(plan / maxV) * 100}%`, height: '100%', background: '#B5D4F4', borderRadius: '3px' }} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '10px', color: '#085041', width: '14px', flexShrink: 0, fontWeight: 500 }}>C</span>
                                <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${(cons / maxV) * 100}%`, height: '100%', background: col2 ? col2.bar : '#5DCAA5', borderRadius: '3px' }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Grafico mesi ─────────────────────────────────────────────────────────────

function GraficoMesi({ dati, onClickMonth }) {
  const maxVal = Math.max(...dati.flatMap(d => [d.plan, d.cons]), 1);
  const H = 110;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: `${H + 40}px` }}>
        {dati.map(d => {
          const ph  = Math.max(4, Math.round((d.plan / maxVal) * H));
          const ch  = Math.max(4, Math.round((d.cons / maxVal) * H));
          const sc  = d.plan > 0 ? Math.round(((d.cons - d.plan) / d.plan) * 100) : null;
          const col = sc !== null ? scostColor(sc) : null;
          return (
            <div key={d.annoMese} onClick={() => onClickMonth(d.annoMese)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', borderRadius: '8px', padding: '4px 2px 0', transition: 'background .12s' }}
              onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              {sc !== null && (
                <div style={{ fontSize: '9px', fontWeight: 500, color: col.text, marginBottom: '5px', whiteSpace: 'nowrap' }}>
                  {sc > 0 ? '+' : ''}{sc}%
                </div>
              )}
              <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end' }}>
                <div style={{ width: '16px', height: `${ph}px`, background: '#B5D4F4', borderRadius: '3px 3px 0 0' }} />
                <div style={{ width: '16px', height: `${ch}px`, background: '#5DCAA5', borderRadius: '3px 3px 0 0' }} />
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>{d.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '14px', marginTop: '10px', flexWrap: 'wrap' }}>
        {[
          { bg: '#B5D4F4', label: 'Pianificato',    round: false },
          { bg: '#5DCAA5', label: 'Consuntivato',   round: false },
          { bg: '#3B6D11', label: 'Scost. <15%',    round: true  },
          { bg: '#854F0B', label: '15–30%',          round: true  },
          { bg: '#A32D2D', label: '>30%',            round: true  },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#475569' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: l.round ? '50%' : '2px', background: l.bg }} />
            {l.label}
          </div>
        ))}
      </div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontStyle: 'italic' }}>
        Clicca su un mese per vedere il dettaglio per commessa
      </div>
    </div>
  );
}

// ─── Grafico drill-down ───────────────────────────────────────────────────────

function GraficoDrill({ dati }) {
  const maxVal = Math.max(...dati.flatMap(d => [d.plan, d.cons]), 1);
  if (!dati.length) return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
      Nessun dato per questo mese
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {dati.map((d, i) => {
        const sc  = d.plan > 0 ? Math.round(((d.cons - d.plan) / d.plan) * 100) : null;
        const col = sc !== null ? scostColor(sc) : null;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#0f172a', width: '160px', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.name}>
              {d.name}
            </div>
            <div style={{ flex: 1, height: '24px', background: '#f1f5f9', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '3px', left: 0, height: '9px', width: `${(d.plan / maxVal) * 100}%`, background: '#B5D4F4', borderRadius: '3px' }} />
              <div style={{ position: 'absolute', bottom: '3px', left: 0, height: '9px', width: `${(d.cons / maxVal) * 100}%`, background: col ? col.bar : '#5DCAA5', borderRadius: '3px' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#475569', width: '90px', textAlign: 'right', flexShrink: 0 }}>
              {d.plan}g / {d.cons}g
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500, width: '50px', textAlign: 'right', flexShrink: 0, color: col ? col.text : '#94a3b8' }}>
              {sc !== null ? `${sc > 0 ? '+' : ''}${sc}%` : '—'}
            </div>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: '14px', marginTop: '6px' }}>
        {[{ bg: '#B5D4F4', label: 'Pianificato' }, { bg: '#5DCAA5', label: 'Consuntivato' }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#475569' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.bg }} />{l.label}
          </div>
        ))}
      </div>
    </div>
  );
}