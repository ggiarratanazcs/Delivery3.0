import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './style.css';
import { supabase } from './supabase.js';
import {
  SKILLS_FOLDERS, DEFAULT_SKILLS, PRODOTTI_CATALOGO, CATEGORIA_COLORS,
  RUOLI, RUOLO_COLORS, COL_COLORS, PRIORITA_COLORS,
  REPARTI_STANDARD, STATI_TASK, STATO_COLORS, STATI_COLORS_BAR, IN_CARICO_OPTIONS,
  GANTT_COLUMN_WIDTH,
} from './constants.js';
import {
  workingDays, getDefaultStartDate, getWeekKey, getWeekRange,
  getAvatarColor, getInitials, getAvatarUrl, staffKey, staffLabel,
} from './utils.js';
import { HamburgerIcon } from './components/HamburgerIcon.jsx';
import { Avatar } from './components/Avatar.jsx';
import { LoadingOverlay } from './components/LoadingOverlay.jsx';
import { MultiPillFilter } from './components/MultiPillFilter.jsx';
import { LoginPage } from './components/LoginPage.jsx';
import { ProdottiSelector, ProdottiBadges } from './components/ProdottiSelector.jsx';
import { ManageStaffModal, StaffFormModal } from './components/StaffModals.jsx';
import { TodoView } from './components/TodoView.jsx';
import {
  ProgettiList, ProgettoView,
  creaTaskStandard,
} from './components/ProgettiView.jsx';
import { WeeklyView, KPIView, HomeUser } from './components/KPIView.jsx';
import {
  ProjectModal, ManageSkillsModal, ClientModal,
  EditClientModal, ManageClientsModal, ImportExcelModal,
} from './components/ClientModals.jsx';
import ThemeSelector from './components/ThemeSelector.jsx';
import { SkillStorico } from './components/SkillStorico.jsx';
import { SkillFormazione } from './components/SkillFormazione.jsx';
import { DesktopOnly, useIsMobile } from './components/DesktopOnly.jsx';
import { GestioneDatiModal } from './components/GestioneDati.jsx';
import { KpiPianificazione } from './components/KpiPianificazione.jsx';



const customStyles = `
  .skills-table { border-collapse: separate; border-spacing: 3px; }
  .skills-table th, .skills-table td { min-width: 100px; max-width: 100px; width: 100px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-radius: 6px; }
  .skills-table th.sticky-col, .skills-table td.sticky-col { min-width: 180px; max-width: 180px; width: 180px; text-align: left; border-right: none; border-radius: 8px; }
  .btn-add-styled { background: #2563eb; color: white; border: none; border-radius: 6px; padding: 0 15px; height: 40px; cursor: pointer; font-weight: bold; transition: background 0.2s; }
  .btn-add-styled:hover { background: #1d4ed8; }
  .menu-trigger-inline { background: none !important; border: none !important; border-radius: 6px !important; padding: 6px 8px !important; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; transition: background 0.15s; }
  .menu-trigger-inline:hover { background: #f1f5f9 !important; color: #0f172a; }
  .btn-close-circle { background: none; color: #94a3b8; border: none; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; line-height: 1; transition: all 0.15s; position: absolute; top: 14px; right: 16px; }
  .btn-close-circle:hover { background: #f1f5f9; color: #0f172a; }

  .gantt-wrapper { display: flex; flex-direction: column; background: white; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px; overflow: hidden; height: 650px; }
  .gantt-scroll-container { overflow: auto; display: flex; flex-direction: column; flex: 1; }
  .gantt-header { display: flex; background: #fff; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 25; width: fit-content; }
  .gantt-label-col { min-width: 320px; width: 320px; border-right: 1px solid #e2e8f0; background: #ffffff !important; position: sticky; left: 0; z-index: 21; display: flex; align-items: center; padding: 0 15px; height: 100%; box-shadow: 2px 0 5px rgba(0,0,0,0.05); }
  .gantt-timeline-header { display: flex; }
  .gantt-month-box { min-width: ${GANTT_COLUMN_WIDTH}px; width: ${GANTT_COLUMN_WIDTH}px; text-align: center; padding: 12px 0; border-right: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; background: #f8fafc; }
  .gantt-body { display: flex; flex-direction: column; width: fit-content; background: #fff; }
  .gantt-row { display: flex; border-bottom: 1px solid #f1f5f9; align-items: stretch; min-height: 48px; width: 100%; background: #fff !important; }
  .gantt-bar-area { display: flex; flex: 1; position: relative; min-height: 48px; background-image: linear-gradient(to right, #f1f5f9 1px, transparent 1px); background-size: ${GANTT_COLUMN_WIDTH}px 100%; }
  .gantt-bar { position: absolute; height: 28px; color: white; border-radius: 6px; font-size: 11px; display: flex; align-items: center; padding: 0; top: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 5; cursor: pointer; border-right: 2px solid rgba(0,0,0,0.2); }
  .gantt-row.row-client .gantt-label-col { font-weight: bold; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f1f5f9; }
  .gantt-row.row-commessa .gantt-label-col { padding-left: 35px; font-size: 12px; color: #475569; }
  .clickable-commessa { cursor: pointer; color: #2563eb; font-weight: 500; }
  .clickable-commessa:hover { text-decoration: underline; color: #1d4ed8; }
  .btn-add-inline { width: 22px; height: 22px; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; color: #94a3b8; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; margin-left: auto; }
  .btn-add-inline:hover { background: #2563eb; color: white; border-color: #2563eb; }
  .gantt-month-marker { position: absolute; top: 0; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: white; z-index: 10; pointer-events: none; border-left: 1px solid rgba(255,255,255,0.15); }
  .gantt-dot-danger { width: 7px; height: 7px; background-color: #fca5a5; border-radius: 50%; box-shadow: 0 0 5px rgba(239, 68, 68, 0.9); }
  .login-input::placeholder { color: rgba(255,255,255,0.45); }
  .login-input:focus { border-color: rgba(255,255,255,0.6) !important; background: rgba(255,255,255,0.22) !important; }
  @keyframes loginFadeIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .login-card { animation: loginFadeIn 0.5s ease-out both; }
`;

const mesiIT = { GEN:'01', FEB:'02', MAR:'03', APR:'04', MAG:'05', GIU:'06', LUG:'07', AGO:'08', SET:'09', OTT:'10', NOV:'11', DIC:'12' };

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState('kpi');
  const [planSubView, setPlanSubView] = useState('byProject');
  const [activeFolder, setActiveFolder] = useState('Teseo');
  const [skillsConfig, setSkillsConfig] = useState(DEFAULT_SKILLS);
  const [showSidebarSkills, setShowSidebarSkills] = useState(false);
  const [showSidebarPlan, setShowSidebarPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [clients, setClients] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [consuntiviGlobali, setConsuntiviGlobali] = useState({});
  const [consuntiviGlobaliOp, setConsuntiviGlobaliOp] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [filterClient, setFilterClient] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [trainingMode, setTrainingMode] = useState(false);
  const [trainingCells, setTrainingCells] = useState({});
  const [skillsSubView, setSkillsSubView] = useState('matrice');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOnlyActiveGantt, setShowOnlyActiveGantt] = useState(true);
  const [showOnlyActiveProject, setShowOnlyActiveProject] = useState(true);
  const [showOnlyActiveWeekly, setShowOnlyActiveWeekly] = useState(true);
  const [showOnlyActiveResource, setShowOnlyActiveResource] = useState(true);
  const [expandAllWeekly, setExpandAllWeekly] = useState({ clients: false, commesse: false });
  const [expandAllResource, setExpandAllResource] = useState({ clients: false, commesse: false });
  const [targetedProjectEdit, setTargetedProjectEdit] = useState(null);
  const [showGestioneDati, setShowGestioneDati] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [timeFilters, setTimeFilters] = useState({
    byProject: { start: getDefaultStartDate(), horizon: 10 },
    byResource: { start: getDefaultStartDate(), horizon: 10 },
    gantt: { start: getDefaultStartDate(), horizon: 24 },
  });
  const [showManageStaff, setShowManageStaff] = useState(false);
  const [showManageSkills, setShowManageSkills] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showManageClientsModal, setShowManageClientsModal] = useState(false);
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [selectedClientEdit, setSelectedClientEdit] = useState(null);
  const [progettoAperto, setProgettoAperto] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffLoaded, setStaffLoaded] = useState(false);

  const isMobile = useIsMobile();

  const TAB_LIST = [
    { key: 'kpi', label: 'Home', adminOnly: true },
    { key: 'homeUser', label: 'Home', adminOnly: false, userOnly: true },
    { key: 'skills', label: 'Matrice Skills', adminOnly: true },
    { key: 'planning', label: 'Pianificazione' },
    { key: 'todo', label: 'WorkFlow', adminOnly: true },
    { key: 'progetti', label: 'Progetti' },
  ];

  const visibleTabs = TAB_LIST.filter(tab => {
    if (tab.userOnly) return !isAdmin;
    if (tab.adminOnly) return isAdmin;
    return true;
  });

  const loadCurrentStaff = async (user) => {
    if (!user?.email) { setStaffLoaded(true); return; }
    const { data } = await supabase.from('staff').select('*').eq('email', user.email).single();
    if (data) {
      setCurrentStaff(data);
      setIsAdmin(data.is_admin === true);
      setView(data.is_admin ? 'kpi' : 'homeUser');
    } else {
      setIsAdmin(true);
      setView('kpi');
    }
    setStaffLoaded(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsLoggedIn(true);
        setCurrentUser(data.session.user);
        loadCurrentStaff(data.session.user);
      }
    });
    loadAllData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setCurrentStaff(null);
    setIsAdmin(false);
    setStaffLoaded(false);
  };

  async function loadAllData() {
    setLoading(true);
    try {
      const { data: confData } = await supabase.from('skills_settings').select('*');
      if (confData && confData.length > 0) {
        const newConf = { Teseo: [], Cassiopea: [], 'Business intelligence': [], 'Soft skills': [] };
        confData.forEach((c) => { if (newConf[c.category]) newConf[c.category].push(c.skill_name); });
        setSkillsConfig(newConf);
      }

      const { data: sData } = await supabase.from('skill_data').select('*').order('data_valutazione', { ascending: false });
      const m = {};
      if (sData) {
        sData.forEach((item) => {
          const compositeKey = `${item.staff_key}-${item.skill_key}`;
          if (!(compositeKey in m)) m[compositeKey] = item.voto;
        });
      }
      setMatrix(m);

      const { data: fData } = await supabase.from('skill_formazione').select('*');
      const tc = {};
      if (fData) fData.forEach(f => { tc[`${f.staff_key}-${f.skill_key}`] = true; });
      setTrainingCells(tc);

      const { data: staffData } = await supabase.from('staff').select('*').order('cognome');
      setStaff(staffData || []);

      const { data: cData } = await supabase.from('projects').select('*').order('nome_progetto');
      const { data: commData } = await supabase.from('commesse').select('*');
      const { data: tData } = await supabase.from('project_team').select('*');
      const { data: bolleData } = await supabase.from('bolle_lavoro').select('codice, commessa_id');

      if (cData) {
        setClients(cData.map((c) => ({
          ...c,
          commesse: (commData || [])
            .filter((co) => co.client_id === c.id)
            .map((co) => ({
              ...co,
              team: (tData || []).filter((t) => t.commessa_id === co.id).map((t) => t.staff_name),
              bolle: (bolleData || []).filter((b) => b.commessa_id === co.id).map((b) => b.codice),
            })),
        })));
      }

      const { data: aData } = await supabase.from('project_assignments').select('*');
      const ass = {};
      if (aData) aData.forEach((a) => { ass[`${a.commessa_id}-${a.staff_name}-${a.mese_anno}`] = a.gg_previsti; });
      setAssignments(ass);

      const { data: cgData } = await supabase
        .from('consuntivi_globali')
        .select('codice_bolla, anno_mese, ore_tecniche, codice_operatore');

      const cg = {};
      const cgOp = {};
      if (cgData) {
        cgData.forEach(r => {
          const keyBolla = `${r.codice_bolla}-${r.anno_mese}`;
          cg[keyBolla] = (cg[keyBolla] || 0) + (parseFloat(r.ore_tecniche) || 0);
          if (r.codice_operatore) {
            const keyOp = `${r.codice_bolla}-${r.anno_mese}-${String(r.codice_operatore).trim()}`;
            cgOp[keyOp] = (cgOp[keyOp] || 0) + (parseFloat(r.ore_tecniche) || 0);
          }
        });
      }
      setConsuntiviGlobali(cg);
      setConsuntiviGlobaliOp(cgOp);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getGiorniSvolti = (commessa, monthLabel) => {
    if (!commessa.bolle || commessa.bolle.length === 0) return 0;
    const parts = monthLabel.split(' ');
    const mese = mesiIT[parts[0]];
    const anno = '20' + parts[1];
    if (!mese || !anno) return 0;
    const annoMese = `${anno}-${mese}`;
    return commessa.bolle.reduce((tot, codBolla) => {
      const key = `${codBolla}-${annoMese}`;
      return tot + ((consuntiviGlobali[key] || 0) / 8);
    }, 0);
  };

  const toggleSkill = async (person, skill) => {
    const sKey = staffKey(person);
    const compositeKey = `${sKey}-${skill}`;
    if (trainingMode) {
      const isActive = trainingCells[compositeKey];
      setTrainingCells(p => ({ ...p, [compositeKey]: !isActive }));
      if (isActive) {
        await supabase.from('skill_formazione').delete().eq('staff_key', sKey).eq('skill_key', skill);
      } else {
        await supabase.from('skill_formazione').upsert(
          { staff_key: sKey, skill_key: skill, data_inizio: new Date().toISOString().slice(0, 10) },
          { onConflict: 'staff_key,skill_key' }
        );
      }
      return;
    }
    const cur = matrix[compositeKey] || 0;
    const next = cur >= 4 ? 0 : cur + 1;
    const oldVal = matrix[compositeKey];
    setMatrix((p) => ({ ...p, [compositeKey]: next }));
    try {
      if (next === 0) return;
      const { error } = await supabase.from('skill_data').insert({
        staff_key: sKey, skill_key: skill, voto: next,
        data_valutazione: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
    } catch (err) {
      console.error('Errore salvataggio:', err);
      alert('Errore DB: Impossibile salvare la skill.');
      setMatrix((p) => ({ ...p, [compositeKey]: oldVal }));
    }
  };

  const openCommessaEdit = (clientId, commessaId) => {
    setTargetedProjectEdit({ clientId, commessaId });
    setShowProjectModal(true);
  };

  const openNewCommessaForClient = (clientId) => {
    setTargetedProjectEdit({ clientId, commessaId: '' });
    setShowProjectModal(true);
  };

  const updateGg = async (commId, staffName, month, value) => {
    const val = Math.max(0, parseFloat(value) || 0);
    const key = `${commId}-${staffName}-${month}`;
    const oldVal = assignments[key];
    setAssignments((prev) => ({ ...prev, [key]: val }));
    const { error } = await supabase.from('project_assignments').upsert({
      commessa_id: commId, staff_name: staffName, mese_anno: month, gg_previsti: val,
    }, { onConflict: 'commessa_id,staff_name,mese_anno' });
    if (error) {
      console.error('DETTAGLIO ERRORE SUPABASE:', JSON.stringify(error, null, 2));
      alert('Errore salvataggio ore.');
      setAssignments((prev) => ({ ...prev, [key]: oldVal }));
    }
  };

  const updateTimeFilter = (viewName, field, value) => {
    setTimeFilters((prev) => ({ ...prev, [viewName]: { ...prev[viewName], [field]: value } }));
  };

  const currentMonths = (() => {
    const activeFilters = timeFilters[planSubView] || timeFilters['byProject'];
    const months = [];
    const start = new Date(`${activeFilters.start}-01T00:00:00`);
    const horizon = parseInt(activeFilters.horizon) || 12;
    for (let i = 0; i < horizon; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      months.push({
        date: d,
        label: d.toLocaleString('it-IT', { month: 'short', year: '2-digit' }).toUpperCase().replace('.', ''),
      });
    }
    return months;
  })();

  const renderGantt = () => {
    if (currentMonths.length === 0) return null;
    const startDate = currentMonths[0].date;
    const totalWidth = currentMonths.length * GANTT_COLUMN_WIDTH;
    const filteredGanttClients = visibleClients.filter((c) => {
      const matchClient = c.nome_progetto.toLowerCase().includes(filterClient.toLowerCase());
      const matchCommessa = c.commesse.some((co) => co.nome_commessa.toLowerCase().includes(filterClient.toLowerCase()));
      const hasActive = c.commesse.some((co) => co.attiva !== false);
      return (matchClient || matchCommessa) && (!showOnlyActiveGantt || hasActive);
    });

    const getPosition = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      const diffMonths = (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const dayRatio = (d.getDate() - 1) / daysInMonth;
      return (diffMonths + dayRatio) * GANTT_COLUMN_WIDTH;
    };

    return (
      <div className="gantt-wrapper animate-fade-in">
        <div className="gantt-scroll-container">
          <div className="gantt-header">
            <div className="gantt-label-col">Cliente / Commessa</div>
            <div className="gantt-timeline-header">
              {currentMonths.map((m) => <div key={m.label} className="gantt-month-box">{m.label}</div>)}
            </div>
          </div>
          <div className="gantt-body">
            {filteredGanttClients.map((c) => {
              const commesseToShow = c.commesse.filter((co) => showOnlyActiveGantt ? co.attiva !== false : true);
              if (commesseToShow.length === 0 && showOnlyActiveGantt) return null;
              const isExpanded = expandedItems[`gantt-${c.id}`];
              return (
                <React.Fragment key={c.id}>
                  <div className="gantt-row row-client">
                    <div className="gantt-label-col" onClick={() => setExpandedItems((p) => ({ ...p, [`gantt-${c.id}`]: !isExpanded }))} style={{ cursor: 'pointer' }}>
                      <span style={{ marginRight: '10px', width: '12px', display: 'inline-block' }}>{isExpanded ? '▼' : '▶'}</span>
                      <strong>{c.nome_progetto}</strong>
                      <button className="btn-add-inline" onClick={(e) => { e.stopPropagation(); openNewCommessaForClient(c.id); }}>+</button>
                    </div>
                    <div className="gantt-bar-area" style={{ width: totalWidth }}></div>
                  </div>
                  {isExpanded && commesseToShow.map((co) => {
                    const left = getPosition(co.data_inizio);
                    let right = co.data_fine ? getPosition(co.data_fine) : left !== null ? left + GANTT_COLUMN_WIDTH : null;
                    const width = right !== null ? right - left : 0;
                    return (
                      <div className="gantt-row row-commessa" key={co.id}>
                        <div className="gantt-label-col">
                          <span className="clickable-commessa" onClick={() => openCommessaEdit(c.id, co.id)}>{co.nome_commessa}</span>
                        </div>
                        <div className="gantt-bar-area" style={{ width: totalWidth }}>
                          {left !== null && (
                            <div className="gantt-bar" style={{ left: `${left}px`, width: `${Math.max(15, width)}px`, background: co.attiva !== false ? '#2563eb' : '#94a3b8', opacity: co.attiva !== false ? 1 : 0.6 }} onClick={() => openCommessaEdit(c.id, co.id)}>
                              <span style={{ position: 'relative', zIndex: 20, paddingLeft: '8px', textShadow: '0 1px 2px rgba(0,0,0,0.4)', pointerEvents: 'none' }}>{co.nome_commessa}</span>
                              {currentMonths.map((m, idx) => {
                                const mLeft = idx * GANTT_COLUMN_WIDTH;
                                const mRight = mLeft + GANTT_COLUMN_WIDTH;
                                if (mRight > left && mLeft < left + width) {
                                  const totalDays = co.team.reduce((s, mem) => s + (assignments[`${co.id}-${mem}-${m.label}`] || 0), 0);
                                  return (
                                    <div key={m.label} className="gantt-month-marker" style={{ left: `${mLeft - left}px`, width: `${GANTT_COLUMN_WIDTH}px` }}>
                                      {totalDays > 0 ? <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 5px', borderRadius: '4px' }}>{totalDays}g</span> : co.attiva !== false ? <div className="gantt-dot-danger"></div> : null}
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const currentStaffKey = currentStaff ? `${currentStaff.cognome} ${currentStaff.nome}` : '';

  const visibleClients = isAdmin || !currentStaff
    ? clients
    : clients.map(c => ({
        ...c,
        commesse: (c.commesse || []).filter(co => {
          const team = co.team || [];
          return co.pm_commessa === currentStaffKey || team.includes(currentStaffKey);
        }),
      })).filter(c => c.commesse.length > 0);

  const visibleStaff = isAdmin || !currentStaff
    ? staff
    : staff.filter(s => staffKey(s) === currentStaffKey);

  // ── Vista clienti: lista filtrata per il flag "Solo attive" ────────────────
  // Usa sempre visibleClients (che ha team e bolle arricchiti).
  // Quando il flag è spento, mostra tutti i clienti con qualsiasi commessa.
  const byProjectClients = visibleClients
  .filter(c => {
    if (!c.nome_progetto.toLowerCase().includes(filterClient.toLowerCase())) return false;
    if (!showOnlyActiveProject) return true; // flag spento → tutti i clienti
    return c.commesse.some(co => co.attiva !== false); // flag attivo → solo chi ha almeno una commessa attiva
  })
  .map(c => ({
    ...c,
    commesse: c.commesse.filter(co => showOnlyActiveProject ? co.attiva !== false : true),
  }));
  if (!isLoggedIn) return (
    <>
      <style>{customStyles}</style>
      <LoginPage onLogin={(user) => { setIsLoggedIn(true); setCurrentUser(user); loadCurrentStaff(user); }} />
    </>
  );

  if (loading || (isLoggedIn && !staffLoaded)) return <LoadingOverlay />;

  return (
    <div className="container">
      <style>{customStyles}</style>

      <header style={{ background: '#fff', flexShrink: 0, boxShadow: '0 1px 0 #e2e8f0, 0 2px 12px rgba(0,84,166,0.06)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #0054a6 0%, #38bdf8 100%)' }} />
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', height: isMobile ? '52px' : '60px' }}>
          <div style={{ background: '#0054a6', padding: isMobile ? '0 14px' : '0 28px', display: 'flex', alignItems: 'center', minWidth: isMobile ? 'unset' : '220px', flexShrink: 0 }}>
            <img src="/Zucchetti-Centro-Sistemi-Spa.png" alt="Zucchetti Centro Sistemi"
              style={{ height: isMobile ? '26px' : '36px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, paddingLeft: '8px' }}>
            {isMobile ? (
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '0 8px' }}>
                <select value={view} onChange={e => { const val = e.target.value; setView(val); if (val === 'progetti') setProgettoAperto(null); }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', fontWeight: 600, color: '#0054a6', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%230054a6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                  {visibleTabs.map(tab => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
                </select>
              </div>
            ) : (
              visibleTabs.map(tab => (
                <button key={tab.key} onClick={() => { setView(tab.key); if (tab.key === 'progetti') setProgettoAperto(null); }}
                  style={{ padding: '0 20px', border: 'none', borderBottom: view === tab.key ? '2.5px solid #0054a6' : '2.5px solid transparent', background: 'transparent', color: view === tab.key ? '#0054a6' : '#64748b', fontWeight: view === tab.key ? 600 : 400, fontSize: '13px', cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: isMobile ? '0 10px' : '0 20px', flexShrink: 0 }}>
            {currentUser && (
              <div style={{ position: 'relative' }}>
                <div onClick={() => setShowUserMenu(p => !p)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 6px', borderRadius: '8px', transition: 'background 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #bfdbfe' }}>
                    {currentStaff?.avatar_url ? (
                      <img src={currentStaff.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                        {currentStaff ? `${(currentStaff.nome || '').slice(0, 1)}${(currentStaff.cognome || '').slice(0, 1)}`.toUpperCase() : (currentUser.email || '').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {!isMobile && (
                    <>
                      <span style={{ fontSize: '12px', color: '#475569', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentStaff ? `${currentStaff.nome} ${currentStaff.cognome}` : currentUser.email}
                      </span>
                      <span style={{ fontSize: '9px', color: '#94a3b8' }}>▼</span>
                    </>
                  )}
                </div>
                {showUserMenu && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowUserMenu(false)} />
                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '220px', zIndex: 999, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #f1f5f9', background: '#fafbfc' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {currentStaff ? `${currentStaff.nome} ${currentStaff.cognome}` : currentUser.email}
                        </div>
                        {currentStaff?.ruolo && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 2 }}>{currentStaff.ruolo}</div>}
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 2 }}>{currentUser.email}</div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s', fontSize: '13px', color: '#475569' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontSize: '16px' }}>📷</span>
                        <span>{currentStaff?.avatar_url ? 'Cambia foto profilo' : 'Carica foto profilo'}</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !currentStaff) return;
                          const ext = file.name.split('.').pop();
                          const path = `${currentStaff.id}.${ext}`;
                          const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
                          if (upErr) { alert('Errore upload: ' + upErr.message); return; }
                          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
                          const avatar_url = urlData.publicUrl + '?t=' + Date.now();
                          await supabase.from('staff').update({ avatar_url }).eq('id', currentStaff.id);
                          setCurrentStaff(p => ({ ...p, avatar_url }));
                          setShowUserMenu(false);
                        }} />
                      </label>
                      {currentStaff?.avatar_url && (
                        <div onClick={async () => {
                          await supabase.from('staff').update({ avatar_url: null }).eq('id', currentStaff.id);
                          setCurrentStaff(p => ({ ...p, avatar_url: null }));
                          setShowUserMenu(false);
                        }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', fontSize: '13px', color: '#dc2626', transition: 'background 0.15s' }}
                          onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          <span style={{ fontSize: '16px' }}>🗑</span>
                          <span>Rimuovi foto</span>
                        </div>
                      )}
                      <div onClick={() => { setShowThemeSelector(true); setShowUserMenu(false); }}
  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', fontSize: '13px', color: '#475569', transition: 'background 0.15s' }}
  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
  <span style={{ fontSize: '16px' }}>🎨</span>
  <span>Aspetto</span>
</div>
                      <div style={{ height: '0.5px', background: '#f1f5f9' }} />
                      <div onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', fontSize: '13px', color: '#475569', transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontSize: '16px' }}>🚪</span>
                        <span>Esci</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── VISTE ── */}
      {view === 'skills' ? (
        <DesktopOnly label="Matrice Skills">
          <div className="view-content animate-fade-in">
            <div className="toolbar">
              <div className="toolbar-left">
                <button className="menu-trigger-inline" onClick={() => setShowSidebarSkills(true)}><HamburgerIcon /></button>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '2px', marginLeft: '8px' }}>
                  {[{ key: 'matrice', label: 'Matrice' }, { key: 'storico', label: 'Storico' }, { key: 'formazione', label: 'Formazione' }].map(t => (
                    <button key={t.key} onClick={() => setSkillsSubView(t.key)} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer', background: skillsSubView === t.key ? '#fff' : 'transparent', color: skillsSubView === t.key ? '#0054a6' : '#64748b', fontWeight: skillsSubView === t.key ? 600 : 400, boxShadow: skillsSubView === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{t.label}</button>
                  ))}
                </div>
                {skillsSubView === 'matrice' && (
                  <div className="folder-tabs">
                    {SKILLS_FOLDERS.map((f) => <button key={f} className={activeFolder === f ? 'active' : ''} onClick={() => setActiveFolder(f)}>{f}</button>)}
                  </div>
                )}
              </div>
              <button onClick={() => setTrainingMode(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', marginLeft: 'auto', ...(trainingMode ? { background: '#fef3c7', borderColor: '#f59e0b', color: '#b45309' } : { background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }) }}>
                <span style={{ fontSize: '14px' }}>🎓</span>
                {trainingMode ? 'Esci da Formazione' : 'Modalità Formazione'}
              </button>
            </div>

            {skillsSubView === 'matrice' && (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8', marginRight: 4 }}>Scala:</span>
                {[{ v: 1, label: 'Base', bg: '#fef9c3', text: '#854d0e' }, { v: 2, label: 'Operativo', bg: '#dcfce7', text: '#166534' }, { v: 3, label: 'Esperto', bg: '#22c55e', text: '#fff' }, { v: 4, label: 'Referente', bg: '#15803d', text: '#fff' }].map(({ v, label, bg, text }) => (
                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '4px', background: bg, color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{v}</div>
                    <span style={{ color: '#475569' }}>{label}</span>
                  </div>
                ))}
                <span style={{ marginLeft: 'auto', color: '#94a3b8', fontStyle: 'italic' }}>Clicca una cella per aggiornare — ogni modifica è storicizzata</span>
              </div>
              {trainingMode && (
                <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '6px 24px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎓</span>
                  <strong>Modalità Formazione attiva</strong> — clicca le celle per segnare le skill da monitorare. Il valore non cambia.
                </div>
              )}
              <div className="table-container">
                <table className="skills-table">
                  <thead>
                    <tr>
                      <th className="sticky-col">Risorsa</th>
                      {skillsConfig[activeFolder].map((s) => <th key={s} title={s}>{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((person) => (
                      <tr key={person.id || staffKey(person)}>
                        <td className="sticky-col" style={{ padding: '6px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <Avatar name={staffLabel(person)} avatarUrl={person.avatar_url} size={28} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <strong style={{ fontSize: '13px' }}>{staffLabel(person)}</strong>
                              <span style={{ fontSize: '10px', fontStyle: 'italic', fontWeight: 300, color: '#94a3b8' }}>{person.ruolo || 'Consulente'}</span>
                            </div>
                          </div>
                        </td>
                        {skillsConfig[activeFolder].map((skill) => {
                          const v = matrix[`${staffKey(person)}-${skill}`] || 0;
                          const key = `${staffKey(person)}-${skill}`;
                          const isTraining = trainingCells[key];
                          const SKILL_LABELS = { 0: '', 1: 'Base', 2: 'Operativo', 3: 'Esperto', 4: 'Referente' };
                          const bgBase = v === 0 ? '#fff' : v === 1 ? '#fef9c3' : v === 2 ? '#dcfce7' : v === 3 ? '#22c55e' : '#15803d';
                          const textBase = v >= 3 ? '#fff' : v === 2 ? '#166534' : v === 1 ? '#854d0e' : '#94a3b8';
                          return (
                            <td key={skill} onClick={() => toggleSkill(person, skill)} className="skill-cell"
                              title={trainingMode ? 'Clicca per segnare/rimuovere dalla formazione' : v > 0 ? `${SKILL_LABELS[v]} — clicca per aggiornare` : 'Clicca per impostare il livello'}
                              style={{ cursor: 'pointer', backgroundColor: isTraining ? '#fef08a' : bgBase, color: isTraining ? '#78350f' : textBase, outline: isTraining ? '2px dashed #f59e0b' : 'none', outlineOffset: '-2px', transition: 'all 0.15s', position: 'relative', fontWeight: v > 0 ? 600 : 400, fontSize: '12px' }}>
                              {v > 0 ? v : ''}
                              {isTraining && <span style={{ position: 'absolute', top: 1, right: 2, fontSize: '7px', color: '#b45309', lineHeight: 1 }}>▲</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>)}
            {skillsSubView === 'storico' && <SkillStorico staff={staff} skillsConfig={skillsConfig} />}
            {skillsSubView === 'formazione' && (
              <SkillFormazione staff={staff} skillsConfig={skillsConfig} trainingCells={trainingCells} matrix={matrix}
                onRemove={async (sKey, skill) => {
                  const compositeKey = `${sKey}-${skill}`;
                  setTrainingCells(p => { const n = { ...p }; delete n[compositeKey]; return n; });
                  await supabase.from('skill_formazione').delete().eq('staff_key', sKey).eq('skill_key', skill);
                }}
              />
            )}
          </div>
        </DesktopOnly>

      ) : view === 'kpi' ? (
        <KPIView staff={staff} matrix={matrix} clients={visibleClients} assignments={assignments}
          skillsConfig={skillsConfig} currentMonths={currentMonths} trainingCells={trainingCells}
          isAdmin={isAdmin}
          onOpenProgetto={(progettoId, commessaId) => { setProgettoAperto({ progettoId, commessaId }); setView('progetti'); }} />

      ) : view === 'homeUser' ? (
        <HomeUser currentStaff={currentStaff} staff={staff} matrix={matrix} clients={visibleClients}
          assignments={assignments} currentMonths={currentMonths} skillsConfig={skillsConfig} trainingCells={trainingCells} />

      ) : view === 'todo' ? (
        <TodoView staff={staff} clients={visibleClients} />

      ) : view === 'progetti' ? (
        progettoAperto ? (
          <ProgettoView progettoId={progettoAperto.progettoId} commessaId={progettoAperto.commessaId}
            clients={visibleClients} staff={staff} currentUser={currentUser} onBack={() => setProgettoAperto(null)} />
        ) : (
          <ProgettiList clients={visibleClients} staff={staff} currentUser={currentUser}
            onOpenProgetto={(progettoId, commessaId) => setProgettoAperto({ progettoId, commessaId })} />
        )

      ) : (
        <DesktopOnly label="Pianificazione">
          <div className="view-content">
            <div className="toolbar">
              <div className="toolbar-left">
                <button className="menu-trigger-inline" onClick={() => setShowSidebarPlan(true)}><HamburgerIcon /></button>
                <div className="sub-view-tabs">
                  <button className={planSubView === 'byProject' ? 'active' : ''} onClick={() => setPlanSubView('byProject')}>Vista Clienti</button>
                  <button className={planSubView === 'byResource' || planSubView === 'weekly' ? 'active' : ''} onClick={() => setPlanSubView('byResource')}>Vista Risorse</button>
                  <button className={planSubView === 'gantt' ? 'active' : ''} onClick={() => setPlanSubView('gantt')}>Vista Gantt</button>
{isAdmin && (
  <button className={planSubView === 'kpi' ? 'active' : ''} onClick={() => setPlanSubView('kpi')}>KPI</button>
)}
                </div>
                {(planSubView === 'byResource' || planSubView === 'weekly') && (
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '2px' }}>
                    <button style={{ padding: '4px 12px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s', background: planSubView === 'byResource' ? '#fff' : 'transparent', color: planSubView === 'byResource' ? '#0054a6' : '#64748b', fontWeight: planSubView === 'byResource' ? 600 : 400, boxShadow: planSubView === 'byResource' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }} onClick={() => setPlanSubView('byResource')}>Mensile</button>
                    <button style={{ padding: '4px 12px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s', background: planSubView === 'weekly' ? '#fff' : 'transparent', color: planSubView === 'weekly' ? '#0054a6' : '#64748b', fontWeight: planSubView === 'weekly' ? 600 : 400, boxShadow: planSubView === 'weekly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }} onClick={() => setPlanSubView('weekly')}>Settimanale</button>
                  </div>
                )}
                <input type="text" placeholder="Cerca..." className="search-input"
                  value={planSubView === 'byResource' || planSubView === 'weekly' ? filterStaff : filterClient}
                  onChange={(e) => planSubView === 'byResource' || planSubView === 'weekly' ? setFilterStaff(e.target.value) : setFilterClient(e.target.value)} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
  {planSubView !== 'kpi' && (
    <button
      onClick={() => planSubView === 'gantt' ? setShowOnlyActiveGantt(v => !v) : planSubView === 'weekly' ? setShowOnlyActiveWeekly(v => !v) : planSubView === 'byResource' ? setShowOnlyActiveResource(v => !v) : setShowOnlyActiveProject(v => !v)}
      style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', ...((planSubView === 'gantt' ? showOnlyActiveGantt : planSubView === 'weekly' ? showOnlyActiveWeekly : planSubView === 'byResource' ? showOnlyActiveResource : showOnlyActiveProject) ? { background: '#f0fdf4', borderColor: '#22c55e', color: '#16a34a' } : { background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }) }}>
      <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {(planSubView === 'gantt' ? showOnlyActiveGantt : planSubView === 'weekly' ? showOnlyActiveWeekly : planSubView === 'byResource' ? showOnlyActiveResource : showOnlyActiveProject) && (
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'block' }} />
        )}
      </span>
      Solo attive
    </button>
  )}

                {(planSubView === 'weekly' || planSubView === 'byResource') && (
                  [{ key: 'clients', label: 'Espandi clienti' }, { key: 'commesse', label: 'Espandi commesse' }].map(btn => {
                    const state = planSubView === 'weekly' ? expandAllWeekly : expandAllResource;
                    const setter = planSubView === 'weekly' ? setExpandAllWeekly : setExpandAllResource;
                    const isActive = state[btn.key];
                    return (
                      <button key={btn.key} onClick={() => setter(prev => ({ ...prev, [btn.key]: !prev[btn.key] }))}
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', ...(isActive ? { background: '#eff6ff', borderColor: '#3b82f6', color: '#2563eb' } : { background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }) }}>
                        <span style={{ fontSize: '11px' }}>{isActive ? '▼' : '▶'}</span>
                        {btn.label}
                      </button>
                    );
                  })
                )}

{planSubView !== 'weekly' && planSubView !== 'kpi' && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>
                    <label>Inizio:</label>
                    <input type="month" className="month-picker-clean" style={{ background: 'transparent', border: 'none', fontWeight: 'bold' }}
                      value={(timeFilters[planSubView] || timeFilters['byProject']).start}
                      onChange={(e) => updateTimeFilter(planSubView, 'start', e.target.value)} />
                    <label>Mesi:</label>
                    <input type="number" min="1" max="60" style={{ width: '45px', border: 'none', background: 'white', borderRadius: '4px', textAlign: 'center' }}
                      value={(timeFilters[planSubView] || timeFilters['byProject']).horizon}
                      onChange={(e) => updateTimeFilter(planSubView, 'horizon', e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            {planSubView === 'kpi' ? (
  <KpiPianificazione
    staff={staff}
    clients={visibleClients}
    assignments={assignments}
  />
) : planSubView === 'gantt' ? renderGantt()
  : planSubView === 'weekly' ? (
                <WeeklyView staff={visibleStaff} clients={visibleClients} assignments={assignments} setAssignments={setAssignments}
                  filterStaff={filterStaff} showOnlyActive={showOnlyActiveWeekly}
                  expandClients={expandAllWeekly.clients} expandCommesse={expandAllWeekly.commesse} />
              ) : (
                <div className="table-container animate-fade-in">
                  <table>
                    <thead>
                      <tr>
                        <th className="sticky-col">Anagrafica</th>
                        {currentMonths.map((m) => <th key={m.label}>{m.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {planSubView === 'byProject'
                        ? byProjectClients.map((c) => (
                              <React.Fragment key={c.id}>
                                <tr className="row-client">
                                  <td className="sticky-col" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    onClick={() => setExpandedItems((p) => ({ ...p, [c.id]: !p[c.id] }))}>
                                    <span style={{ marginRight: '8px', width: '12px', display: 'inline-block' }}>{expandedItems[c.id] ? '▼' : '▶'}</span>
                                    <strong>{c.nome_progetto}</strong>
                                    <button className="btn-add-inline" title="Nuova Commessa" onClick={(e) => { e.stopPropagation(); openNewCommessaForClient(c.id); }}>+</button>
                                  </td>
                                  {currentMonths.map((m) => {
                                    const tot = c.commesse.flatMap(co => co.team.map(mem => parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0)).reduce((a, b) => a + b, 0);
                                    return <td key={m.label} style={{ textAlign: 'center', padding: '6px 4px' }}><span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>{tot || ''}</span></td>;
                                  })}
                                </tr>
                                {expandedItems[c.id] && c.commesse.map((co) => (
                                  <React.Fragment key={co.id}>
                                    <tr className="row-commessa">
                                      <td className="sticky-col indent-1" style={{ cursor: 'pointer' }} onClick={() => setExpandedItems((p) => ({ ...p, [co.id]: !p[co.id] }))}>
                                        <span style={{ marginRight: '8px', width: '12px', display: 'inline-block' }}>{expandedItems[co.id] ? '▼' : '▶'}</span>
                                        <span className="clickable-commessa" onClick={(e) => { e.stopPropagation(); openCommessaEdit(c.id, co.id); }}>{co.nome_commessa}</span>
                                        {co.attiva === false && <span style={{ marginLeft: 6, fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>chiusa</span>}
                                      </td>
                                      {currentMonths.map((m) => {
                                        const previsti = co.team.reduce((s, mem) => s + (parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0), 0);
                                        const svolti = parseFloat(getGiorniSvolti(co, m.label).toFixed(1));
                                        const pct = previsti > 0 ? Math.min(100, (svolti / previsti) * 100) : 0;
                                        const overBudget = svolti > previsti && previsti > 0;
                                        return (
                                          <td key={m.label} style={{ textAlign: 'center', padding: '4px' }}>
                                            {previsti > 0 || svolti > 0 ? (
                                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>{previsti || ''}</span>
                                                <div style={{ width: '36px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                                  <div style={{ width: `${overBudget ? 100 : pct}%`, height: '100%', background: overBudget ? '#E24B4A' : '#639922', borderRadius: '2px' }} />
                                                </div>
                                                {svolti > 0 && <span style={{ fontSize: '10px', color: overBudget ? '#E24B4A' : '#3B6D11', fontWeight: 600 }}>{svolti}</span>}
                                              </div>
                                            ) : ''}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                    {expandedItems[co.id] && co.team.map((st) => (
                                      <tr key={`${co.id}-${st}`} className="row-staff">
                                        <td className="sticky-col indent-2">{st}</td>
                                        {currentMonths.map((m) => (
                                          <td key={m.label}>
                                            <input type="number" step="0.5" min="0" className="cell-input"
                                              value={assignments[`${co.id}-${st}-${m.label}`] || ''}
                                              onChange={(e) => updateGg(co.id, st, m.label, e.target.value)} />
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                ))}
                              </React.Fragment>
                            ))
                        : visibleStaff.filter((s) => staffLabel(s).toLowerCase().includes(filterStaff.toLowerCase())).map((sObj) => {
                            const sName = staffKey(sObj);
                            const isStaffOpen = expandAllResource.clients || expandAllResource.commesse || !!expandedItems[sName];
                            const isClientOpen = (id) => expandAllResource.clients || expandAllResource.commesse || !!expandedItems[`r-${sName}-${id}`];
                            const isCommOpen = (id) => {
                              if (!isClientOpen(id)) return false;
                              if (expandAllResource.commesse) return true;
                              return !!expandedItems[`rcomm-${sName}-${id}`];
                            };
                            const toggleClientR = (id, e) => {
                              e.stopPropagation();
                              if (!isClientOpen(id)) {
                                setExpandedItems((p) => ({ ...p, [`r-${sName}-${id}`]: true, [`rcomm-${sName}-${id}`]: true }));
                              } else if (isCommOpen(id)) {
                                setExpandedItems((p) => ({ ...p, [`rcomm-${sName}-${id}`]: false }));
                              } else {
                                setExpandedItems((p) => ({ ...p, [`rcomm-${sName}-${id}`]: true }));
                              }
                            };
                            const toggleCommR = (id, e) => { e.stopPropagation(); setExpandedItems((p) => ({ ...p, [`rcomm-${sName}-${id}`]: !isCommOpen(id) })); };

                            const clientGroups = visibleClients
                              .map(cl => ({ cl, commesse: cl.commesse.filter(cm => cm.team.includes(sName) && (!showOnlyActiveResource || cm.attiva !== false)) }))
                              .filter(g => g.commesse.length > 0);

                            return (
                              <React.Fragment key={sName}>
                                <tr className="row-client" onClick={() => setExpandedItems((p) => ({ ...p, [sName]: !isStaffOpen }))} style={{ cursor: 'pointer' }}>
                                  <td className="sticky-col" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
                                    <Avatar name={sName} avatarUrl={sObj.avatar_url} size={30} />
                                    <strong>{staffLabel(sObj)}</strong>
                                    <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{isStaffOpen ? '▼' : '▶'}</span>
                                  </td>
                                  {currentMonths.map((m) => {
                                    const assigned = clientGroups.flatMap(g => g.commesse).reduce((s, cm) => s + (parseFloat(assignments[`${cm.id}-${sName}-${m.label}`]) || 0), 0);
                                    const residuo = workingDays(m.label) - assigned;
                                    const color = residuo < 5 ? '#dc2626' : residuo <= 10 ? '#d97706' : '#94a3b8';
                                    return <td key={m.label} style={{ textAlign: 'center' }}><span style={{ fontSize: '12px', fontWeight: residuo < 5 || residuo <= 10 ? 700 : 400, color }}>{residuo}</span></td>;
                                  })}
                                </tr>
                                {isStaffOpen && clientGroups.map(({ cl, commesse }) => (
                                  <React.Fragment key={`${sName}-${cl.id}`}>
                                    <tr className="row-commessa" style={{ cursor: 'pointer' }} onClick={(e) => toggleClientR(cl.id, e)}>
                                      <td className="sticky-col indent-1" style={{ color: '#2563eb', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ fontSize: 9, color: '#94a3b8', width: 10 }}>{isClientOpen(cl.id) ? '▼' : '▶'}</span>
                                          <span style={{ flex: 1 }}>{cl.nome_progetto}</span>
                                          {isClientOpen(cl.id) && (
                                            <span onClick={(e) => toggleCommR(cl.id, e)} style={{ fontSize: 9, color: isCommOpen(cl.id) ? '#2563eb' : '#94a3b8', padding: '2px 5px', borderRadius: '4px', background: isCommOpen(cl.id) ? '#eff6ff' : '#f1f5f9', cursor: 'pointer' }}>
                                              {isCommOpen(cl.id) ? '▴' : '▾'}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      {currentMonths.map((m) => (
                                        <td key={m.label} style={{ textAlign: 'center' }}>
                                          <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>
                                            {commesse.reduce((s, cm) => s + (parseFloat(assignments[`${cm.id}-${sName}-${m.label}`]) || 0), 0) || ''}
                                          </span>
                                        </td>
                                      ))}
                                    </tr>
                                    {isClientOpen(cl.id) && isCommOpen(cl.id) && commesse.map((ra) => (
                                      <tr key={`${sName}-${ra.id}`} className="row-staff">
                                        <td className="sticky-col indent-2">{ra.nome_commessa}</td>
                                        {currentMonths.map((m) => {
                                          const previsti = parseFloat(assignments[`${ra.id}-${sName}-${m.label}`]) || 0;
                                          const codiceOp = String(sObj.codice || '').trim();
                                          const parts = m.label.split(' ');
                                          const meseNum = mesiIT[parts[0]];
                                          const annoNum = '20' + parts[1];
                                          const annoMese = meseNum && annoNum ? `${annoNum}-${meseNum}` : null;
                                          const svolti = annoMese && codiceOp && (ra.bolle || []).length > 0
                                            ? parseFloat(
                                                (ra.bolle || []).reduce((tot, codBolla) => {
                                                  const key = `${codBolla}-${annoMese}-${codiceOp}`;
                                                  return tot + ((consuntiviGlobaliOp[key] || 0) / 8);
                                                }, 0).toFixed(1)
                                              )
                                            : 0;
                                          const pct = previsti > 0 ? Math.min(100, (svolti / previsti) * 100) : 0;
                                          const overBudget = svolti > previsti && previsti > 0;
                                          return (
                                            <td key={m.label} style={{ textAlign: 'center', padding: '4px' }}>
                                              {previsti > 0 || svolti > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                  <input
                                                    type="number" step="0.5" min="0" className="cell-input"
                                                    value={assignments[`${ra.id}-${sName}-${m.label}`] || ''}
                                                    onChange={(e) => updateGg(ra.id, sName, m.label, e.target.value)}
                                                    style={{ textAlign: 'center' }}
                                                  />
                                                  <div style={{ width: '36px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${overBudget ? 100 : pct}%`, height: '100%', background: overBudget ? '#E24B4A' : '#639922', borderRadius: '2px' }} />
                                                  </div>
                                                  {svolti > 0 && (
                                                    <span style={{ fontSize: '10px', color: overBudget ? '#E24B4A' : '#3B6D11', fontWeight: 600 }}>
                                                      {svolti}
                                                    </span>
                                                  )}
                                                </div>
                                              ) : (
                                                <input
                                                  type="number" step="0.5" min="0" className="cell-input"
                                                  value={assignments[`${ra.id}-${sName}-${m.label}`] || ''}
                                                  onChange={(e) => updateGg(ra.id, sName, m.label, e.target.value)}
                                                />
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                ))}
                              </React.Fragment>
                            );
                          })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </DesktopOnly>
      )}

      {/* ── SIDEBARS ── */}
      <div className={`sidebar-overlay ${showSidebarSkills ? 'active' : ''}`} onClick={() => setShowSidebarSkills(false)}>
        <div className="sidebar-content" onClick={(e) => e.stopPropagation()}>
          <div className="sidebar-header">
            <h3>Impostazioni Skills</h3>
            <button className="btn-close-circle" onClick={() => setShowSidebarSkills(false)}>×</button>
          </div>
          <div className="sidebar-body">
            <button className="sidebar-item" onClick={() => { setShowManageSkills(true); setShowSidebarSkills(false); }}>🔧 Gestisci Voci Skill</button>
            <button className="sidebar-item" onClick={() => { setShowManageStaff(true); setShowSidebarSkills(false); }}>👥 Gestisci Risorse</button>
            <div style={{ height: '0.5px', background: '#f1f5f9', margin: '8px 0' }} />
            {isAdmin && (
              <button className="sidebar-item" onClick={() => { setShowGestioneDati(true); setShowSidebarSkills(false); }}>📥 Gestione Dati</button>
            )}
          </div>
        </div>
      </div>

      <div className={`sidebar-overlay ${showSidebarPlan ? 'active' : ''}`} onClick={() => setShowSidebarPlan(false)}>
        <div className="sidebar-content" onClick={(e) => e.stopPropagation()}>
          <div className="sidebar-header">
            <h3>Gestione Planning</h3>
            <button className="btn-close-circle" onClick={() => setShowSidebarPlan(false)}>×</button>
          </div>
          <div className="sidebar-body">
            <button className="sidebar-item" onClick={() => { setShowClientModal(true); setShowSidebarPlan(false); }}>🏢 Inserisci Nuovo Cliente</button>
            <button className="sidebar-item" onClick={() => { setShowManageClientsModal(true); setShowSidebarPlan(false); }}>🛠️ Gestisci Anagrafica Clienti</button>
            <div style={{ height: '0.5px', background: '#f1f5f9', margin: '8px 0' }} />
            {isAdmin && (
              <button className="sidebar-item" onClick={() => { setShowGestioneDati(true); setShowSidebarPlan(false); }}>📥 Gestione Dati</button>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showManageSkills && <ManageSkillsModal skillsConfig={skillsConfig} setSkillsConfig={setSkillsConfig} onClose={() => { setShowManageSkills(false); loadAllData(); }} />}
      {showManageStaff && <ManageStaffModal staff={staff} isAdmin={isAdmin} onClose={() => { setShowManageStaff(false); loadAllData(); }} />}
      {showClientModal && <ClientModal staff={staff} matrix={matrix} onClose={() => { setShowClientModal(false); loadAllData(); }} />}
      {showManageClientsModal && (
        <ManageClientsModal clients={clients}
          onEdit={(c) => { const fresh = clients.find(x => x.id === c.id) || c; setSelectedClientEdit(fresh); setShowEditClientModal(true); setShowManageClientsModal(false); }}
          onClose={() => { setShowManageClientsModal(false); loadAllData(); }}
        />
      )}
      {showProjectModal && (
        <ProjectModal staff={staff} clients={clients} matrix={matrix} targetedEdit={targetedProjectEdit}
          onOpenProgetto={(progettoId, commessaId) => { setProgettoAperto({ progettoId, commessaId }); setView('progetti'); }}
          onClose={() => { setShowProjectModal(false); setTargetedProjectEdit(null); loadAllData(); }}
        />
      )}
      {showEditClientModal && selectedClientEdit && (
        <EditClientModal client={selectedClientEdit} staff={staff} matrix={matrix} clients={clients}
          onClose={async () => { await loadAllData(); setShowEditClientModal(false); setSelectedClientEdit(null); }}
        />
      )}
      {showImportExcelModal && <ImportExcelModal onClose={() => { setShowImportExcelModal(false); loadAllData(); }} />}
      {showGestioneDati && <GestioneDatiModal onClose={() => { setShowGestioneDati(false); loadAllData(); }} />}
{showThemeSelector && (
  <div className="modal-overlay" onClick={() => setShowThemeSelector(false)}>
    <div className="modal-content" onClick={e => e.stopPropagation()}
      style={{ width: '760px', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
      <button className="btn-close-circle" onClick={() => setShowThemeSelector(false)}>×</button>
      <ThemeSelector />
    </div>
  </div>
)}
    </div>
  );
}