"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, FileText, History, TrendingUp, CalendarDays,
  Plus, Edit2, Trash2, PenLine,
  ChevronRight, Banknote, Clock, Search,
  Save, ArrowLeft, FileDown, HardHat, X, BookOpen,
  MessageSquare,
} from 'lucide-react';
import * as store from './store';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const DEDUCTION_PRESETS = [
  { id: 'cnss',          label: 'Cotisation CNSS (Forfait ANAPEC)', defaultAmount: 200 },
  { id: 'ir',            label: 'Impôt sur le Revenu (IR)',          defaultAmount: 0   },
  { id: 'logement',      label: 'Retenue Logement',                  defaultAmount: 0   },
  { id: 'frais_logement',label: 'Frais de Logement',                 defaultAmount: 0   },
  { id: 'avance',        label: 'Avance sur Salaire',                defaultAmount: 0   },
  { id: 'nourriture',    label: 'Frais de Nourriture',               defaultAmount: 0   },
  { id: 'credit',        label: 'Crédit / Remboursement',            defaultAmount: 0   },
  { id: 'transport',     label: 'Retenue Transport',                 defaultAmount: 0   },
];

const ETATS = {
  paye:       { label: 'Payé',       color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: '✓' },
  non_paye:   { label: 'Non Payé',   color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: '✗' },
  en_attente: { label: 'En Attente', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: '⏳' },
};

const QUALIFICATIONS  = ['Ouvrier', "Chef d'équipe", 'Technicien', 'Conducteur', 'Ingénieur', 'Agent de sécurité', 'Administratif', 'Autre'];
const LODAFIN_QUALS   = ["Chef d'équipe", 'Technicien', 'Conducteur', 'Ingénieur', 'Administratif'];
const CONTRACT_TYPES  = ['ANAPEC', 'CDI', 'CDD', 'Journalier', 'Saisonnier'];

// Retourne le statut du contrat CDD : jours restants, couleur, label
function getCDDStatus(emp) {
  if (emp.typeContrat !== 'CDD' || !emp.dateFinContrat) return null;
  const fin   = new Date(emp.dateFinContrat);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  const diff = Math.round((fin - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { diff, label: `Expiré il y a ${Math.abs(diff)}j`, color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' };
  if (diff <= 30) return { diff, label: `Expire dans ${diff}j`, color: '#d97706', bg: '#fef3c7', border: '#fcd34d' };
  return { diff, label: `Expire dans ${diff}j`, color: '#16a34a', bg: '#f0fdf4', border: '#86efac' };
}

// ─────────────────────────────────────────────
// CONTRATS CONSTANTS & HELPERS
// ─────────────────────────────────────────────
const CONTRAT_TRAVAIL_TYPES = ['CDI', 'CDD', 'ANAPEC Tahfiz', 'ANAPEC Stage', 'Autre'];
const MOTIFS_FIN = ['Promotion CDI', 'Renouvellement CDD', 'Fin CDD', 'Fin de mission', 'Démission', 'Licenciement', 'Autre'];

const CONTRAT_STATUTS = {
  actif:                { label: 'Actif',                 color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: '✅' },
  termine:              { label: 'Terminé',               color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: '⏹' },
  en_attente_signature: { label: 'En attente signature',  color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: '✍️' },
  en_attente_anapec:    { label: 'En attente ANAPEC',     color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: '⏳' },
};

const CONTRAT_TYPE_COLORS = {
  'CDI':          { color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  'CDD':          { color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
  'ANAPEC Tahfiz':{ color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  'ANAPEC Stage': { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  'Autre':        { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
};

function computeStatut(contrat) {
  if (contrat.statut === 'termine') return 'termine';
  if (contrat.typeContrat === 'CDI' && !contrat.dateSignature) return 'en_attente_signature';
  if ((contrat.typeContrat === 'ANAPEC Tahfiz' || contrat.typeContrat === 'ANAPEC Stage') && !contrat.dateApprobationAnapec) return 'en_attente_anapec';
  return 'actif';
}

function isAnapec(type) {
  return type === 'ANAPEC Tahfiz' || type === 'ANAPEC Stage';
}

// ─────────────────────────────────────────────
// DEDUCTIONS LIST (reusable — modal + paie)
// ─────────────────────────────────────────────
function DeductionsList({ deductions, onChange, small = false }) {
  const [customMode, setCustomMode] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState(0);

  const available = DEDUCTION_PRESETS.filter(p => !deductions.find(d => d.key === p.id));

  const remove = (key) => onChange(deductions.filter(d => d.key !== key));
  const updateAmount = (key, val) =>
    onChange(deductions.map(d => d.key === key ? { ...d, amount: parseFloat(val) || 0 } : d));
  const addPreset = (p) =>
    onChange([...deductions, { key: p.id, label: p.label, amount: p.defaultAmount }]);
  const addCustom = () => {
    if (!customLabel.trim()) return;
    const key = `autre_${Date.now()}`;
    onChange([...deductions, { key, label: customLabel.trim(), amount: parseFloat(customAmount) || 0 }]);
    setCustomLabel(''); setCustomAmount(0); setCustomMode(false);
  };

  const px = small ? '3px 5px' : '7px 10px';
  const fs = small ? '10px' : '11px';

  return (
    <div>
      {/* List */}
      {deductions.map(d => (
        <div key={d.key} style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px',
          background:'#f8fafc', padding: px, borderRadius:'6px', border:'1px solid #e2e8f0' }}>
          <span style={{ flex:1, fontSize:fs, color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.label}</span>
          <input type="number" value={d.amount}
            onChange={e => updateAmount(d.key, e.target.value)}
            style={{ width: small?'60px':'72px', border:'1px solid #e2e8f0', borderRadius:'4px',
              padding: small?'2px 5px':'3px 7px', fontSize:fs, textAlign:'right' }}
          />
          <span style={{ fontSize:'9px', color:'#94a3b8', flexShrink:0 }}>DH</span>
          <button onClick={() => remove(d.key)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:'2px', flexShrink:0 }}>
            <Trash2 size={small?11:12} />
          </button>
        </div>
      ))}

      {/* Preset chips */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginTop:'6px' }}>
        {available.map(p => (
          <button key={p.id} onClick={() => addPreset(p)}
            style={{ fontSize:'9px', background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe',
              borderRadius:'4px', padding:'3px 8px', cursor:'pointer', fontWeight:600 }}>
            + {p.label.split(' ').slice(0,2).join(' ')}
          </button>
        ))}

        {/* Autre custom */}
        {!customMode ? (
          <button onClick={() => setCustomMode(true)}
            style={{ fontSize:'9px', background:'#f5f3ff', color:'#7c3aed', border:'1px solid #ddd6fe',
              borderRadius:'4px', padding:'3px 8px', cursor:'pointer', fontWeight:600 }}>
            + Autre…
          </button>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'2px', width:'100%',
            background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:'6px', padding:'5px 8px' }}>
            <input
              autoFocus
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              placeholder="Libellé retenue..."
              style={{ flex:1, border:'1px solid #c4b5fd', borderRadius:'4px', padding:'3px 7px',
                fontSize:'11px', minWidth:'0' }}
            />
            <input type="number" value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              style={{ width:'65px', border:'1px solid #c4b5fd', borderRadius:'4px',
                padding:'3px 5px', fontSize:'11px', textAlign:'right' }}
            />
            <span style={{ fontSize:'9px', color:'#7c3aed' }}>DH</span>
            <button onClick={addCustom}
              style={{ background:'#7c3aed', color:'white', border:'none', borderRadius:'4px',
                padding:'3px 8px', cursor:'pointer', fontSize:'11px', fontWeight:700 }}>✓</button>
            <button onClick={() => { setCustomMode(false); setCustomLabel(''); }}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'2px' }}>
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
function Sidebar({ view, setView }) {
  const nav = [
    { id: 'dashboard',      icon: LayoutDashboard, label: 'Dashboard'      },
    { id: 'employees',      icon: Users,           label: 'Employés'       },
    { id: 'contrats',       icon: PenLine,         label: 'Contrats'       },
    { id: 'pointage',       icon: CalendarDays,    label: 'Pointage'       },
    { id: 'paie',           icon: FileText,        label: 'Paie'           },
    { id: 'historique',     icon: History,         label: 'Historique'     },
    { id: 'finance',        icon: TrendingUp,      label: 'Finance'        },
    { id: 'documentation',  icon: BookOpen,        label: 'Documentation'  },
  ];
  return (
    <div style={{ width: '220px', background: '#0f2d5a', display: 'flex', flexDirection: 'column', minHeight: '100vh', flexShrink: 0 }}>
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ background: '#2563eb', borderRadius: '8px', padding: '7px', display: 'flex' }}>
          <HardHat size={18} color="white" />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#fff', letterSpacing: '1px' }}>ISSORKAS</div>
          <div style={{ fontSize: '9px', color: '#93c5fd', letterSpacing: '2px', textTransform: 'uppercase' }}>Gestion RH</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {nav.map(({ id, icon: Icon, label }) => {
          const active = view === id;
          return (
            <button key={id} onClick={() => setView(id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '8px', marginBottom: '3px',
              background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
              border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'transparent'}`,
              color: active ? '#fff' : '#93c5fd',
              cursor: 'pointer', fontSize: '13px', fontWeight: active ? 700 : 400,
            }}>
              <Icon size={16} />
              {label}
              {active && <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '9px', color: '#475569', lineHeight: 1.6 }}>
        STE ISSORKAS SARL AU<br />ICE: 003695935000057
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────
function TopBar({ title, subtitle, actions }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f2d5a', margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
function StatCard({ label, value, Icon, color, bg }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ background: bg, borderRadius: '10px', padding: '10px', display: 'flex' }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f2d5a' }}>{value}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{label}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
function DashboardView({ employees, bulletins, setView, setSelectedEmp }) {
  const actifs        = employees.filter(e => e.actif !== false).length;
  const masse         = employees.filter(e => e.actif !== false).reduce((s, e) => s + (e.salaireBrut || 0), 0);
  const enAttente     = bulletins.filter(b => b.etat === 'en_attente').length;
  const moisActuel    = new Date().toLocaleString('fr-FR', { month: 'long' }).toLowerCase();
  const cesMois       = bulletins.filter(b => b.periode?.toLowerCase().includes(moisActuel)).length;

  // CDDs qui expirent dans les 60 prochains jours ou déjà expirés
  const cddAlerts = employees
    .filter(e => e.actif !== false && e.typeContrat === 'CDD' && e.dateFinContrat)
    .map(e => ({ ...e, cddSt: getCDDStatus(e) }))
    .filter(e => e.cddSt && e.cddSt.diff <= 60)
    .sort((a, b) => a.cddSt.diff - b.cddSt.diff);

  return (
    <div style={{ padding: '24px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Employés actifs"   value={actifs}                             Icon={Users}     color="#2563eb" bg="#eff6ff" />
        <StatCard label="Masse Salariale"   value={`${masse.toLocaleString()} DH`}    Icon={Banknote}  color="#16a34a" bg="#f0fdf4" />
        <StatCard label="Bulletins ce mois" value={cesMois}                            Icon={FileText}  color="#7c3aed" bg="#f5f3ff" />
        <StatCard label="En Attente"        value={enAttente}                          Icon={Clock}     color="#d97706" bg="#fffbeb" />
      </div>

      {/* Alerte CDDs expirant */}
      {cddAlerts.length > 0 && (
        <div style={{ background: '#fffbeb', border: '2px solid #fcd34d', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span style={{ fontWeight: 800, color: '#d97706', fontSize: '13px' }}>
              {cddAlerts.length} CDD à renouveler ou clôturer
            </span>
            <button onClick={() => setView('employees')} style={{ marginLeft: 'auto', fontSize: '11px', color: '#d97706', background: 'none', border: '1px solid #fcd34d', borderRadius: '5px', padding: '3px 10px', cursor: 'pointer', fontWeight: 700 }}>
              Gérer →
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {cddAlerts.map(emp => (
              <div key={emp._id || emp.id} style={{ background: emp.cddSt.bg, border: `1px solid ${emp.cddSt.border}`, borderRadius: '7px', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: emp.cddSt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                  {emp.nom.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '12px' }}>{emp.nom}</div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: emp.cddSt.color }}>{emp.cddSt.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Derniers bulletins */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f2d5a' }}>Derniers Bulletins</span>
            <button onClick={() => setView('historique')} style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Voir tout →</button>
          </div>
          {bulletins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: '#94a3b8', fontSize: '12px' }}>Aucun bulletin généré</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['Employé','Période','Net','État'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bulletins.slice(0, 6).map(b => {
                  const e = ETATS[b.etat] || ETATS.en_attente;
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 600, color: '#1e293b' }}>{b.employeeNom}</td>
                      <td style={{ padding: '8px', color: '#64748b' }}>{b.periode}</td>
                      <td style={{ padding: '8px', fontWeight: 700, color: '#0f2d5a' }}>{(b.netAPayer || 0).toLocaleString()} DH</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ background: e.bg, color: e.color, border: `1px solid ${e.border}`, borderRadius: '10px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>
                          {e.icon} {e.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Employés */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f2d5a' }}>Employés</span>
            <button onClick={() => setView('employees')} style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Gérer →</button>
          </div>
          {employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px', color: '#94a3b8', fontSize: '12px' }}>Aucun employé enregistré</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {employees.slice(0, 5).map(emp => (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1a4fa0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white' }}>
                      {emp.nom.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{emp.nom}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{emp.qualification} — Mat: {emp.matricule}</div>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedEmp(emp); setView('paie'); }}
                    style={{ fontSize: '10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '5px', padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                    Paie →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPLOYEE MODAL
// ─────────────────────────────────────────────
function EmployeeModal({ employee, onSave, onClose }) {
  const [form, setForm] = useState(employee || {
    nom: '', matricule: '', cin: '', telephone: '',
    qualification: 'Ouvrier', salaireBrut: 0,
    typeContrat: 'ANAPEC', dateEmbauche: new Date().toISOString().split('T')[0],
    dateFinContrat: '', actif: true,
    deductionsDefaut: [{ key: 'cnss', label: 'Cotisation CNSS (Forfait ANAPEC)', amount: 200 }],
  });
  const [deds, setDeds] = useState(form.deductionsDefaut || []);

  const submit = () => {
    if (!form.nom.trim()) return alert('Le nom est obligatoire');
    onSave({ ...form, deductionsDefaut: deds });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '580px', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ padding: '16px 20px', background: '#0f2d5a', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>{employee ? 'Modifier l\'employé' : 'Nouvel Employé'}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '5px 8px', color: '#fff', cursor: 'pointer' }}><X size={15} /></button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="Nom & Prénom *" value={form.nom}       onChange={v => setForm({...form, nom: v})} />
            <Field label="Matricule"      value={form.matricule}  onChange={v => setForm({...form, matricule: v})} />
            <Field label="CIN"            value={form.cin}        onChange={v => setForm({...form, cin: v})} />
            <Field label="Téléphone"      value={form.telephone}  onChange={v => setForm({...form, telephone: v})} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <SelectField label="Qualification" value={form.qualification} options={QUALIFICATIONS} onChange={v => setForm({...form, qualification: v})} />
            <SelectField label="Type Contrat"  value={form.typeContrat}   options={CONTRACT_TYPES}  onChange={v => setForm({...form, typeContrat: v, dateFinContrat: v === 'CDD' ? form.dateFinContrat : ''})} />
            <Field label="Date d'embauche" type="date" value={form.dateEmbauche} onChange={v => setForm({...form, dateEmbauche: v})} />
          </div>

          {/* Date fin CDD */}
          {form.typeContrat === 'CDD' && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px 14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', display: 'block', marginBottom: '6px' }}>
                📋 CDD — Date de fin de contrat *
              </label>
              <Field label="" type="date" value={form.dateFinContrat} onChange={v => setForm({...form, dateFinContrat: v})} />
              {form.dateFinContrat && (() => {
                const st = getCDDStatus({...form});
                return st ? (
                  <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 700, color: st.color }}>
                    {st.label}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <Field label="Salaire Brut Base (DH)" type="number" value={form.salaireBrut} onChange={v => setForm({...form, salaireBrut: parseFloat(v)||0})} />

          {/* Statut actif/inactif */}
          {employee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: form.actif ? '#f0fdf4' : '#fef2f2', border: `1px solid ${form.actif ? '#86efac' : '#fca5a5'}`, borderRadius: '8px', padding: '10px 14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: form.actif ? '#16a34a' : '#dc2626', flex: 1 }}>
                {form.actif ? '✅ Employé actif' : '🔴 Employé inactif / archivé'}
              </span>
              <button onClick={() => setForm({...form, actif: !form.actif})}
                style={{ background: form.actif ? '#fef2f2' : '#f0fdf4', color: form.actif ? '#dc2626' : '#16a34a', border: `1px solid ${form.actif ? '#fca5a5' : '#86efac'}`, borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                {form.actif ? 'Archiver' : 'Réactiver'}
              </button>
            </div>
          )}

          {/* Retenues par défaut */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f2d5a', display: 'block', marginBottom: '8px' }}>Retenues par défaut</label>
            <DeductionsList deductions={deds} onChange={setDeds} />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <button onClick={onClose} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: '7px', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}>Annuler</button>
            <button onClick={submit} style={{ padding: '8px 20px', background: '#0f2d5a', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={14} /> Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type='text', value, onChange }) {
  return (
    <div>
      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 10px', fontSize: '12px', color: '#1e293b', boxSizing: 'border-box', outline: 'none' }} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 10px', fontSize: '12px', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPLOYEES VIEW
// ─────────────────────────────────────────────
function EmployeesView({ employees, setEmployees }) {
  const [search,    setSearch]    = useState('');
  const [filterActif, setFilterActif] = useState('actif'); // 'actif' | 'inactif' | 'tous'
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = employees.filter(e => {
    const matchSearch = e.nom.toLowerCase().includes(search.toLowerCase()) || (e.matricule || '').toLowerCase().includes(search.toLowerCase());
    const matchActif  = filterActif === 'tous' ? true : filterActif === 'actif' ? e.actif !== false : e.actif === false;
    return matchSearch && matchActif;
  });

  const handleSave = async (emp) => {
    setEmployees(await store.saveEmployee(emp));
    setShowModal(false); setEditing(null);
  };

  const handleDelete = async (id) => {
    setEmployees(await store.deleteEmployee(id));
    setConfirmDel(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou matricule..."
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '32px', padding: '9px 10px 9px 32px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} />
        </div>
        {/* Filtre actif/inactif */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[['actif','✅ Actifs'],['inactif','🔴 Archivés'],['tous','Tous']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterActif(v)}
              style={{ padding: '7px 12px', fontSize: '11px', fontWeight: 700, borderRadius: '7px', cursor: 'pointer', border: `2px solid ${filterActif===v ? '#0f2d5a' : '#e2e8f0'}`, background: filterActif===v ? '#0f2d5a' : '#fff', color: filterActif===v ? '#fff' : '#64748b' }}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f2d5a', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
          <Plus size={14} /> Ajouter Employé
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#0f2d5a' }}>
              {['Employé','CIN','Qualification','Contrat','Fin Contrat','Salaire Brut','Embauche','Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '10px', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Aucun employé trouvé</td></tr>
            ) : filtered.map((emp, i) => {
              const cddSt = getCDDStatus(emp);
              const inactif = emp.actif === false;
              return (
              <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9', background: inactif ? '#fafafa' : (i%2===0?'#fff':'#fafafa'), opacity: inactif ? 0.65 : 1 }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: inactif ? '#94a3b8' : '#1a4fa0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {emp.nom.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: inactif ? '#94a3b8' : '#0f2d5a' }}>{emp.nom}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        Mat: {emp.matricule || '—'}
                        {inactif && <span style={{ marginLeft: '6px', color: '#dc2626', fontWeight: 700 }}>• Archivé</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 14px', color: '#475569' }}>{emp.cin || '—'}</td>
                <td style={{ padding: '12px 14px', color: '#475569' }}>{emp.qualification}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>{emp.typeContrat}</span>
                </td>
                {/* Fin contrat CDD */}
                <td style={{ padding: '12px 14px' }}>
                  {cddSt ? (
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{emp.dateFinContrat}</div>
                      <span style={{ background: cddSt.bg, color: cddSt.color, border: `1px solid ${cddSt.border}`, borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 700 }}>
                        {cddSt.label}
                      </span>
                    </div>
                  ) : <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>}
                </td>
                <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f2d5a' }}>{(emp.salaireBrut||0).toLocaleString()} DH</td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>{emp.dateEmbauche || '—'}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setEditing(emp); setShowModal(true); }}
                      style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', display: 'flex' }}>
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => setConfirmDel(emp)}
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && <EmployeeModal employee={editing} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null); }} />}

      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '28px', width: '360px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ color: '#0f2d5a', marginBottom: '8px', margin: '0 0 8px' }}>Supprimer l'employé ?</h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 22px' }}><strong>{confirmDel.nom}</strong> sera supprimé définitivement.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDel(null)} style={{ padding: '9px 22px', border: '1px solid #e2e8f0', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' }}>Annuler</button>
              <button onClick={() => handleDelete(confirmDel.id)} style={{ padding: '9px 22px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BULLETIN A5 PREVIEW
// ─────────────────────────────────────────────
const BulletinPreview = React.forwardRef(({ employee, deductions, netAPayer }, ref) => {
  const etat = ETATS[employee.etat] || ETATS.en_attente;
  return (
    <div ref={ref} style={{
      width: '210mm', height: '148mm', background: '#fff',
      boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '10px', color: '#1e293b',
      position: 'relative', overflow: 'hidden', padding: '5px 6px 0 6px',
    }}>
      {/* Header */}
      <div style={{ borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
        <div style={{ background: '#1a4fa0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 20px', borderBottom: '2px solid #2d65b8' }}>
          <span style={{ fontSize: '13px', fontWeight: 900, color: '#fff', letterSpacing: '3px', textTransform: 'uppercase' }}>STE ISSORKAS SARL AU</span>
        </div>
        <div style={{ background: '#2158b4', display: 'flex', alignItems: 'stretch', height: '42px' }}>
          <div style={{ background: '#1a4fa0', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', borderRight: '3px solid #3b72d0', minWidth: '165px' }}>
            <div style={{ width: '4px', height: '26px', background: '#fff', borderRadius: '2px' }} />
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}><span style={{ fontWeight: 300 }}>i</span>SSORKAS</span>
          </div>
          <div style={{ background: '#2563eb', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 800 }}>Travaux de fonçage Et Exploitation minière</div>
              <div style={{ fontSize: '9px', color: '#fff', fontWeight: 800 }}>Travaux divers ou construction...</div>
            </div>
          </div>
          <div style={{ background: '#1a4fa0', display: 'flex', alignItems: 'center', padding: '0 14px', borderLeft: '3px solid #3b72d0' }}>
            <div style={{ background: '#fff', borderRadius: '4px', padding: '4px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', fontWeight: 900, color: '#1a4fa0', letterSpacing: '1px', textTransform: 'uppercase' }}>Bulletin</div>
              <div style={{ fontSize: '9px', fontWeight: 900, color: '#1a4fa0', letterSpacing: '1px', textTransform: 'uppercase' }}>de Paie</div>
            </div>
          </div>
        </div>
        <div style={{ background: '#12387a', padding: '3px 16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          {[['ICE','003695935000057'],['IF','47185275'],['RC','13369'],['CB BMCE','011550000000121000021464603']].map(([k,v]) => (
            <span key={k} style={{ fontSize: '7.5px', color: '#fff', fontWeight: 800, whiteSpace: 'nowrap' }}>{k}: {v}</span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '7.5px', color: '#fff', fontWeight: 800, whiteSpace: 'nowrap' }}>Chantier: TANCHERFI L.E.M : 323316</span>
        </div>
      </div>

      {/* Corps */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8px 14px' }}>
        {/* Infos salarié */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '5px', marginBottom: '7px' }}>
          {[{l:'Salarié',v:employee.nom},{l:'Matricule',v:employee.matricule},{l:'Période',v:employee.periode},{l:'Qualification',v:employee.qualification}].map(({l,v}) => (
            <div key={l} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 6px' }}>
              <div style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>{l}</div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#1a4fa0', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
          <thead>
            <tr style={{ background: '#1a4fa0', color: 'white' }}>
              {['Désignation','Base / Brut','Gains','Retenues'].map((h,i) => (
                <th key={h} style={{ padding: '4px 8px', fontWeight: 700, fontSize: '8px', textTransform: 'uppercase', border: '1px solid #2563eb', textAlign: i===0?'left':'right' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '3px 8px', fontWeight: 600 }}>Salaire Brut de Base</td>
              <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700 }}>{(parseFloat(employee.salaireBrut)||0).toFixed(2)}</td>
              <td style={{ padding: '3px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
              <td style={{ padding: '3px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
            </tr>
            {deductions.map((d,i) => (
              <tr key={d.key} style={{ background: i%2===0?'#fafafa':'#fff', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '3px 8px', color: '#475569' }}>{d.label}</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                <td style={{ padding: '3px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>({(parseFloat(d.amount)||0).toFixed(2)})</td>
              </tr>
            ))}
            <tr style={{ background: '#eff6ff', borderTop: '2px solid #1a4fa0' }}>
              <td style={{ padding: '4px 8px', fontWeight: 800, color: '#1a4fa0' }}>
                NET À PAYER
                <span style={{ marginLeft: '10px', background: etat.bg, color: etat.color, border: `1px solid ${etat.border}`, borderRadius: '10px', padding: '1px 8px', fontSize: '8px', fontWeight: 800 }}>
                  {etat.icon} {etat.label}
                </span>
              </td>
              <td style={{ padding: '4px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
              <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800, color: '#16a34a', fontSize: '11px' }}>{netAPayer.toFixed(2)}</td>
              <td style={{ padding: '4px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
          {[
            { bg: '#1a4fa0', label: 'Signature & Cachet Employeur', sub: 'STE ISSORKAS SARL AU', color: '#1a4fa0', subColor: '#94a3b8' },
            { bg: '#2563eb', label: "Signature de l'Employé",       sub: `Date : ${employee.datePaiement}`, color: '#2563eb', subColor: '#64748b' },
          ].map(({ bg, label, sub, color, subColor }) => (
            <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '5px', padding: '7px 10px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <div style={{ background: bg, borderRadius: '4px', padding: '4px', display: 'flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    {bg === '#1a4fa0'
                      ? <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>
                      : <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>}
                  </svg>
                </div>
                <span style={{ fontWeight: 700, color, fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
              </div>
              <div style={{ height: '20px', borderBottom: '1.5px dashed #94a3b8', marginBottom: '3px' }} />
              <div style={{ color: subColor, fontSize: '7.5px', textAlign: 'right' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '5px', paddingTop: '4px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '7px', color: '#94a3b8' }}>
          STE ISSORKAS SARL AU — ICE: 003695935000057 — IF: 47185275 — RC: 13369 — Chantier TANCHERFI L.E.M : 323316 | Conforme au Code du Travail Marocain &amp; régime ANAPEC 2026
        </div>
      </div>
    </div>
  );
});

// Convertit "Mars 2026" → "03/2026"
const MOIS_FR = { janvier:'01', février:'02', mars:'03', avril:'04', mai:'05', juin:'06', juillet:'07', août:'08', septembre:'09', octobre:'10', novembre:'11', décembre:'12' };
function periodeToMois(periode) {
  if (!periode) return null;
  const parts = periode.toLowerCase().trim().split(/\s+/);
  const m = MOIS_FR[parts[0]];
  const y = parts[1];
  return m && y ? `${m}/${y}` : null;
}

// ─────────────────────────────────────────────
// PASSER PAIE DU MOIS (bulk)
// ─────────────────────────────────────────────
function PasserPaieView({ employees, setBulletins }) {
  const moisLabel = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase());

  const [periode,       setPeriode]       = useState(moisLabel);
  const [datePaiement,  setDatePaiement]  = useState(new Date().toISOString().split('T')[0]);
  const [etatGlobal,    setEtatGlobal]    = useState('en_attente');
  const [done,          setDone]          = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [pointageMap,   setPointageMap]   = useState({}); // { empId: { p, ouv, salCalc } }
  const [pointageLoaded, setPointageLoaded] = useState(false);

  // Charger le pointage quand la période change
  useEffect(() => {
    const mois = periodeToMois(periode);
    if (!mois) return;
    setPointageLoaded(false);
    store.getPointage(mois).then(data => {
      if (!data || data.length === 0) { setPointageMap({}); return; }
      const map = {};
      data.forEach(pt => {
        const jours = pt.jours || {};
        const p   = Object.values(jours).filter(v => v === 'P').length;
        const [m, y] = mois.split('/').map(Number);
        const nbDays = new Date(y, m, 0).getDate();
        const days = Array.from({ length: nbDays }, (_, i) => i + 1);
        const emp = employees.find(e => String(e._id || e.id) === String(pt.employeeId));
        const isJourn  = emp?.typeContrat === 'Journalier';
        const isLodafE = LODAFIN_QUALS.includes(emp?.qualification);
        let ouv, salCalc;
        if (isJourn) {
          ouv = nbDays;
          salCalc = Math.round(pt.salaireBrut * p);
        } else if (isLodafE) {
          ouv = 26;
          salCalc = Math.round((pt.salaireBrut / 26) * p);
        } else {
          ouv = 30;
          salCalc = Math.round((pt.salaireBrut / 30) * p);
        }
        map[String(pt.employeeId)] = { p, ouv, salCalc, salaireBrut: pt.salaireBrut, isJourn };
      });
      setPointageMap(map);
      setPointageLoaded(Object.keys(map).length > 0);
    }).catch(() => setPointageMap({}));
  }, [periode, employees]);

  // Per-employee state: { selected, extraDeductions, expanded }
  const initStates = () => Object.fromEntries(
    employees.map(e => [e._id || e.id, { selected: true, extraDeductions: [], expanded: false }])
  );
  const [empStates, setEmpStates] = useState(initStates);

  useEffect(() => { setEmpStates(initStates()); }, [employees.length]);

  const empId    = e => e._id || e.id;
  const getState = e => empStates[empId(e)] || { selected: true, extraDeductions: [], expanded: false };

  // Salaire effectif: depuis pointage si disponible, sinon salaire de base
  const getSalaireEffectif = (emp) => {
    const pt = pointageMap[String(empId(emp))];
    return pt ? pt.salCalc : (emp.salaireBrut || 0);
  };

  const getDeductions = (emp) => [
    ...(emp.deductionsDefaut || []),
    ...(getState(emp).extraDeductions),
  ];
  const getNet = (emp) => getSalaireEffectif(emp) - getDeductions(emp).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

  const selected   = employees.filter(e => getState(e).selected);
  const totalBrut  = selected.reduce((s, e) => s + (e.salaireBrut || 0), 0);
  const totalNet   = selected.reduce((s, e) => s + getNet(e), 0);

  const toggle = (emp) => setEmpStates(prev => ({
    ...prev, [empId(emp)]: { ...getState(emp), selected: !getState(emp).selected }
  }));
  const toggleExpand = (emp) => setEmpStates(prev => ({
    ...prev, [empId(emp)]: { ...getState(emp), expanded: !getState(emp).expanded }
  }));

  const handleLancer = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      for (const emp of selected) {
        const deds      = getDeductions(emp);
        const salEff    = getSalaireEffectif(emp);
        const pt        = pointageMap[String(empId(emp))];
        await store.saveBulletin({
          employeeId: empId(emp), employeeNom: emp.nom,
          matricule: emp.matricule, qualification: emp.qualification,
          typeContrat: emp.typeContrat,
          salaireBrut: salEff,
          joursTravailles: pt?.p || null,
          joursOuvrables:  pt?.ouv || null,
          deductions: deds, netAPayer: getNet(emp),
          periode, datePaiement, etat: etatGlobal,
        });
      }
      const updated = await store.getBulletins();
      setBulletins(updated);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginBottom: '8px' }}>
        {selected.length} bulletin(s) généré(s) avec succès !
      </h3>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>Période : {periode} — Net total : {totalNet.toLocaleString()} DH</p>
      <button onClick={() => { setDone(false); setEmpStates(initStates()); }}
        style={{ background: '#0f2d5a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
        Nouvelle Paie
      </button>
    </div>
  );

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Paramètres globaux */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f2d5a', marginBottom: '12px' }}>⚙️ Paramètres de la Paie</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Période</label>
            <input value={periode} onChange={e => setPeriode(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', width: '160px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Date de Paiement</label>
            <input type="date" value={datePaiement} onChange={e => setDatePaiement(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 12px', fontSize: '12px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>État</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {Object.entries(ETATS).map(([key, e]) => (
                <button key={key} onClick={() => setEtatGlobal(key)}
                  style={{ padding: '7px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    border: `2px solid ${etatGlobal === key ? e.color : '#e2e8f0'}`,
                    background: etatGlobal === key ? e.bg : '#f8fafc',
                    color: etatGlobal === key ? e.color : '#94a3b8',
                  }}>
                  {e.icon} {e.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {pointageLoaded && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '5px 10px' }}>
                📅 Pointage chargé ✓
              </span>
            )}
            <button onClick={() => setEmpStates(Object.fromEntries(employees.map(e => [empId(e), { ...getState(e), selected: true }])))}
              style={{ fontSize: '11px', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer' }}>
              Tout sélectionner
            </button>
            <button onClick={() => setEmpStates(Object.fromEntries(employees.map(e => [empId(e), { ...getState(e), selected: false }])))}
              style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer' }}>
              Tout désélectionner
            </button>
          </div>
        </div>
      </div>

      {/* Liste des employés */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#0f2d5a' }}>
              <th style={{ padding: '10px 14px', width: '40px' }}></th>
              {['Employé','Contrat','Salaire Brut','Retenues (défaut)','Net Calculé','Détails'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '10px', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Aucun employé enregistré</td></tr>
            )}
            {employees.map((emp, i) => {
              const st      = getState(emp);
              const deds    = getDeductions(emp);
              const net     = getNet(emp);
              const totalDed = deds.reduce((s, d) => s + (parseFloat(d.amount)||0), 0);

              return (
                <React.Fragment key={empId(emp)}>
                  <tr style={{ background: st.selected ? (i%2===0 ? '#f0f9ff' : '#e0f2fe') : (i%2===0 ? '#fff' : '#fafafa'), borderBottom: st.expanded ? 'none' : '1px solid #e2e8f0', opacity: st.selected ? 1 : 0.5 }}>
                    {/* Checkbox */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <input type="checkbox" checked={st.selected} onChange={() => toggle(emp)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }} />
                    </td>
                    {/* Employé */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: st.selected ? '#1a4fa0' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                          {emp.nom.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f2d5a', fontSize: '12px' }}>{emp.nom}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{emp.qualification} — {emp.matricule}</div>
                        </div>
                      </div>
                    </td>
                    {/* Contrat */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>
                        {emp.typeContrat}
                      </span>
                    </td>
                    {/* Salaire brut / calculé depuis pointage */}
                    <td style={{ padding: '12px 14px' }}>
                      {(() => {
                        const pt = pointageMap[String(empId(emp))];
                        if (pt) return (
                          <div>
                            <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '13px' }}>{pt.salCalc.toLocaleString()} DH</div>
                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>
                              📅 {pt.p}/{pt.ouv} j — Base: {(emp.salaireBrut||0).toLocaleString()}
                            </div>
                          </div>
                        );
                        return <div style={{ fontWeight: 700, color: '#0f2d5a' }}>{(emp.salaireBrut||0).toLocaleString()} DH</div>;
                      })()}
                    </td>
                    {/* Retenues */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {deds.map(d => (
                          <span key={d.key} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: 600 }}>
                            {d.label.split(' ')[0]}: {(parseFloat(d.amount)||0).toLocaleString()}
                          </span>
                        ))}
                        {deds.length === 0 && <span style={{ color: '#94a3b8', fontSize: '11px' }}>Aucune</span>}
                      </div>
                      <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700, marginTop: '3px' }}>
                        Total: ({totalDed.toLocaleString()}) DH
                      </div>
                    </td>
                    {/* Net */}
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#16a34a', fontSize: '13px' }}>
                      {net.toLocaleString()} DH
                    </td>
                    {/* Expand */}
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => toggleExpand(emp)}
                        style={{ background: st.expanded ? '#0f2d5a' : '#f1f5f9', color: st.expanded ? '#fff' : '#475569', border: `1px solid ${st.expanded ? '#0f2d5a' : '#e2e8f0'}`, borderRadius: '5px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                        {st.expanded ? '▲ Fermer' : '▼ Ajuster'}
                      </button>
                    </td>
                  </tr>

                  {/* Panel expansion — retenues supplémentaires */}
                  {st.expanded && (
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <td colSpan={7} style={{ padding: '12px 24px 16px 68px', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: '#0f2d5a', marginBottom: '8px' }}>Retenues supplémentaires pour {emp.nom} :</p>
                            <DeductionsList
                              deductions={st.extraDeductions}
                              onChange={newDeds => setEmpStates(prev => ({
                                ...prev,
                                [empId(emp)]: { ...getState(emp), extraDeductions: newDeds }
                              }))}
                            />
                          </div>
                          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', minWidth: '180px', textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Brut: <strong>{(emp.salaireBrut||0).toLocaleString()} DH</strong></div>
                            <div style={{ fontSize: '11px', color: '#dc2626', marginBottom: '6px' }}>Retenues: <strong>({deds.reduce((s,d)=>s+(parseFloat(d.amount)||0),0).toLocaleString()}) DH</strong></div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#16a34a', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                              NET: {net.toLocaleString()} DH
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer barre */}
      <div style={{ background: '#0f2d5a', borderRadius: '10px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ color: '#93c5fd', fontSize: '12px' }}>
          <strong style={{ color: '#fff', fontSize: '16px' }}>{selected.length}</strong> employé(s) sélectionné(s)
        </div>
        <div style={{ color: '#93c5fd', fontSize: '12px' }}>
          Masse brute: <strong style={{ color: '#fff' }}>{totalBrut.toLocaleString()} DH</strong>
        </div>
        <div style={{ color: '#93c5fd', fontSize: '12px' }}>
          Total Net: <strong style={{ color: '#fbbf24', fontSize: '16px' }}>{totalNet.toLocaleString()} DH</strong>
        </div>
        <button onClick={handleLancer} disabled={loading || selected.length === 0}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', background: selected.length === 0 ? '#475569' : '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: selected.length === 0 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 800 }}>
          {loading ? '⏳ Génération...' : <><Save size={16} /> Lancer la Paie du Mois ({selected.length})</>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAIE VIEW
// ─────────────────────────────────────────────
function PaieView({ employees, setBulletins, selectedEmp, setSelectedEmp }) {
  const [mode, setMode] = useState(selectedEmp ? 'single' : 'bulk');
  const [step, setStep]         = useState(selectedEmp ? 2 : 1);
  const [employee, setEmployee] = useState(null);
  const [deductions, setDeds]   = useState([]);
  const [saved, setSaved]       = useState(false);
  const printRef = useRef(null);

  useEffect(() => { if (selectedEmp) initEmployee(selectedEmp); }, []);

  // ── Mode tabs header ──
  const TabsHeader = () => (
    <div style={{ display: 'flex', gap: '0', background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
      {[
        { id: 'bulk',   label: '📋 Passer la Paie du Mois', desc: 'Traitement groupé' },
        { id: 'single', label: '📄 Bulletin Individuel',     desc: 'Un seul employé'  },
      ].map(t => (
        <button key={t.id} onClick={() => { setMode(t.id); if(t.id==='bulk'){setStep(1);setSelectedEmp(null);} }}
          style={{ padding: '12px 20px', border: 'none', borderBottom: `3px solid ${mode===t.id ? '#2563eb' : 'transparent'}`,
            background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: mode===t.id ? 700 : 400,
            color: mode===t.id ? '#2563eb' : '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
          }}>
          {t.label}
          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>{t.desc}</span>
        </button>
      ))}
    </div>
  );

  const initEmployee = (emp) => {
    setEmployee({
      nom: emp.nom, matricule: emp.matricule, qualification: emp.qualification,
      salaireBrut: emp.salaireBrut,
      periode: new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase()),
      datePaiement: new Date().toISOString().split('T')[0],
      etat: 'en_attente',
    });
    setDeds((emp.deductionsDefaut || []).map(d => ({...d})));
    setStep(2); setSaved(false);
  };

  const total      = deductions.reduce((s, d) => s + (parseFloat(d.amount)||0), 0);
  const netAPayer  = employee ? (parseFloat(employee.salaireBrut)||0) - total : 0;

  const handleSave = async () => {
    if (!employee) return;
    const emp = employees.find(e => e.nom === employee.nom) || employees[0];
    const updated = await store.saveBulletin({
      employeeId: emp?._id || emp?.id, employeeNom: employee.nom,
      matricule: employee.matricule, qualification: employee.qualification,
      salaireBrut: parseFloat(employee.salaireBrut)||0,
      deductions: [...deductions], netAPayer,
      periode: employee.periode, datePaiement: employee.datePaiement, etat: employee.etat,
    });
    setBulletins(updated);
    setSaved(true);
  };

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=650');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bulletin_${employee.nom}_${employee.periode}</title>
<style>@page{size:210mm 148mm;margin:0;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box;}body{margin:0;}</style>
</head><body>${el.outerHTML}<script>window.onload=()=>{window.print();}<\/script></body></html>`);
    win.document.close();
  };

  // ── Mode bulk ──
  if (mode === 'bulk') return (
    <div>
      <TabsHeader />
      <PasserPaieView employees={employees} setBulletins={setBulletins} />
    </div>
  );

  // ── Step 1 : sélection employé ──
  if (step === 1) return (
    <div>
      <TabsHeader />
      <div style={{ padding: '24px' }}>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Sélectionnez un employé pour générer son bulletin :</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
        {employees.map(emp => (
          <button key={emp.id} onClick={() => initEmployee(emp)}
            style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: '10px', padding: '18px', textAlign: 'left', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#2563eb'}
            onMouseLeave={e => e.currentTarget.style.borderColor='#e2e8f0'}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#1a4fa0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: 'white', marginBottom: '10px' }}>
              {emp.nom.charAt(0)}
            </div>
            <div style={{ fontWeight: 700, color: '#0f2d5a', fontSize: '13px' }}>{emp.nom}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>{emp.qualification} — {emp.matricule}</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a', marginTop: '8px' }}>{(emp.salaireBrut||0).toLocaleString()} DH</div>
          </button>
        ))}
        {employees.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
            <Users size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>Aucun employé. Allez dans Employés pour en ajouter.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );

  // ── Step 2 : bulletin ──
  return (
    <div>
      <TabsHeader />
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={() => { setStep(1); setSelectedEmp(null); setSaved(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 12px', cursor: 'pointer', fontSize: '12px', color: '#475569' }}>
          <ArrowLeft size={14} /> Changer d'employé
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {saved
            ? <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, padding: '8px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px' }}>✓ Sauvegardé dans l'historique</span>
            : <button onClick={handleSave}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                <Save size={14} /> Sauvegarder
              </button>
          }
          <button onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
            <FileDown size={14} /> Imprimer PDF A5
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Formulaire */}
        {employee && (
          <div style={{ width: '270px', flexShrink: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f2d5a', margin: '0 0 4px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>Données du Bulletin</h3>

            <SmField label="Nom" value={employee.nom} onChange={v => setEmployee({...employee, nom: v})} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <SmField label="Matricule"    value={employee.matricule}    onChange={v => setEmployee({...employee, matricule: v})} />
              <SmField label="Qualification" value={employee.qualification} onChange={v => setEmployee({...employee, qualification: v})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <SmField label="Période"       value={employee.periode}      onChange={v => setEmployee({...employee, periode: v})} />
              <SmField label="Date Paiement" type="date" value={employee.datePaiement} onChange={v => setEmployee({...employee, datePaiement: v})} />
            </div>
            <SmField label="Salaire Brut (DH)" type="number" value={employee.salaireBrut} onChange={v => setEmployee({...employee, salaireBrut: parseFloat(v)||0})} />

            {/* État */}
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>ÉTAT DU PAIEMENT</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {Object.entries(ETATS).map(([key, e]) => (
                  <button key={key} onClick={() => setEmployee({...employee, etat: key})} style={{
                    flex: 1, padding: '5px 3px', borderRadius: '5px', fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                    border: `2px solid ${employee.etat===key ? e.color : '#e2e8f0'}`,
                    background: employee.etat===key ? e.bg : '#f8fafc',
                    color: employee.etat===key ? e.color : '#94a3b8',
                  }}>
                    <div style={{ fontSize: '13px' }}>{e.icon}</div>{e.label}
                  </button>
                ))}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />

            {/* Retenues */}
            <div>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#0f2d5a', display: 'block', marginBottom: '6px' }}>RETENUES & DÉDUCTIONS</label>
              <DeductionsList deductions={deductions} onChange={setDeds} small />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, color: '#0f2d5a', borderTop: '1px solid #e2e8f0', marginTop: '10px', paddingTop: '10px' }}>
                <span>Net à Payer</span>
                <span style={{ color: '#16a34a' }}>{netAPayer.toFixed(2)} DH</span>
              </div>
            </div>
          </div>
        )}

        {/* Aperçu bulletin */}
        <div style={{ flex: 1, background: '#cbd5e1', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto' }}>
          {employee && <BulletinPreview ref={printRef} employee={employee} deductions={deductions} netAPayer={netAPayer} />}
        </div>
      </div>
      </div>
    </div>
  );
}

function SmField({ label, type='text', value, onChange }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '2px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '5px 8px', fontSize: '11px', color: '#1e293b', boxSizing: 'border-box' }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// HISTORIQUE VIEW
// ─────────────────────────────────────────────
function HistoriqueView({ bulletins, setBulletins }) {
  const [filter, setFilter] = useState({ search: '', etat: '' });

  const filtered = bulletins.filter(b =>
    (!filter.search || b.employeeNom?.toLowerCase().includes(filter.search.toLowerCase()) || b.periode?.toLowerCase().includes(filter.search.toLowerCase())) &&
    (!filter.etat   || b.etat === filter.etat)
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={filter.search} onChange={e => setFilter({...filter, search: e.target.value})} placeholder="Rechercher employé ou période..."
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '32px', padding: '9px 10px 9px 32px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} />
        </div>
        <select value={filter.etat} onChange={e => setFilter({...filter, etat: e.target.value})}
          style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#475569', background: '#fff' }}>
          <option value="">Tous les états</option>
          <option value="paye">✓ Payé</option>
          <option value="non_paye">✗ Non Payé</option>
          <option value="en_attente">⏳ En Attente</option>
        </select>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#0f2d5a' }}>
              {['Employé','Période','Salaire Brut','Net à Payer','Date Paiement','État','Actions'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: '10px', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Aucun bulletin trouvé</td></tr>
            ) : filtered.map((b, i) => {
              const e = ETATS[b.etat] || ETATS.en_attente;
              return (
                <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', background: i%2===0?'#fff':'#fafafa' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f2d5a' }}>{b.employeeNom}</td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>{b.periode}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{(b.salaireBrut||0).toLocaleString()} DH</td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#16a34a' }}>{(b.netAPayer||0).toLocaleString()} DH</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{b.datePaiement}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <select value={b.etat||'en_attente'} onChange={async ev => setBulletins(await store.updateBulletinEtat(b._id || b.id, ev.target.value))}
                      style={{ background: e.bg, color: e.color, border: `1px solid ${e.border}`, borderRadius: '6px', padding: '3px 7px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                      <option value="paye">✓ Payé</option>
                      <option value="non_paye">✗ Non Payé</option>
                      <option value="en_attente">⏳ En Attente</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={async () => setBulletins(await store.deleteBulletin(b._id || b.id))}
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '5px', padding: '5px 8px', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FINANCE VIEW
// ─────────────────────────────────────────────
const CAT_CHARGES = ['CNSS Patronale','Loyer / Bail','Matériaux','Carburant','Transport','Outillage / Matériel','Eau & Électricité','Téléphone','Assurance','Impôts & Taxes','Autre'];
const SRC_RECETTES = ['Chantier / Contrat','Avance Client','Règlement Facture','Subvention','Autre'];
const MODES_PAIEMENT = ['Espèces','Virement','Chèque','Carte'];

const CAT_COLORS = {
  'CNSS Patronale':       { bg:'#fef3c7', color:'#d97706', border:'#fcd34d' },
  'Loyer / Bail':         { bg:'#eff6ff', color:'#2563eb', border:'#bfdbfe' },
  'Matériaux':            { bg:'#f0fdf4', color:'#16a34a', border:'#86efac' },
  'Carburant':            { bg:'#fff7ed', color:'#ea580c', border:'#fdba74' },
  'Transport':            { bg:'#f5f3ff', color:'#7c3aed', border:'#c4b5fd' },
  'Outillage / Matériel': { bg:'#fdf2f8', color:'#db2777', border:'#f9a8d4' },
  'Eau & Électricité':    { bg:'#ecfeff', color:'#0891b2', border:'#a5f3fc' },
  'Téléphone':            { bg:'#f0fdf4', color:'#059669', border:'#6ee7b7' },
  'Assurance':            { bg:'#fef2f2', color:'#dc2626', border:'#fca5a5' },
  'Impôts & Taxes':       { bg:'#fef3c7', color:'#b45309', border:'#fde68a' },
  'Autre':                { bg:'#f8fafc', color:'#64748b', border:'#e2e8f0' },
};

function catStyle(cat) { return CAT_COLORS[cat] || CAT_COLORS['Autre']; }

function FinanceModal({ item, type, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState(item || (type === 'charge'
    ? { categorie: CAT_CHARGES[0], libelle: '', montant: 0, date: today, chantier: '', modePaiement: 'Espèces', statut: 'payé', note: '' }
    : { source: SRC_RECETTES[0], libelle: '', montant: 0, date: today, chantier: '', modePaiement: 'Virement', statut: 'encaissé', note: '' }
  ));

  const isCharge = type === 'charge';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'12px', width:'480px', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding:'14px 20px', background: isCharge ? '#dc2626' : '#16a34a', borderRadius:'12px 12px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700, color:'#fff', fontSize:'14px' }}>
            {item ? 'Modifier' : 'Ajouter'} {isCharge ? 'une Charge' : 'une Recette'}
          </span>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'6px', padding:'4px 8px', color:'#fff', cursor:'pointer' }}><X size={14} /></button>
        </div>
        <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'3px' }}>
                {isCharge ? 'Catégorie' : 'Source'}
              </label>
              <select value={isCharge ? form.categorie : form.source}
                onChange={e => setForm({...form, [isCharge?'categorie':'source']: e.target.value})}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box' }}>
                {(isCharge ? CAT_CHARGES : SRC_RECETTES).map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'3px' }}>Montant (DH) *</label>
              <input type="number" value={form.montant} onChange={e => setForm({...form, montant: parseFloat(e.target.value)||0})}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'3px' }}>Libellé / Description *</label>
            <input value={form.libelle} onChange={e => setForm({...form, libelle: e.target.value})}
              style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box' }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'3px' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'3px' }}>Mode Paiement</label>
              <select value={form.modePaiement} onChange={e => setForm({...form, modePaiement: e.target.value})}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box' }}>
                {MODES_PAIEMENT.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'3px' }}>Statut</label>
              <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box' }}>
                {isCharge
                  ? ['payé','impayé','en_attente'].map(s => <option key={s}>{s}</option>)
                  : ['encaissé','en_attente','annulé'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'3px' }}>Chantier (optionnel)</label>
            <input value={form.chantier} onChange={e => setForm({...form, chantier: e.target.value})}
              placeholder="ex: TANCHERFI L.E.M"
              style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'3px' }}>Note (optionnel)</label>
            <textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})} rows={2}
              style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box', resize:'vertical' }} />
          </div>

          <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', borderTop:'1px solid #e2e8f0', paddingTop:'12px' }}>
            <button onClick={onClose} style={{ padding:'8px 18px', border:'1px solid #e2e8f0', borderRadius:'7px', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontSize:'13px' }}>Annuler</button>
            <button onClick={() => { if(!form.libelle||!form.montant) return; onSave(form); }}
              style={{ padding:'8px 20px', background: isCharge ? '#dc2626' : '#16a34a', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:700, display:'flex', alignItems:'center', gap:'6px' }}>
              <Save size={14} /> Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceView({ charges, setCharges, recettes, setRecettes, bulletins }) {
  const [tab, setTab] = useState('dashboard');
  const [modal, setModal] = useState(null); // { type: 'charge'|'recette', item: null|{} }
  const [filterMois, setFilterMois] = useState('');
  const [search, setSearch] = useState('');

  // ── Calculs ──
  const totalCharges  = charges.reduce((s, c) => s + (c.statut !== 'impayé' ? (c.montant||0) : 0), 0);
  const totalRecettes = recettes.reduce((s, r) => s + (r.statut === 'encaissé' ? (r.montant||0) : 0), 0);
  const solde         = totalRecettes - totalCharges;
  const masseTotal    = bulletins.reduce((s, b) => s + (b.netAPayer||0), 0);

  const chargesByCategorie = CAT_CHARGES.map(cat => ({
    cat,
    total: charges.filter(c => c.categorie === cat).reduce((s, c) => s + (c.montant||0), 0),
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  const filteredCharges  = charges.filter(c =>
    (!filterMois || c.date?.startsWith(filterMois)) &&
    (!search || c.libelle?.toLowerCase().includes(search.toLowerCase()) || c.categorie?.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredRecettes = recettes.filter(r =>
    (!filterMois || r.date?.startsWith(filterMois)) &&
    (!search || r.libelle?.toLowerCase().includes(search.toLowerCase()) || r.source?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSaveCharge = async (form) => {
    setCharges(await store.saveCharge(form));
    setModal(null);
  };
  const handleSaveRecette = async (form) => {
    setRecettes(await store.saveRecette(form));
    setModal(null);
  };

  const TABS = [
    { id: 'dashboard', label: '📊 Tableau de Bord' },
    { id: 'charges',   label: '📤 Charges' },
    { id: 'recettes',  label: '📥 Recettes' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'0 24px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'12px 20px', border:'none', borderBottom:`3px solid ${tab===t.id?'#2563eb':'transparent'}`,
              background:'none', cursor:'pointer', fontSize:'13px', fontWeight: tab===t.id?700:400,
              color: tab===t.id?'#2563eb':'#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'20px' }}>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px' }}>
            {[
              { label:'Total Recettes',  value:`${totalRecettes.toLocaleString()} DH`, color:'#16a34a', bg:'#f0fdf4', icon:'📥' },
              { label:'Total Charges',   value:`${totalCharges.toLocaleString()} DH`,  color:'#dc2626', bg:'#fef2f2', icon:'📤' },
              { label:'Masse Salariale', value:`${masseTotal.toLocaleString()} DH`,    color:'#2563eb', bg:'#eff6ff', icon:'👥' },
              { label:'Solde Net',       value:`${solde.toLocaleString()} DH`,         color: solde>=0?'#16a34a':'#dc2626', bg: solde>=0?'#f0fdf4':'#fef2f2', icon: solde>=0?'✅':'⚠️' },
            ].map(s => (
              <div key={s.label} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'16px' }}>
                <div style={{ fontSize:'24px', marginBottom:'8px' }}>{s.icon}</div>
                <div style={{ fontSize:'20px', fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'11px', color:'#64748b', marginTop:'2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Répartition des charges */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'16px' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'#0f2d5a', marginBottom:'14px' }}>Répartition des Charges</h3>
              {chargesByCategorie.length === 0
                ? <p style={{ color:'#94a3b8', fontSize:'12px', textAlign:'center', padding:'20px' }}>Aucune charge enregistrée</p>
                : chargesByCategorie.map(({ cat, total }) => {
                  const pct = totalCharges > 0 ? Math.round((total / totalCharges) * 100) : 0;
                  const st  = catStyle(cat);
                  return (
                    <div key={cat} style={{ marginBottom:'10px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                        <span style={{ fontSize:'11px', fontWeight:600, color:'#475569' }}>{cat}</span>
                        <span style={{ fontSize:'11px', fontWeight:700, color:st.color }}>{total.toLocaleString()} DH ({pct}%)</span>
                      </div>
                      <div style={{ height:'6px', background:'#f1f5f9', borderRadius:'3px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:st.color, borderRadius:'3px' }} />
                      </div>
                    </div>
                  );
                })
              }
            </div>

            {/* Solde visuel */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'16px' }}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'#0f2d5a', marginBottom:'14px' }}>Bilan Financier</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:'8px', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'13px', fontWeight:600, color:'#16a34a' }}>📥 Total Recettes</span>
                  <span style={{ fontSize:'16px', fontWeight:800, color:'#16a34a' }}>{totalRecettes.toLocaleString()} DH</span>
                </div>
                <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'8px', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'13px', fontWeight:600, color:'#dc2626' }}>📤 Total Charges</span>
                  <span style={{ fontSize:'16px', fontWeight:800, color:'#dc2626' }}>({totalCharges.toLocaleString()}) DH</span>
                </div>
                <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'8px', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'13px', fontWeight:600, color:'#2563eb' }}>👥 Masse Salariale</span>
                  <span style={{ fontSize:'16px', fontWeight:800, color:'#2563eb' }}>({masseTotal.toLocaleString()}) DH</span>
                </div>
                <div style={{ background: solde>=0?'#f0fdf4':'#fef2f2', border:`2px solid ${solde>=0?'#16a34a':'#dc2626'}`, borderRadius:'8px', padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'14px', fontWeight:800, color: solde>=0?'#16a34a':'#dc2626' }}>{solde>=0?'✅':'⚠️'} SOLDE NET</span>
                  <span style={{ fontSize:'22px', fontWeight:900, color: solde>=0?'#16a34a':'#dc2626' }}>{solde.toLocaleString()} DH</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CHARGES ── */}
      {tab === 'charges' && (
        <div style={{ padding:'24px' }}>
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1 }}>
              <Search size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                style={{ width:'100%', boxSizing:'border-box', paddingLeft:'32px', padding:'9px 10px 9px 32px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px' }} />
            </div>
            <input type="month" value={filterMois} onChange={e => setFilterMois(e.target.value)}
              style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'9px 12px', fontSize:'13px' }} />
            <button onClick={() => setModal({ type:'charge', item:null })}
              style={{ display:'flex', alignItems:'center', gap:'6px', background:'#dc2626', color:'white', border:'none', borderRadius:'8px', padding:'9px 18px', cursor:'pointer', fontSize:'13px', fontWeight:700, flexShrink:0 }}>
              <Plus size={14} /> Ajouter Charge
            </button>
          </div>

          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr style={{ background:'#0f2d5a' }}>
                  {['Catégorie','Libellé','Montant','Date','Chantier','Mode','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'10px', color:'#93c5fd', fontWeight:700, textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCharges.length === 0
                  ? <tr><td colSpan={8} style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>Aucune charge enregistrée</td></tr>
                  : filteredCharges.map((c, i) => {
                    const st = catStyle(c.categorie);
                    const statutStyle = c.statut === 'payé'
                      ? { bg:'#f0fdf4', color:'#16a34a', border:'#86efac' }
                      : c.statut === 'impayé'
                      ? { bg:'#fef2f2', color:'#dc2626', border:'#fca5a5' }
                      : { bg:'#fef3c7', color:'#d97706', border:'#fcd34d' };
                    return (
                      <tr key={c._id||c.id} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ background:st.bg, color:st.color, border:`1px solid ${st.border}`, borderRadius:'5px', padding:'2px 8px', fontSize:'10px', fontWeight:700, whiteSpace:'nowrap' }}>{c.categorie}</span>
                        </td>
                        <td style={{ padding:'11px 14px', fontWeight:600, color:'#1e293b' }}>{c.libelle}</td>
                        <td style={{ padding:'11px 14px', fontWeight:800, color:'#dc2626' }}>{(c.montant||0).toLocaleString()} DH</td>
                        <td style={{ padding:'11px 14px', color:'#64748b' }}>{c.date}</td>
                        <td style={{ padding:'11px 14px', color:'#64748b', fontSize:'11px' }}>{c.chantier || '—'}</td>
                        <td style={{ padding:'11px 14px', color:'#64748b', fontSize:'11px' }}>{c.modePaiement}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ background:statutStyle.bg, color:statutStyle.color, border:`1px solid ${statutStyle.border}`, borderRadius:'5px', padding:'2px 7px', fontSize:'10px', fontWeight:700 }}>{c.statut}</span>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', gap:'5px' }}>
                            <button onClick={() => setModal({ type:'charge', item:c })}
                              style={{ background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:'4px', padding:'4px 7px', cursor:'pointer' }}><Edit2 size={11} /></button>
                            <button onClick={async () => setCharges(await store.deleteCharge(c._id||c.id))}
                              style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fca5a5', borderRadius:'4px', padding:'4px 7px', cursor:'pointer' }}><Trash2 size={11} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
              {filteredCharges.length > 0 && (
                <tfoot>
                  <tr style={{ background:'#fef2f2', borderTop:'2px solid #dc2626' }}>
                    <td colSpan={2} style={{ padding:'10px 14px', fontWeight:800, color:'#dc2626' }}>TOTAL CHARGES</td>
                    <td style={{ padding:'10px 14px', fontWeight:900, color:'#dc2626', fontSize:'14px' }}>
                      {filteredCharges.reduce((s,c) => s+(c.montant||0), 0).toLocaleString()} DH
                    </td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── RECETTES ── */}
      {tab === 'recettes' && (
        <div style={{ padding:'24px' }}>
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1 }}>
              <Search size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                style={{ width:'100%', boxSizing:'border-box', paddingLeft:'32px', padding:'9px 10px 9px 32px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px' }} />
            </div>
            <input type="month" value={filterMois} onChange={e => setFilterMois(e.target.value)}
              style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'9px 12px', fontSize:'13px' }} />
            <button onClick={() => setModal({ type:'recette', item:null })}
              style={{ display:'flex', alignItems:'center', gap:'6px', background:'#16a34a', color:'white', border:'none', borderRadius:'8px', padding:'9px 18px', cursor:'pointer', fontSize:'13px', fontWeight:700, flexShrink:0 }}>
              <Plus size={14} /> Ajouter Recette
            </button>
          </div>

          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr style={{ background:'#0f2d5a' }}>
                  {['Source','Libellé','Montant','Date','Chantier','Mode','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'10px', color:'#93c5fd', fontWeight:700, textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecettes.length === 0
                  ? <tr><td colSpan={8} style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>Aucune recette enregistrée</td></tr>
                  : filteredRecettes.map((r, i) => {
                    const statutStyle = r.statut === 'encaissé'
                      ? { bg:'#f0fdf4', color:'#16a34a', border:'#86efac' }
                      : r.statut === 'annulé'
                      ? { bg:'#fef2f2', color:'#dc2626', border:'#fca5a5' }
                      : { bg:'#fef3c7', color:'#d97706', border:'#fcd34d' };
                    return (
                      <tr key={r._id||r.id} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', borderRadius:'5px', padding:'2px 8px', fontSize:'10px', fontWeight:700 }}>{r.source}</span>
                        </td>
                        <td style={{ padding:'11px 14px', fontWeight:600, color:'#1e293b' }}>{r.libelle}</td>
                        <td style={{ padding:'11px 14px', fontWeight:800, color:'#16a34a' }}>{(r.montant||0).toLocaleString()} DH</td>
                        <td style={{ padding:'11px 14px', color:'#64748b' }}>{r.date}</td>
                        <td style={{ padding:'11px 14px', color:'#64748b', fontSize:'11px' }}>{r.chantier || '—'}</td>
                        <td style={{ padding:'11px 14px', color:'#64748b', fontSize:'11px' }}>{r.modePaiement}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ background:statutStyle.bg, color:statutStyle.color, border:`1px solid ${statutStyle.border}`, borderRadius:'5px', padding:'2px 7px', fontSize:'10px', fontWeight:700 }}>{r.statut}</span>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ display:'flex', gap:'5px' }}>
                            <button onClick={() => setModal({ type:'recette', item:r })}
                              style={{ background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:'4px', padding:'4px 7px', cursor:'pointer' }}><Edit2 size={11} /></button>
                            <button onClick={async () => setRecettes(await store.deleteRecette(r._id||r.id))}
                              style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fca5a5', borderRadius:'4px', padding:'4px 7px', cursor:'pointer' }}><Trash2 size={11} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
              {filteredRecettes.length > 0 && (
                <tfoot>
                  <tr style={{ background:'#f0fdf4', borderTop:'2px solid #16a34a' }}>
                    <td colSpan={2} style={{ padding:'10px 14px', fontWeight:800, color:'#16a34a' }}>TOTAL RECETTES</td>
                    <td style={{ padding:'10px 14px', fontWeight:900, color:'#16a34a', fontSize:'14px' }}>
                      {filteredRecettes.reduce((s,r) => s+(r.montant||0), 0).toLocaleString()} DH
                    </td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {modal && (
        <FinanceModal
          item={modal.item}
          type={modal.type}
          onSave={modal.type === 'charge' ? handleSaveCharge : handleSaveRecette}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// POINTAGE VIEW
// ─────────────────────────────────────────────
const STATUTS = {
  '':  { label: '',    bg: '#ffffff', color: '#e2e8f0', border: '#e2e8f0', short: ''  },
  'P': { label: 'P',  bg: '#dcfce7', color: '#16a34a', border: '#86efac', short: 'P' },
  'A': { label: 'A',  bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', short: 'A' },
  'C': { label: 'C',  bg: '#dbeafe', color: '#2563eb', border: '#93c5fd', short: 'C' },
  'M': { label: 'M',  bg: '#fef3c7', color: '#d97706', border: '#fcd34d', short: 'M' },
  'F': { label: 'F',  bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', short: 'F' },
};
const CYCLE = ['', 'P', 'A', 'C', 'M', 'F'];

function getDaysInMonth(moisStr) {
  const [m, y] = moisStr.split('/').map(Number);
  return new Date(y, m, 0).getDate();
}

function isWeekend(moisStr, day) {
  const [m, y] = moisStr.split('/').map(Number);
  const dow = new Date(y, m - 1, day).getDay();
  return dow === 0 || dow === 6;
}

function PointageView({ employees }) {
  const now   = new Date();
  const defMois = `${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
  const [mois,    setMois]    = useState(defMois);
  const [rows,    setRows]    = useState([]);
  const [search,  setSearch]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const printRef = useRef(null);

  const nbJours = getDaysInMonth(mois);
  const days = Array.from({ length: nbJours }, (_, i) => i + 1);

  const isJournalier = (row) => row.typeContrat === 'Journalier';
  const isLodaf      = (row) => LODAFIN_QUALS.includes(row.qualification);

  const isSunday = (day) => {
    const [m, y] = mois.split('/').map(Number);
    return new Date(y, m - 1, day).getDay() === 0;
  };

  // Journaliers: aucun jour bloqué. Lodafin (26j): samedi+dimanche bloqués. Ouvriers (30j): dimanche seulement.
  const isBlockedDay = (row, day) => {
    if (isJournalier(row)) return false;
    if (isLodaf(row)) return isWeekend(mois, day);
    return isSunday(day);
  };

  // Init / load rows when mois changes or employees change
  useEffect(() => {
    (async () => {
      const data = await store.getPointage(mois).catch(() => []);
      const rows = employees.map(emp => {
        const saved = data.find(p => String(p.employeeId) === String(emp._id || emp.id));
        return {
          _id:          saved?._id || null,
          employeeId:   emp._id || emp.id,
          employeeNom:  emp.nom,
          matricule:    emp.matricule,
          qualification:emp.qualification,
          typeContrat:  emp.typeContrat || 'ANAPEC',
          salaireBrut:  emp.salaireBrut || 0,
          mois,
          jours:        saved?.jours || {},
          observation:  saved?.observation || '',
        };
      });
      setRows(rows);
    })();
  }, [mois, employees.length]);

  const toggleCell = (empId, day) => {
    setRows(prev => prev.map(r => {
      if (String(r.employeeId) !== String(empId)) return r;
      const cur  = r.jours[String(day)] || '';
      const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
      return { ...r, jours: { ...r.jours, [String(day)]: next } };
    }));
    setSaved(false);
  };

  const updateObs = (empId, val) => {
    setRows(prev => prev.map(r => String(r.employeeId) === String(empId) ? { ...r, observation: val } : r));
    setSaved(false);
  };

  const fillRow = (empId, statut) => {
    setRows(prev => prev.map(r => {
      if (String(r.employeeId) !== String(empId)) return r;
      const jours = {};
      days.forEach(d => { jours[String(d)] = isBlockedDay(r, d) ? '' : statut; });
      return { ...r, jours };
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updatedRows = [];
      for (const row of rows) {
        const saved = await store.savePointage(row);
        updatedRows.push({ ...row, _id: saved._id || row._id });
      }
      setRows(updatedRows);
      setSaved(true);
    } catch (err) {
      alert('Erreur: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank', 'width=1200,height=700');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Pointage ${mois}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  body { margin: 0; font-family: Arial, sans-serif; font-size: 10px; }
</style>
</head><body>${el.outerHTML}<script>window.onload=()=>{window.print();}<\/script></body></html>`);
    win.document.close();
  };

  // Calculs par ligne
  const getStats = (row) => {
    const p = Object.values(row.jours).filter(v => v === 'P').length;
    const a = Object.values(row.jours).filter(v => v === 'A').length;
    const c = Object.values(row.jours).filter(v => v === 'C').length;
    const m = Object.values(row.jours).filter(v => v === 'M').length;
    if (isJournalier(row)) {
      const salCalc = Math.round(row.salaireBrut * p);
      return { p, a, c, m, ouv: nbJours, salCalc, base: null };
    }
    if (isLodaf(row)) {
      // Lodafin (cadres/employés): base fixe 26j, samedi+dimanche non travaillés
      const salCalc = Math.round((row.salaireBrut / 26) * p);
      return { p, a, c, m, ouv: 26, salCalc, base: 26 };
    }
    // Ouvriers: base fixe 30j, samedi travaillé, dimanche repos
    const salCalc = Math.round((row.salaireBrut / 30) * p);
    return { p, a, c, m, ouv: 30, salCalc, base: 30 };
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>MOIS</label>
          <input type="month" value={`${mois.split('/')[1]}-${mois.split('/')[0]}`}
            onChange={e => { const [y,m] = e.target.value.split('-'); setMois(`${m}/${y}`); setSaved(false); }}
            style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 12px', fontSize: '13px', fontWeight: 700, color: '#0f2d5a' }} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>EMPLOYÉ</label>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom..."
              style={{ paddingLeft: '28px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 10px 7px 28px', fontSize: '12px', width: '200px' }} />
          </div>
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '8px' }}>
          {Object.entries(STATUTS).filter(([k]) => k !== '').map(([k, s]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '20px', height: '20px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: s.color }}>{k}</div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {k === 'P' ? 'Présent' : k === 'A' ? 'Absent' : k === 'C' ? 'Congé' : k === 'M' ? 'Maladie' : 'Férié'}
              </span>
            </div>
          ))}
          <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>— Cliquer pour changer</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', padding: '9px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
            <FileDown size={14} /> Imprimer PDF
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: saved ? '#16a34a' : '#0f2d5a', color: 'white', border: 'none', borderRadius: '7px', padding: '9px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
            {saving ? '⏳' : <Save size={14} />}
            {saved ? '✓ Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Grille */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'auto' }}>
        <div ref={printRef}>
          {/* Header entreprise pour impression */}
          <div style={{ background: '#0f2d5a', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}>STE ISSORKAS SARL AU</span>
              <span style={{ fontSize: '11px', color: '#93c5fd', marginLeft: '12px' }}>ICE: 003695935000057</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '4px' }}>
                FEUILLE DE POINTAGE — Mois {mois}
              </span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#1e3a5f' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#93c5fd', fontWeight: 700, fontSize: '10px', minWidth: '140px', position: 'sticky', left: 0, background: '#1e3a5f', zIndex: 1 }}>NOM / PRÉNOMS</th>
                {days.map(d => (
                  <th key={d} style={{
                    padding: '6px 0', textAlign: 'center', color: isWeekend(mois, d) ? '#f87171' : '#93c5fd',
                    fontWeight: 700, minWidth: '26px', fontSize: '10px',
                    background: isWeekend(mois, d) ? '#1a2e4a' : '#1e3a5f',
                  }}>{d}</th>
                ))}
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#4ade80', fontWeight: 700, minWidth: '32px', fontSize: '9px' }}>P</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#f87171', fontWeight: 700, minWidth: '32px', fontSize: '9px' }}>A</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#93c5fd', fontWeight: 700, minWidth: '32px', fontSize: '9px' }}>C</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#fcd34d', fontWeight: 700, minWidth: '52px', fontSize: '9px' }}>Salaire</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#94a3b8', fontWeight: 700, minWidth: '100px', fontSize: '9px' }}>Observation</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={days.length + 6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Aucun employé</td></tr>
              )}
              {rows.filter(r => {
                const q = search.trim().toLowerCase();
                return !q || r.employeeNom.toLowerCase().includes(q) || (r.matricule || '').toLowerCase().includes(q);
              }).length === 0 && rows.length > 0 && (
                <tr><td colSpan={days.length + 6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  Aucun résultat pour &quot;{search}&quot;
                </td></tr>
              )}
              {rows.filter(r => {
                const q = search.trim().toLowerCase();
                return !q || r.employeeNom.toLowerCase().includes(q) || (r.matricule || '').toLowerCase().includes(q);
              }).map((row, ri) => {
                const st = getStats(row);
                return (
                  <tr key={row.employeeId} style={{ borderBottom: '1px solid #e2e8f0', background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    {/* Nom */}
                    <td style={{ padding: '6px 10px', fontWeight: 700, color: '#0f2d5a', fontSize: '11px', position: 'sticky', left: 0, background: ri%2===0?'#fff':'#f8fafc', borderRight: '2px solid #e2e8f0', zIndex: 1 }}>
                      <div>{row.employeeNom}</div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 400 }}>{row.qualification} — {row.matricule}</div>
                      <span style={{ fontSize: '8px', fontWeight: 700,
                        color: isJournalier(row) ? '#d97706' : isLodaf(row) ? '#7c3aed' : '#2563eb',
                        background: isJournalier(row) ? '#fef3c7' : isLodaf(row) ? '#f5f3ff' : '#eff6ff',
                        border: `1px solid ${isJournalier(row) ? '#fcd34d' : isLodaf(row) ? '#ddd6fe' : '#bfdbfe'}`,
                        borderRadius: '3px', padding: '1px 5px', display: 'inline-block', marginTop: '2px' }}>
                        {isJournalier(row) ? '📅 Journalier' : isLodaf(row) ? '🏢 Lodaf 26j' : '🔨 Ouvrier 30j'}
                      </span>
                      {/* Fill shortcuts */}
                      <div style={{ display: 'flex', gap: '2px', marginTop: '3px' }}>
                        {['P','A'].map(s => (
                          <button key={s} onClick={() => fillRow(row.employeeId, s)}
                            title={`Remplir tout ${s}`}
                            style={{ fontSize: '8px', background: STATUTS[s].bg, color: STATUTS[s].color, border: `1px solid ${STATUTS[s].border}`, borderRadius: '2px', padding: '1px 4px', cursor: 'pointer' }}>
                            Tout {s}
                          </button>
                        ))}
                      </div>
                    </td>

                    {/* Jours */}
                    {days.map(d => {
                      const val     = row.jours[String(d)] || '';
                      const blocked = isBlockedDay(row, d);
                      const sun     = isSunday(d);
                      const s       = STATUTS[val] || STATUTS[''];
                      // Dimanche non-bloqué (journalier): fond orangé pour distinguer
                      const emptyBg = (!blocked && sun) ? '#fff7ed' : s.bg;
                      return (
                        <td key={d} onClick={() => !blocked && toggleCell(row.employeeId, d)}
                          style={{
                            padding: '2px', textAlign: 'center',
                            background: blocked ? '#f1f5f9' : (val ? s.bg : emptyBg),
                            cursor: blocked ? 'default' : 'pointer',
                            border: `1px solid ${sun && !blocked ? '#fed7aa' : '#e2e8f0'}`,
                            minWidth: '26px', height: '36px',
                          }}>
                          {blocked
                            ? <span style={{ color: '#cbd5e1', fontSize: '9px' }}>—</span>
                            : <span style={{ fontSize: '11px', fontWeight: 700, color: s.color }}>{val}</span>
                          }
                        </td>
                      );
                    })}

                    {/* Stats */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 800, color: '#16a34a', background: '#f0fdf4' }}>{st.p}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 800, color: '#dc2626', background: '#fef2f2' }}>{st.a || ''}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 800, color: '#2563eb', background: '#eff6ff' }}>{st.c || ''}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 700, color: '#0f2d5a', fontSize: '10px', background: '#f8fafc' }}>
                      {st.salCalc.toLocaleString()} <span style={{ fontSize: '8px', color: '#94a3b8' }}>DH</span>
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input value={row.observation} onChange={e => updateObs(row.employeeId, e.target.value)}
                        placeholder="Observation..."
                        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '3px 5px', fontSize: '10px', background: 'transparent', boxSizing: 'border-box' }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer totaux */}
            {rows.length > 0 && (
              <tfoot>
                <tr style={{ background: '#0f2d5a', color: '#fff' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 800, fontSize: '11px', position: 'sticky', left: 0, background: '#0f2d5a' }}>
                    TOTAUX — {rows.length} employé(s)
                  </td>
                  {days.map(d => {
                    const count = rows.filter(r => r.jours[String(d)] === 'P').length;
                    return (
                      <td key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: count > 0 ? 700 : 400, color: count > 0 ? '#4ade80' : '#475569', padding: '4px 0' }}>
                        {count > 0 ? count : ''}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#4ade80', padding: '6px 4px' }}>
                    {rows.reduce((s, r) => s + getStats(r).p, 0)}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#f87171', padding: '6px 4px' }}>
                    {rows.reduce((s, r) => s + getStats(r).a, 0) || ''}
                  </td>
                  <td colSpan={2} style={{ textAlign: 'center', fontWeight: 800, color: '#fbbf24', padding: '6px 8px', fontSize: '11px' }}>
                    {rows.reduce((s, r) => s + getStats(r).salCalc, 0).toLocaleString()} DH
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {rows.filter(r => {
            const q = search.trim().toLowerCase();
            return !q || r.employeeNom.toLowerCase().includes(q) || (r.matricule || '').toLowerCase().includes(q);
          }).map(row => {
            const st = getStats(row);
            return (
              <div key={row.employeeId} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ fontWeight: 700, color: '#0f2d5a', fontSize: '12px', marginBottom: '8px' }}>{row.employeeNom}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                  <span style={{ color: '#16a34a' }}>✓ Présent:</span>
                  <span style={{ fontWeight: 700 }}>
                    {st.p} j {isJournalier(row) ? <span style={{ fontSize: '9px', color: '#94a3b8' }}>× {row.salaireBrut} DH/j</span> : `/ ${st.ouv} j`}
                  </span>
                </div>
                {st.a > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                  <span style={{ color: '#dc2626' }}>✗ Absent:</span><span style={{ fontWeight: 700 }}>{st.a} j</span>
                </div>}
                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#16a34a' }}>
                  <span>Salaire calculé:</span><span>{st.salCalc.toLocaleString()} DH</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTRAT MODAL (nouveau / modifier)
// ─────────────────────────────────────────────
function ContratModal({ employees, contrats, editContrat, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState(editContrat || {
    employeeId: '', employeeNom: '', matricule: '',
    typeContrat: 'CDI', dateDebut: today, dateFin: '',
    dateSignature: '', dateApprobationAnapec: '',
    salaire: 0, typeSalaire: 'mensuel',
    statut: 'actif', motifFin: '', note: '',
  });
  const [cloturerPrecedent, setCloturerPrecedent] = useState(false);
  const [motifCloture, setMotifCloture] = useState('Promotion CDI');

  const isEdit = !!editContrat;

  // Trouver le contrat actif actuel de l'employé sélectionné
  const contratActif = form.employeeId
    ? contrats.filter(c => String(c.employeeId) === String(form.employeeId) && computeStatut(c) !== 'termine')
               .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut))[0]
    : null;

  const handleEmpChange = (empId) => {
    const emp = employees.find(e => String(e._id || e.id) === empId);
    if (!emp) return;
    setForm(f => ({ ...f, employeeId: empId, employeeNom: emp.nom, matricule: emp.matricule || '' }));
  };

  const handleSave = () => {
    if (!form.employeeId || !form.typeContrat || !form.dateDebut) return alert('Employé, type et date début obligatoires');
    if ((form.typeContrat === 'CDD' || isAnapec(form.typeContrat) || form.typeContrat === 'Autre') && !form.dateFin)
      return alert('Date de fin obligatoire pour ce type de contrat');
    onSave(form, cloturerPrecedent ? { contrat: contratActif, motif: motifCloture } : null);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'12px', width:'560px', maxHeight:'92vh', overflow:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ padding:'14px 20px', background:'#0f2d5a', borderRadius:'12px 12px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:700, color:'#fff', fontSize:'15px' }}>
            {isEdit ? 'Modifier le Contrat' : 'Nouveau Contrat de Travail'}
          </span>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'6px', padding:'5px 8px', color:'#fff', cursor:'pointer' }}><X size={15} /></button>
        </div>

        <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'14px' }}>
          {/* Employé */}
          {!isEdit && (
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'4px' }}>Employé *</label>
              <select value={form.employeeId} onChange={e => handleEmpChange(e.target.value)}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'8px 10px', fontSize:'13px', boxSizing:'border-box' }}>
                <option value="">-- Sélectionner un employé --</option>
                {employees.filter(e => e.actif !== false).map(emp => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.nom} — {emp.matricule || 'N/A'}</option>
                ))}
              </select>
            </div>
          )}
          {isEdit && (
            <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'7px', padding:'10px 14px', fontSize:'13px', fontWeight:700, color:'#0f2d5a' }}>
              👤 {form.employeeNom}
            </div>
          )}

          {/* Type contrat */}
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'6px' }}>Type de Contrat *</label>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {CONTRAT_TRAVAIL_TYPES.map(t => {
                const c = CONTRAT_TYPE_COLORS[t];
                return (
                  <button key={t} onClick={() => setForm(f => ({ ...f, typeContrat: t, dateSignature:'', dateApprobationAnapec:'' }))}
                    style={{ padding:'7px 14px', borderRadius:'7px', fontSize:'12px', fontWeight:700, cursor:'pointer', border:`2px solid ${form.typeContrat===t ? c.color : '#e2e8f0'}`, background: form.typeContrat===t ? c.bg : '#f8fafc', color: form.typeContrat===t ? c.color : '#94a3b8' }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Salaire + Type */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'4px' }}>Salaire du contrat (DH) *</label>
              <input type="number" value={form.salaire} onChange={e => setForm(f => ({...f, salaire: parseFloat(e.target.value)||0}))}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'8px 10px', fontSize:'13px', boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'6px' }}>Type de salaire *</label>
              <div style={{ display:'flex', gap:'6px' }}>
                {[['mensuel','📆 Par mois'],['journalier','📅 Par jour']].map(([v, l]) => (
                  <button key={v} onClick={() => setForm(f => ({...f, typeSalaire:v}))}
                    style={{ flex:1, padding:'7px 6px', borderRadius:'7px', fontSize:'12px', fontWeight:700, cursor:'pointer',
                      border:`2px solid ${form.typeSalaire===v ? (v==='mensuel'?'#2563eb':'#d97706') : '#e2e8f0'}`,
                      background: form.typeSalaire===v ? (v==='mensuel'?'#eff6ff':'#fef3c7') : '#f8fafc',
                      color: form.typeSalaire===v ? (v==='mensuel'?'#2563eb':'#d97706') : '#94a3b8' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <Field label="Date début *" type="date" value={form.dateDebut} onChange={v => setForm(f => ({...f, dateDebut:v}))} />
            {(form.typeContrat === 'CDD' || isAnapec(form.typeContrat) || form.typeContrat === 'Autre') && (
              <Field label="Date fin *" type="date" value={form.dateFin} onChange={v => setForm(f => ({...f, dateFin:v}))} />
            )}
          </div>

          {/* CDI: date signature */}
          {form.typeContrat === 'CDI' && (
            <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:'8px', padding:'12px 14px' }}>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#16a34a', display:'block', marginBottom:'6px' }}>✍️ CDI — Date de signature (optionnel à la création)</label>
              <Field label="" type="date" value={form.dateSignature} onChange={v => setForm(f => ({...f, dateSignature:v}))} />
              {!form.dateSignature && <p style={{ fontSize:'10px', color:'#64748b', margin:'6px 0 0' }}>Sans signature → statut "En attente signature" jusqu'à validation</p>}
            </div>
          )}

          {/* ANAPEC: date approbation */}
          {isAnapec(form.typeContrat) && (
            <div style={{ background:'#f5f3ff', border:'1px solid #c4b5fd', borderRadius:'8px', padding:'12px 14px' }}>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#7c3aed', display:'block', marginBottom:'6px' }}>⏳ ANAPEC — Date d'approbation (optionnel à la création)</label>
              <Field label="" type="date" value={form.dateApprobationAnapec} onChange={v => setForm(f => ({...f, dateApprobationAnapec:v}))} />
              {!form.dateApprobationAnapec && <p style={{ fontSize:'10px', color:'#64748b', margin:'6px 0 0' }}>Sans approbation → "En attente ANAPEC" jusqu'à confirmation</p>}
            </div>
          )}

          {/* Clôturer contrat précédent */}
          {!isEdit && contratActif && (
            <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:'8px', padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                <input type="checkbox" id="cloture" checked={cloturerPrecedent} onChange={e => setCloturerPrecedent(e.target.checked)}
                  style={{ width:'16px', height:'16px', cursor:'pointer', accentColor:'#d97706' }} />
                <label htmlFor="cloture" style={{ fontSize:'12px', fontWeight:700, color:'#d97706', cursor:'pointer' }}>
                  Clôturer le contrat actuel ({contratActif.typeContrat} — depuis {contratActif.dateDebut})
                </label>
              </div>
              {cloturerPrecedent && (
                <div>
                  <label style={{ fontSize:'10px', fontWeight:700, color:'#475569', display:'block', marginBottom:'4px' }}>Motif de clôture</label>
                  <select value={motifCloture} onChange={e => setMotifCloture(e.target.value)}
                    style={{ width:'100%', border:'1px solid #fcd34d', borderRadius:'6px', padding:'6px 10px', fontSize:'12px', boxSizing:'border-box', background:'#fffbeb' }}>
                    {MOTIFS_FIN.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div>
            <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'4px' }}>Note (optionnel)</label>
            <textarea value={form.note} onChange={e => setForm(f => ({...f, note:e.target.value}))} rows={2}
              style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box', resize:'vertical' }} />
          </div>

          <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', borderTop:'1px solid #e2e8f0', paddingTop:'12px' }}>
            <button onClick={onClose} style={{ padding:'8px 18px', border:'1px solid #e2e8f0', borderRadius:'7px', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontSize:'13px' }}>Annuler</button>
            <button onClick={handleSave}
              style={{ padding:'8px 20px', background:'#0f2d5a', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:700, display:'flex', alignItems:'center', gap:'6px' }}>
              <Save size={14} /> {isEdit ? 'Mettre à jour' : 'Créer le Contrat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTRAT TIMELINE MODAL
// ─────────────────────────────────────────────
function ContratTimelineModal({ employee, contrats, onApprouver, onSigner, onCloturer, onDelete, onAddNew, onClose }) {
  const empContrats = contrats
    .filter(c => String(c.employeeId) === String(employee._id || employee.id))
    .sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'12px', width:'620px', maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding:'14px 20px', background:'#0f2d5a', borderRadius:'12px 12px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <span style={{ fontWeight:700, color:'#fff', fontSize:'15px' }}>Historique Contrats — {employee.nom}</span>
            <div style={{ fontSize:'10px', color:'#93c5fd', marginTop:'2px' }}>Mat: {employee.matricule || '—'} — {employee.qualification}</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={onAddNew}
              style={{ display:'flex', alignItems:'center', gap:'5px', background:'#16a34a', color:'white', border:'none', borderRadius:'6px', padding:'6px 12px', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>
              <Plus size={13} /> Nouveau Contrat
            </button>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'6px', padding:'5px 8px', color:'#fff', cursor:'pointer' }}><X size={15} /></button>
          </div>
        </div>

        <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'0' }}>
          {empContrats.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>
              <FileText size={36} style={{ opacity:0.3, marginBottom:'10px' }} />
              <p>Aucun contrat enregistré</p>
            </div>
          )}

          {empContrats.map((c, idx) => {
            const st = computeStatut(c);
            const statut = CONTRAT_STATUTS[st];
            const tc = CONTRAT_TYPE_COLORS[c.typeContrat] || CONTRAT_TYPE_COLORS['Autre'];
            const isLast = idx === empContrats.length - 1;

            return (
              <div key={c._id || c.id} style={{ display:'flex', gap:'0', position:'relative' }}>
                {/* Timeline line */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'40px', flexShrink:0 }}>
                  <div style={{ width:'14px', height:'14px', borderRadius:'50%', background: st === 'actif' ? tc.color : '#cbd5e1', border:`2px solid ${st === 'actif' ? tc.color : '#e2e8f0'}`, marginTop:'18px', zIndex:1, flexShrink:0 }} />
                  {!isLast && <div style={{ width:'2px', flex:1, background:'#e2e8f0', marginTop:'2px' }} />}
                </div>

                {/* Contrat card */}
                <div style={{ flex:1, margin:'10px 0 10px 10px', background: st === 'actif' ? '#fafffe' : '#fafafa', border:`1px solid ${st === 'actif' ? tc.border : '#e2e8f0'}`, borderRadius:'8px', padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'8px' }}>
                    <span style={{ background:tc.bg, color:tc.color, border:`1px solid ${tc.border}`, borderRadius:'5px', padding:'2px 8px', fontSize:'11px', fontWeight:800, flexShrink:0 }}>
                      {c.typeContrat}
                    </span>
                    <span style={{ background:statut.bg, color:statut.color, border:`1px solid ${statut.border}`, borderRadius:'5px', padding:'2px 8px', fontSize:'10px', fontWeight:700, flexShrink:0 }}>
                      {statut.icon} {statut.label}
                    </span>
                    {st === 'actif' && <span style={{ fontSize:'10px', color:'#16a34a', fontWeight:700, marginLeft:'auto' }}>● EN COURS</span>}
                    {st === 'termine' && <span style={{ fontSize:'10px', color:'#94a3b8', marginLeft:'auto' }}>Clôturé</span>}
                  </div>

                  {/* Salaire */}
                  {c.salaire > 0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                      <span style={{ background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', borderRadius:'5px', padding:'3px 10px', fontSize:'12px', fontWeight:800 }}>
                        💰 {(c.salaire||0).toLocaleString()} DH
                      </span>
                      <span style={{ background: c.typeSalaire==='journalier'?'#fef3c7':'#eff6ff', color: c.typeSalaire==='journalier'?'#d97706':'#2563eb', border:`1px solid ${c.typeSalaire==='journalier'?'#fcd34d':'#bfdbfe'}`, borderRadius:'5px', padding:'3px 9px', fontSize:'11px', fontWeight:700 }}>
                        {c.typeSalaire === 'journalier' ? '📅 Par jour' : '📆 Par mois'}
                      </span>
                    </div>
                  )}
                  {/* Dates */}
                  <div style={{ display:'flex', gap:'16px', fontSize:'12px', color:'#475569', marginBottom:'8px', flexWrap:'wrap' }}>
                    <span>📅 Début: <strong>{c.dateDebut}</strong></span>
                    {c.dateFin && <span>📅 Fin: <strong>{c.dateFin}</strong></span>}
                    {c.dateSignature && <span>✍️ Signé le: <strong>{c.dateSignature}</strong></span>}
                    {c.dateApprobationAnapec && <span>✓ ANAPEC: <strong>{c.dateApprobationAnapec}</strong></span>}
                    {c.motifFin && <span style={{ color:'#64748b' }}>Motif: <strong>{c.motifFin}</strong></span>}
                  </div>

                  {c.note && <p style={{ fontSize:'11px', color:'#64748b', fontStyle:'italic', margin:'0 0 8px' }}>{c.note}</p>}

                  {/* Actions */}
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                    {st === 'en_attente_signature' && (
                      <button onClick={() => onSigner(c)}
                        style={{ background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', borderRadius:'5px', padding:'4px 10px', cursor:'pointer', fontSize:'11px', fontWeight:700 }}>
                        ✍️ Signer le CDI
                      </button>
                    )}
                    {st === 'en_attente_anapec' && (
                      <button onClick={() => onApprouver(c)}
                        style={{ background:'#f5f3ff', color:'#7c3aed', border:'1px solid #c4b5fd', borderRadius:'5px', padding:'4px 10px', cursor:'pointer', fontSize:'11px', fontWeight:700 }}>
                        ✓ Approuver ANAPEC
                      </button>
                    )}
                    {st === 'actif' && (
                      <button onClick={() => onCloturer(c)}
                        style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fca5a5', borderRadius:'5px', padding:'4px 10px', cursor:'pointer', fontSize:'11px', fontWeight:700 }}>
                        Clôturer
                      </button>
                    )}
                    {st === 'termine' && (
                      <button onClick={() => onDelete(c)}
                        style={{ background:'none', color:'#94a3b8', border:'1px solid #e2e8f0', borderRadius:'5px', padding:'4px 8px', cursor:'pointer', fontSize:'10px' }}>
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIGNER / APPROUVER / CLÔTURER MINI MODALS
// ─────────────────────────────────────────────
function SignerModal({ contrat, onConfirm, onClose }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'10px', width:'360px', padding:'24px', boxShadow:'0 20px 50px rgba(0,0,0,0.3)' }}>
        <h3 style={{ color:'#16a34a', margin:'0 0 16px', fontSize:'16px' }}>✍️ Signer le CDI</h3>
        <p style={{ color:'#64748b', fontSize:'12px', margin:'0 0 14px' }}>Employé: <strong>{contrat.employeeNom}</strong></p>
        <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'4px' }}>Date de signature</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'8px 10px', fontSize:'13px', boxSizing:'border-box', marginBottom:'16px' }} />
        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'7px 16px', border:'1px solid #e2e8f0', borderRadius:'6px', cursor:'pointer', fontSize:'12px' }}>Annuler</button>
          <button onClick={() => onConfirm(date)} style={{ padding:'7px 16px', background:'#16a34a', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}

function ApprouverModal({ contrat, onConfirm, onClose }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'10px', width:'360px', padding:'24px', boxShadow:'0 20px 50px rgba(0,0,0,0.3)' }}>
        <h3 style={{ color:'#7c3aed', margin:'0 0 16px', fontSize:'16px' }}>⏳ Approbation ANAPEC</h3>
        <p style={{ color:'#64748b', fontSize:'12px', margin:'0 0 4px' }}>Employé: <strong>{contrat.employeeNom}</strong></p>
        <p style={{ color:'#64748b', fontSize:'12px', margin:'0 0 14px' }}>Type: <strong>{contrat.typeContrat}</strong></p>
        <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'4px' }}>Date d'approbation ANAPEC</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'8px 10px', fontSize:'13px', boxSizing:'border-box', marginBottom:'16px' }} />
        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'7px 16px', border:'1px solid #e2e8f0', borderRadius:'6px', cursor:'pointer', fontSize:'12px' }}>Annuler</button>
          <button onClick={() => onConfirm(date)} style={{ padding:'7px 16px', background:'#7c3aed', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>Approuver</button>
        </div>
      </div>
    </div>
  );
}

function CloturerModal({ contrat, onConfirm, onClose }) {
  const [motif, setMotif] = useState(MOTIFS_FIN[0]);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'10px', width:'360px', padding:'24px', boxShadow:'0 20px 50px rgba(0,0,0,0.3)' }}>
        <h3 style={{ color:'#dc2626', margin:'0 0 16px', fontSize:'16px' }}>Clôturer le Contrat</h3>
        <p style={{ color:'#64748b', fontSize:'12px', margin:'0 0 14px' }}>
          <strong>{contrat.employeeNom}</strong> — {contrat.typeContrat} (depuis {contrat.dateDebut})
        </p>
        <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'4px' }}>Motif de clôture</label>
        <select value={motif} onChange={e => setMotif(e.target.value)}
          style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box', marginBottom:'16px' }}>
          {MOTIFS_FIN.map(m => <option key={m}>{m}</option>)}
        </select>
        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'7px 16px', border:'1px solid #e2e8f0', borderRadius:'6px', cursor:'pointer', fontSize:'12px' }}>Annuler</button>
          <button onClick={() => onConfirm(motif)} style={{ padding:'7px 16px', background:'#dc2626', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>Clôturer</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTRATS VIEW
// ─────────────────────────────────────────────
function ContratsView({ employees, contrats, setContrats }) {
  const [search,        setSearch]        = useState('');
  const [filterType,    setFilterType]    = useState('');
  const [filterStatut,  setFilterStatut]  = useState('');
  const [showModal,     setShowModal]     = useState(false);
  const [timelineEmp,   setTimelineEmp]   = useState(null);
  const [editContrat,   setEditContrat]   = useState(null);
  const [miniModal,     setMiniModal]     = useState(null); // { type: 'signer'|'approuver'|'cloturer', contrat }
  const [preselEmp,     setPreselEmp]     = useState(null);

  // Un objet: employeeId → liste de ses contrats triée par date
  const byEmp = {};
  contrats.forEach(c => {
    if (!byEmp[c.employeeId]) byEmp[c.employeeId] = [];
    byEmp[c.employeeId].push(c);
  });

  // Contrat courant d'un employé (actif en premier, sinon le plus récent terminé)
  const getCurrentContrat = (empId) => {
    const list = (byEmp[String(empId)] || []).sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));
    return list.find(c => computeStatut(c) !== 'termine') || list[0] || null;
  };

  // Stats globales
  const statsActif     = contrats.filter(c => computeStatut(c) === 'actif').length;
  const statsAttSig    = contrats.filter(c => computeStatut(c) === 'en_attente_signature').length;
  const statsAttAnapec = contrats.filter(c => computeStatut(c) === 'en_attente_anapec').length;
  const statsCDDAlerts = contrats.filter(c => {
    if (c.typeContrat !== 'CDD' || computeStatut(c) === 'termine' || !c.dateFin) return false;
    const diff = Math.round((new Date(c.dateFin) - new Date()) / 86400000);
    return diff <= 30;
  }).length;

  // Filtrer les employés à afficher
  const filteredEmps = employees.filter(emp => {
    const matchSearch = emp.nom.toLowerCase().includes(search.toLowerCase()) || (emp.matricule || '').toLowerCase().includes(search.toLowerCase());
    const cur = getCurrentContrat(emp._id || emp.id);
    const matchType   = !filterType   || (cur && cur.typeContrat === filterType);
    const matchStatut = !filterStatut || (cur && computeStatut(cur) === filterStatut);
    return matchSearch && matchType && matchStatut;
  });

  // ── Actions ──
  const handleSaveContrat = async (form, cloture) => {
    let updated = contrats;
    // Clôturer le contrat précédent si demandé
    if (cloture && cloture.contrat) {
      updated = await store.updateContrat(cloture.contrat._id || cloture.contrat.id, {
        ...cloture.contrat, statut: 'termine', motifFin: cloture.motif,
      });
    }
    // Calculer le statut initial du nouveau contrat
    let statut = 'actif';
    if (form.typeContrat === 'CDI' && !form.dateSignature) statut = 'en_attente_signature';
    if (isAnapec(form.typeContrat) && !form.dateApprobationAnapec) statut = 'en_attente_anapec';
    const saved = await store.saveContrat({ ...form, statut });
    setContrats(saved);
    setShowModal(false);
    setPreselEmp(null);
  };

  const handleSigner = async (date) => {
    const c = miniModal.contrat;
    const updated = await store.updateContrat(c._id || c.id, { ...c, dateSignature: date, statut: 'actif' });
    setContrats(updated);
    setMiniModal(null);
    if (timelineEmp) setTimelineEmp(prev => ({ ...prev })); // refresh
  };

  const handleApprouver = async (date) => {
    const c = miniModal.contrat;
    const updated = await store.updateContrat(c._id || c.id, { ...c, dateApprobationAnapec: date, statut: 'actif' });
    setContrats(updated);
    setMiniModal(null);
  };

  const handleCloturer = async (motif) => {
    const c = miniModal.contrat;
    const updated = await store.updateContrat(c._id || c.id, { ...c, statut: 'termine', motifFin: motif });
    setContrats(updated);
    setMiniModal(null);
  };

  const handleDelete = async (c) => {
    if (!confirm(`Supprimer ce contrat ${c.typeContrat} ?`)) return;
    const updated = await store.deleteContrat(c._id || c.id);
    setContrats(updated);
  };

  return (
    <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
        {[
          { label:'Contrats actifs',        value: statsActif,     color:'#16a34a', bg:'#f0fdf4', icon:'✅' },
          { label:'En attente signature',   value: statsAttSig,    color:'#d97706', bg:'#fef3c7', icon:'✍️' },
          { label:'En attente ANAPEC',      value: statsAttAnapec, color:'#7c3aed', bg:'#f5f3ff', icon:'⏳' },
          { label:'CDD expirés bientôt',    value: statsCDDAlerts, color:'#dc2626', bg:'#fef2f2', icon:'⚠️' },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
            <span style={{ fontSize:'24px' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize:'22px', fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:'10px', color:'#64748b' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres + bouton */}
      <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ flex:1, position:'relative', minWidth:'200px' }}>
          <Search size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un employé..."
            style={{ width:'100%', boxSizing:'border-box', padding:'9px 10px 9px 32px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px' }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'9px 12px', fontSize:'13px', color:'#475569', background:'#fff' }}>
          <option value="">Tous les types</option>
          {CONTRAT_TRAVAIL_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'9px 12px', fontSize:'13px', color:'#475569', background:'#fff' }}>
          <option value="">Tous les statuts</option>
          {Object.entries(CONTRAT_STATUTS).map(([k, s]) => <option key={k} value={k}>{s.icon} {s.label}</option>)}
        </select>
        <button onClick={() => { setPreselEmp(null); setEditContrat(null); setShowModal(true); }}
          style={{ display:'flex', alignItems:'center', gap:'6px', background:'#0f2d5a', color:'white', border:'none', borderRadius:'8px', padding:'9px 18px', cursor:'pointer', fontSize:'13px', fontWeight:700, flexShrink:0 }}>
          <Plus size={14} /> Nouveau Contrat
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
          <thead>
            <tr style={{ background:'#0f2d5a' }}>
              {['Employé','Contrat actuel','Salaire','Depuis','Jusqu\'au','Statut','Historique','Actions'].map(h => (
                <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:'10px', color:'#93c5fd', fontWeight:700, textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmps.length === 0 && (
              <tr><td colSpan={8} style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>Aucun employé trouvé</td></tr>
            )}
            {filteredEmps.map((emp, i) => {
              const cur   = getCurrentContrat(emp._id || emp.id);
              const st    = cur ? computeStatut(cur) : null;
              const statut = st ? CONTRAT_STATUTS[st] : null;
              const tc    = cur ? (CONTRAT_TYPE_COLORS[cur.typeContrat] || CONTRAT_TYPE_COLORS['Autre']) : null;
              const nbContrats = (byEmp[String(emp._id || emp.id)] || []).length;

              // Alerte CDD proche expiration
              const cddAlert = cur && cur.typeContrat === 'CDD' && cur.dateFin && st !== 'termine'
                ? getCDDStatus({ typeContrat:'CDD', dateFinContrat: cur.dateFin })
                : null;

              return (
                <tr key={emp._id || emp.id} style={{ borderBottom:'1px solid #f1f5f9', background: i%2===0 ? '#fff' : '#fafafa' }}>
                  {/* Employé */}
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'#1a4fa0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:800, color:'white', flexShrink:0 }}>
                        {emp.nom.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, color:'#0f2d5a' }}>{emp.nom}</div>
                        <div style={{ fontSize:'10px', color:'#94a3b8' }}>Mat: {emp.matricule || '—'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Type contrat actuel */}
                  <td style={{ padding:'12px 14px' }}>
                    {cur ? (
                      <span style={{ background:tc.bg, color:tc.color, border:`1px solid ${tc.border}`, borderRadius:'5px', padding:'3px 9px', fontSize:'11px', fontWeight:800 }}>
                        {cur.typeContrat}
                      </span>
                    ) : (
                      <span style={{ color:'#94a3b8', fontSize:'11px', fontStyle:'italic' }}>Aucun contrat</span>
                    )}
                  </td>

                  {/* Salaire */}
                  <td style={{ padding:'12px 14px' }}>
                    {cur?.salaire > 0 ? (
                      <div>
                        <div style={{ fontWeight:800, color:'#16a34a', fontSize:'12px' }}>{(cur.salaire).toLocaleString()} DH</div>
                        <div style={{ fontSize:'9px', fontWeight:700, color: cur.typeSalaire==='journalier'?'#d97706':'#2563eb' }}>
                          {cur.typeSalaire === 'journalier' ? '📅 /jour' : '📆 /mois'}
                        </div>
                      </div>
                    ) : <span style={{ color:'#cbd5e1', fontSize:'11px' }}>—</span>}
                  </td>

                  {/* Depuis */}
                  <td style={{ padding:'12px 14px', color:'#475569', fontSize:'11px' }}>{cur?.dateDebut || '—'}</td>

                  {/* Jusqu'au */}
                  <td style={{ padding:'12px 14px', fontSize:'11px' }}>
                    {cur?.dateFin ? (
                      <div>
                        <div style={{ color:'#475569' }}>{cur.dateFin}</div>
                        {cddAlert && (
                          <span style={{ background:cddAlert.bg, color:cddAlert.color, border:`1px solid ${cddAlert.border}`, borderRadius:'4px', padding:'1px 5px', fontSize:'9px', fontWeight:700 }}>
                            {cddAlert.label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color:'#16a34a', fontSize:'11px', fontWeight:700 }}>En cours ●</span>
                    )}
                  </td>

                  {/* Statut */}
                  <td style={{ padding:'12px 14px' }}>
                    {statut ? (
                      <span style={{ background:statut.bg, color:statut.color, border:`1px solid ${statut.border}`, borderRadius:'5px', padding:'2px 7px', fontSize:'10px', fontWeight:700 }}>
                        {statut.icon} {statut.label}
                      </span>
                    ) : '—'}
                  </td>

                  {/* Historique */}
                  <td style={{ padding:'12px 14px' }}>
                    <button onClick={() => setTimelineEmp(emp)}
                      style={{ background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:'5px', padding:'4px 10px', cursor:'pointer', fontSize:'11px', fontWeight:700 }}>
                      📋 {nbContrats} contrat{nbContrats !== 1 ? 's' : ''}
                    </button>
                  </td>

                  {/* Actions rapides */}
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                      {st === 'en_attente_signature' && (
                        <button onClick={() => setMiniModal({ type:'signer', contrat: cur })}
                          style={{ background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', borderRadius:'5px', padding:'4px 8px', cursor:'pointer', fontSize:'10px', fontWeight:700 }}>
                          ✍️ Signer
                        </button>
                      )}
                      {st === 'en_attente_anapec' && (
                        <button onClick={() => setMiniModal({ type:'approuver', contrat: cur })}
                          style={{ background:'#f5f3ff', color:'#7c3aed', border:'1px solid #c4b5fd', borderRadius:'5px', padding:'4px 8px', cursor:'pointer', fontSize:'10px', fontWeight:700 }}>
                          ✓ ANAPEC
                        </button>
                      )}
                      <button onClick={() => { setPreselEmp(emp); setEditContrat(null); setShowModal(true); }}
                        style={{ background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', borderRadius:'5px', padding:'4px 8px', cursor:'pointer', fontSize:'10px', fontWeight:700 }}>
                        <Plus size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showModal && (
        <ContratModal
          employees={employees}
          contrats={contrats}
          editContrat={editContrat || (preselEmp ? {
            employeeId: preselEmp._id || preselEmp.id,
            employeeNom: preselEmp.nom,
            matricule: preselEmp.matricule || '',
            typeContrat:'CDI', dateDebut: new Date().toISOString().split('T')[0],
            dateFin:'', dateSignature:'', dateApprobationAnapec:'',
            statut:'actif', motifFin:'', note:'',
          } : null)}
          onSave={handleSaveContrat}
          onClose={() => { setShowModal(false); setPreselEmp(null); setEditContrat(null); }}
        />
      )}

      {timelineEmp && (
        <ContratTimelineModal
          employee={timelineEmp}
          contrats={contrats}
          onApprouver={c => setMiniModal({ type:'approuver', contrat: c })}
          onSigner={c => setMiniModal({ type:'signer', contrat: c })}
          onCloturer={c => setMiniModal({ type:'cloturer', contrat: c })}
          onDelete={handleDelete}
          onAddNew={() => { setPreselEmp(timelineEmp); setEditContrat(null); setShowModal(true); }}
          onClose={() => setTimelineEmp(null)}
        />
      )}

      {miniModal?.type === 'signer'    && <SignerModal    contrat={miniModal.contrat} onConfirm={handleSigner}    onClose={() => setMiniModal(null)} />}
      {miniModal?.type === 'approuver' && <ApprouverModal contrat={miniModal.contrat} onConfirm={handleApprouver} onClose={() => setMiniModal(null)} />}
      {miniModal?.type === 'cloturer'  && <CloturerModal  contrat={miniModal.contrat} onConfirm={handleCloturer}  onClose={() => setMiniModal(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// DOCUMENTATION — CONSTANTS
// ─────────────────────────────────────────────
const DEMANDE_TYPES = [
  'Demande de congé',
  'Avance sur salaire',
  'Réclamation salaire',
  'Attestation de travail',
  'Certificat de travail',
  'Suggestion / Amélioration',
  'Signalement',
  'Autre',
];

const DEMANDE_STATUTS = {
  recue:    { label: 'Reçue',           color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '📥' },
  en_cours: { label: 'En cours',        color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: '⚙️' },
  traitee:  { label: 'Acceptée مقبول', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: '✅' },
  refusee:  { label: 'Refusée مرفود',  color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: '❌' },
};

const DEMANDE_PRIORITES = {
  faible:   { label: 'Faible',   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  normale:  { label: 'Normale',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  urgente:  { label: 'Urgente',  color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

// ─────────────────────────────────────────────
// DEMANDE MODAL
// ─────────────────────────────────────────────
function DemandeModal({ demande, employees, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState(demande || {
    titre: '', type: 'Demande de congé', employeeId: '', employeeNom: '',
    expediteur: '', dateDemande: today, description: '', priorite: 'normale',
    statut: 'recue', reponse: '', dateReponse: '', traitePar: '',
  });

  const handleEmpChange = (id) => {
    const emp = employees.find(e => String(e._id || e.id) === id);
    setForm(f => ({ ...f, employeeId: id, employeeNom: emp ? emp.nom : '', expediteur: '' }));
  };

  const submit = () => {
    if (!form.titre.trim()) return alert('Titre / Objet obligatoire');
    if (!form.employeeId && !form.expediteur.trim()) return alert('Indiquer l\'expéditeur (employé ou externe)');
    onSave(form);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'12px', width:'600px', maxHeight:'92vh', overflow:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding:'14px 20px', background:'#0f2d5a', borderRadius:'12px 12px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, color:'#fff', fontSize:'15px' }}>
              {demande ? 'Modifier la Demande' : 'Nouvelle Demande'}
            </div>
            {demande?.reference && (
              <div style={{ fontSize:'11px', color:'#fbbf24', marginTop:'2px', fontWeight:700, letterSpacing:'0.5px' }}>
                Réf: {demande.reference}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'6px', padding:'5px 8px', color:'#fff', cursor:'pointer' }}><X size={15} /></button>
        </div>

        <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'13px' }}>
          {/* Objet */}
          <Field label="Objet / Titre *" value={form.titre} onChange={v => setForm(f => ({...f, titre:v}))} />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            {/* Type */}
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'4px' }}>Type de demande</label>
              <select value={form.type} onChange={e => setForm(f => ({...f, type:e.target.value}))}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box' }}>
                {DEMANDE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {/* Date */}
            <Field label="Date de réception" type="date" value={form.dateDemande} onChange={v => setForm(f => ({...f, dateDemande:v}))} />
          </div>

          {/* Expéditeur */}
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'4px' }}>
              Expéditeur (De qui) *
            </label>
            <select value={form.employeeId} onChange={e => handleEmpChange(e.target.value)}
              style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box', marginBottom:'6px' }}>
              <option value="">-- Externe / Hors liste --</option>
              {employees.map(emp => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.nom} — {emp.matricule || 'N/A'}</option>
              ))}
            </select>
            {!form.employeeId && (
              <input value={form.expediteur} onChange={e => setForm(f => ({...f, expediteur:e.target.value}))}
                placeholder="Nom de l'expéditeur externe..."
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box' }} />
            )}
          </div>

          {/* Priorité */}
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'6px' }}>Priorité</label>
            <div style={{ display:'flex', gap:'8px' }}>
              {Object.entries(DEMANDE_PRIORITES).map(([k, p]) => (
                <button key={k} onClick={() => setForm(f => ({...f, priorite:k}))}
                  style={{ flex:1, padding:'7px', borderRadius:'7px', fontSize:'12px', fontWeight:700, cursor:'pointer', border:`2px solid ${form.priorite===k ? p.color : '#e2e8f0'}`, background: form.priorite===k ? p.bg : '#f8fafc', color: form.priorite===k ? p.color : '#94a3b8' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'4px' }}>Description / Détails</label>
            <textarea value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} rows={3}
              style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box', resize:'vertical' }} />
          </div>

          {/* Statut + Réponse (si modification) */}
          {demande && (
            <>
              <hr style={{ border:'none', borderTop:'2px dashed #e2e8f0' }} />
              <div>
                <label style={{ fontSize:'11px', fontWeight:700, color:'#0f2d5a', display:'block', marginBottom:'8px' }}>TRAITEMENT DE LA DEMANDE</label>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'10px' }}>
                  {Object.entries(DEMANDE_STATUTS).map(([k, s]) => (
                    <button key={k} onClick={() => setForm(f => ({...f, statut:k}))}
                      style={{ padding:'7px 12px', borderRadius:'7px', fontSize:'11px', fontWeight:700, cursor:'pointer', border:`2px solid ${form.statut===k ? s.color : '#e2e8f0'}`, background: form.statut===k ? s.bg : '#f8fafc', color: form.statut===k ? s.color : '#94a3b8' }}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                  <Field label="Traité par" value={form.traitePar} onChange={v => setForm(f => ({...f, traitePar:v}))} />
                  <Field label="Date de réponse" type="date" value={form.dateReponse} onChange={v => setForm(f => ({...f, dateReponse:v}))} />
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:700, color:'#475569', display:'block', marginBottom:'4px' }}>Réponse / Décision</label>
                  <textarea value={form.reponse} onChange={e => setForm(f => ({...f, reponse:e.target.value}))} rows={3}
                    placeholder="Entrer la réponse ou décision prise..."
                    style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box', resize:'vertical' }} />
                </div>
              </div>
            </>
          )}

          <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', borderTop:'1px solid #e2e8f0', paddingTop:'12px' }}>
            <button onClick={onClose} style={{ padding:'8px 18px', border:'1px solid #e2e8f0', borderRadius:'7px', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontSize:'13px' }}>Annuler</button>
            <button onClick={submit}
              style={{ padding:'8px 20px', background:'#0f2d5a', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:700, display:'flex', alignItems:'center', gap:'6px' }}>
              <Save size={14} /> Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DEMANDE DETAIL MODAL (lecture + réponse rapide)
// ─────────────────────────────────────────────
function DemandeDetailModal({ demande, onUpdateStatut, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const [reponse,     setReponse]     = useState(demande.reponse || '');
  const [dateReponse, setDateReponse] = useState(demande.dateReponse || today);
  const [traitePar,   setTraitePar]   = useState(demande.traitePar || '');
  const [statut,      setStatut]      = useState(demande.statut || 'recue');
  const st = DEMANDE_STATUTS[demande.statut] || DEMANDE_STATUTS.recue;
  const pr = DEMANDE_PRIORITES[demande.priorite] || DEMANDE_PRIORITES.normale;

  const expediteur = demande.employeeNom || demande.expediteur || '—';

  const genRefReponse = () => {
    if (demande.referenceReponse) return demande.referenceReponse;
    const now = new Date();
    const ym  = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const seq = (demande.reference || 'DEM-000000-000').split('-').pop();
    return `REP-${ym}-${seq}`;
  };

  const handleSave = () => {
    const referenceReponse = genRefReponse();
    onUpdateStatut({ ...demande, statut, reponse, dateReponse, traitePar, referenceReponse });
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'12px', width:'600px', maxHeight:'92vh', overflow:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ padding:'14px 20px', background:'#0f2d5a', borderRadius:'12px 12px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, color:'#fff', fontSize:'14px' }}>{demande.titre}</div>
            <div style={{ fontSize:'10px', color:'#93c5fd', marginTop:'2px' }}>
              {demande.type} — {demande.dateDemande}
              {demande.reference && (
                <span style={{ marginLeft:'10px', background:'rgba(251,191,36,0.2)', color:'#fbbf24', borderRadius:'4px', padding:'1px 7px', fontWeight:800 }}>
                  {demande.reference}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'6px', padding:'5px 8px', color:'#fff', cursor:'pointer' }}><X size={15} /></button>
        </div>

        <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'14px' }}>
          {/* Info ligne */}
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ background:st.bg, color:st.color, border:`1px solid ${st.border}`, borderRadius:'6px', padding:'3px 10px', fontSize:'11px', fontWeight:700 }}>
              {st.icon} {st.label}
            </span>
            <span style={{ background:pr.bg, color:pr.color, border:`1px solid ${pr.border}`, borderRadius:'6px', padding:'3px 10px', fontSize:'11px', fontWeight:700 }}>
              {pr.label}
            </span>
            <span style={{ background:'#f8fafc', color:'#475569', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'3px 10px', fontSize:'11px', fontWeight:600 }}>
              👤 {expediteur}
            </span>
          </div>

          {/* Description */}
          {demande.description && (
            <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'12px 14px' }}>
              <div style={{ fontSize:'10px', fontWeight:700, color:'#94a3b8', marginBottom:'6px', textTransform:'uppercase' }}>Description</div>
              <p style={{ fontSize:'13px', color:'#1e293b', margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{demande.description}</p>
            </div>
          )}

          {/* Réponse existante */}
          {demande.reponse && (
            <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:'8px', padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:'#16a34a', textTransform:'uppercase' }}>
                  Réponse — {demande.dateReponse} {demande.traitePar && `(par ${demande.traitePar})`}
                </div>
                {demande.referenceReponse && (
                  <span style={{ fontSize:'10px', fontWeight:800, color:'#16a34a', background:'#dcfce7', border:'1px solid #86efac', borderRadius:'4px', padding:'1px 8px' }}>
                    {demande.referenceReponse}
                  </span>
                )}
              </div>
              <p style={{ fontSize:'13px', color:'#1e293b', margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{demande.reponse}</p>
            </div>
          )}

          {/* Section traitement / réponse */}
          <div style={{ border:'2px dashed #e2e8f0', borderRadius:'8px', padding:'14px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'#0f2d5a', marginBottom:'4px' }}>Réponse & Décision</div>
            <div style={{ fontSize:'10px', color:'#94a3b8', marginBottom:'10px' }}>
              Réf réponse: <strong style={{ color:'#0f2d5a' }}>{genRefReponse()}</strong>
            </div>

            {/* Décision: Pending / Acceptée / Refusée */}
            <div style={{ display:'flex', gap:'6px', marginBottom:'12px' }}>
              {[
                { k:'recue',    label:'⏳ Pending',          color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe' },
                { k:'traitee',  label:'✅ Acceptée مقبول',  color:'#16a34a', bg:'#f0fdf4', border:'#86efac' },
                { k:'refusee',  label:'❌ Refusée مرفود',   color:'#dc2626', bg:'#fef2f2', border:'#fca5a5' },
              ].map(s => (
                <button key={s.k} onClick={() => setStatut(s.k)}
                  style={{ flex:1, padding:'8px 6px', borderRadius:'7px', fontSize:'11px', fontWeight:700, cursor:'pointer',
                    border:`2px solid ${statut===s.k ? s.color : '#e2e8f0'}`,
                    background: statut===s.k ? s.bg : '#f8fafc',
                    color: statut===s.k ? s.color : '#94a3b8' }}>
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px' }}>
              <Field label="Traité par" value={traitePar} onChange={setTraitePar} />
              <Field label="Date réponse" type="date" value={dateReponse} onChange={setDateReponse} />
            </div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'3px' }}>Contenu de la réponse</label>
              <textarea value={reponse} onChange={e => setReponse(e.target.value)} rows={3}
                placeholder="Saisir la réponse ou décision..."
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'7px 10px', fontSize:'12px', boxSizing:'border-box', resize:'vertical' }} />
            </div>
          </div>

          <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
            <button onClick={onClose} style={{ padding:'8px 18px', border:'1px solid #e2e8f0', borderRadius:'7px', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontSize:'13px' }}>Fermer</button>
            <button onClick={handleSave}
              style={{ padding:'8px 20px', background:'#16a34a', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:700, display:'flex', alignItems:'center', gap:'6px' }}>
              <Save size={14} /> Enregistrer la réponse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DOCUMENTATION VIEW
// ─────────────────────────────────────────────
function DocumentationView({ employees, demandes, setDemandes }) {
  const [tab,        setTab]        = useState('demandes');
  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSt,   setFilterSt]   = useState('');
  const [filterPrio, setFilterPrio] = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [detail,     setDetail]     = useState(null);

  const filtered = demandes.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.titre?.toLowerCase().includes(q)
      || d.employeeNom?.toLowerCase().includes(q)
      || d.expediteur?.toLowerCase().includes(q)
      || d.reference?.toLowerCase().includes(q)
      || d.referenceReponse?.toLowerCase().includes(q)
      || d.description?.toLowerCase().includes(q);
    const matchType   = !filterType || d.type === filterType;
    const matchSt     = !filterSt   || d.statut === filterSt;
    const matchPrio   = !filterPrio || d.priorite === filterPrio;
    return matchSearch && matchType && matchSt && matchPrio;
  });

  const stats = {
    recue:    demandes.filter(d => d.statut === 'recue').length,
    en_cours: demandes.filter(d => d.statut === 'en_cours').length,
    traitee:  demandes.filter(d => d.statut === 'traitee').length,
    refusee:  demandes.filter(d => d.statut === 'refusee').length,
    urgente:  demandes.filter(d => d.priorite === 'urgente' && d.statut !== 'traitee' && d.statut !== 'refusee').length,
  };

  const handleSave = async (form) => {
    const updated = await store.saveDemande(form);
    setDemandes(updated);
    setShowModal(false);
    setEditing(null);
  };

  const handleUpdate = async (form) => {
    const updated = await store.saveDemande(form);
    setDemandes(updated);
    setDetail(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette demande ?')) return;
    setDemandes(await store.deleteDemande(id));
  };

  const TABS = [
    { id: 'demandes', label: '📋 Demandes & Suivi' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'0 24px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'12px 20px', border:'none', borderBottom:`3px solid ${tab===t.id?'#2563eb':'transparent'}`, background:'none', cursor:'pointer', fontSize:'13px', fontWeight: tab===t.id?700:400, color: tab===t.id?'#2563eb':'#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px' }}>
          {[
            { label:'Reçues',      value: stats.recue,    ...DEMANDE_STATUTS.recue    },
            { label:'En cours',    value: stats.en_cours, ...DEMANDE_STATUTS.en_cours },
            { label:'Traitées',    value: stats.traitee,  ...DEMANDE_STATUTS.traitee  },
            { label:'Refusées',    value: stats.refusee,  ...DEMANDE_STATUTS.refusee  },
            { label:'Urgentes',    value: stats.urgente,   color:'#dc2626', bg:'#fef2f2', border:'#fca5a5', icon:'🚨' },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff', border:`1px solid ${s.border}`, borderRadius:'10px', padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
              <span style={{ fontSize:'22px' }}>{s.icon}</span>
              <div>
                <div style={{ fontSize:'22px', fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'10px', color:'#64748b' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ flex:1, position:'relative', minWidth:'200px' }}>
            <Search size={13} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher demande, employé..."
              style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px 8px 30px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px' }} />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'8px 10px', fontSize:'12px', color:'#475569', background:'#fff' }}>
            <option value="">Tous les types</option>
            {DEMANDE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterSt} onChange={e => setFilterSt(e.target.value)}
            style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'8px 10px', fontSize:'12px', color:'#475569', background:'#fff' }}>
            <option value="">Tous les statuts</option>
            {Object.entries(DEMANDE_STATUTS).map(([k,s]) => <option key={k} value={k}>{s.icon} {s.label}</option>)}
          </select>
          <select value={filterPrio} onChange={e => setFilterPrio(e.target.value)}
            style={{ border:'1px solid #e2e8f0', borderRadius:'8px', padding:'8px 10px', fontSize:'12px', color:'#475569', background:'#fff' }}>
            <option value="">Toutes priorités</option>
            {Object.entries(DEMANDE_PRIORITES).map(([k,p]) => <option key={k} value={k}>{p.label}</option>)}
          </select>
          <button onClick={() => { setEditing(null); setShowModal(true); }}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'#0f2d5a', color:'white', border:'none', borderRadius:'8px', padding:'8px 16px', cursor:'pointer', fontSize:'13px', fontWeight:700, flexShrink:0 }}>
            <Plus size={14} /> Nouvelle Demande
          </button>
        </div>

        {/* Table */}
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
            <thead>
              <tr style={{ background:'#0f2d5a' }}>
                {['Réf','Objet','Type','De qui','Date','Priorité','Statut','Réf Réponse','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'10px', color:'#93c5fd', fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>
                  {demandes.length === 0 ? 'Aucune demande enregistrée' : 'Aucun résultat'}
                </td></tr>
              ) : filtered.map((d, i) => {
                const st = DEMANDE_STATUTS[d.statut] || DEMANDE_STATUTS.recue;
                const pr = DEMANDE_PRIORITES[d.priorite] || DEMANDE_PRIORITES.normale;
                const deQui = d.employeeNom || d.expediteur || '—';
                return (
                  <tr key={d._id || d.id} style={{ borderBottom:'1px solid #f1f5f9', background: i%2===0?'#fff':'#fafafa' }}>
                    {/* Référence */}
                    <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                      {d.reference
                        ? <span style={{ background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:'4px', padding:'2px 8px', fontSize:'10px', fontWeight:800 }}>{d.reference}</span>
                        : <span style={{ color:'#cbd5e1', fontSize:'10px' }}>—</span>
                      }
                    </td>
                    {/* Objet */}
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ fontWeight:700, color:'#0f2d5a', fontSize:'12px', maxWidth:'180px' }}>{d.titre}</div>
                      {d.description && (
                        <div style={{ fontSize:'10px', color:'#94a3b8', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'180px' }}>
                          {d.description}
                        </div>
                      )}
                    </td>
                    {/* Type */}
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ background:'#f1f5f9', color:'#475569', borderRadius:'4px', padding:'2px 7px', fontSize:'10px', fontWeight:600, whiteSpace:'nowrap' }}>
                        {d.type}
                      </span>
                    </td>
                    {/* De qui */}
                    <td style={{ padding:'11px 14px', color:'#475569', fontSize:'11px', whiteSpace:'nowrap' }}>
                      👤 {deQui}
                    </td>
                    {/* Date */}
                    <td style={{ padding:'11px 14px', color:'#64748b', fontSize:'11px', whiteSpace:'nowrap' }}>{d.dateDemande}</td>
                    {/* Priorité */}
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ background:pr.bg, color:pr.color, border:`1px solid ${pr.border}`, borderRadius:'4px', padding:'2px 7px', fontSize:'10px', fontWeight:700 }}>
                        {pr.label}
                      </span>
                    </td>
                    {/* Statut */}
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ background:st.bg, color:st.color, border:`1px solid ${st.border}`, borderRadius:'5px', padding:'3px 8px', fontSize:'10px', fontWeight:700, whiteSpace:'nowrap' }}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    {/* Réf Réponse */}
                    <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                      {d.referenceReponse ? (
                        <span style={{ background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', borderRadius:'4px', padding:'2px 8px', fontSize:'10px', fontWeight:800 }}>
                          {d.referenceReponse}
                        </span>
                      ) : (
                        <span style={{ fontSize:'10px', color:'#cbd5e1', fontStyle:'italic' }}>⏳ Pending</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ display:'flex', gap:'5px' }}>
                        <button onClick={() => setDetail(d)} title="Voir / Répondre"
                          style={{ background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:'5px', padding:'5px 8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px', fontSize:'11px', fontWeight:700 }}>
                          <MessageSquare size={11} /> Répondre
                        </button>
                        <button onClick={() => { setEditing(d); setShowModal(true); }}
                          style={{ background:'#f8fafc', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:'5px', padding:'5px 7px', cursor:'pointer', display:'flex' }}>
                          <Edit2 size={11} />
                        </button>
                        <button onClick={() => handleDelete(d._id || d.id)}
                          style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fca5a5', borderRadius:'5px', padding:'5px 7px', cursor:'pointer', display:'flex' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <DemandeModal demande={editing} employees={employees} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null); }} />
      )}
      {detail && (
        <DemandeDetailModal demande={detail} onUpdateStatut={handleUpdate} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function GestionRH() {
  const [view, setView]               = useState('dashboard');
  const [employees,  setEmployees]    = useState([]);
  const [bulletins,  setBulletins]    = useState([]);
  const [charges,    setCharges]      = useState([]);
  const [recettes,   setRecettes]     = useState([]);
  const [contrats,   setContrats]     = useState([]);
  const [demandes,   setDemandes]     = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    store.getEmployees().then(setEmployees).catch(console.error);
    store.getBulletins().then(setBulletins).catch(console.error);
    store.getCharges().then(setCharges).catch(console.error);
    store.getRecettes().then(setRecettes).catch(console.error);
    store.getContrats().then(setContrats).catch(console.error);
    store.getDemandes().then(setDemandes).catch(console.error);
  }, []);

  const handleSetView = (v) => {
    setView(v);
    if (v !== 'paie') setSelectedEmp(null);
  };

  const totalChargesNet  = charges.reduce((s, c) => s + (c.montant||0), 0);
  const totalRecettesNet = recettes.reduce((s, r) => s + (r.montant||0), 0);

  const viewMeta = {
    dashboard:  { title: 'Dashboard',              subtitle: "Vue d'ensemble de la gestion RH" },
    employees:  { title: 'Employés',               subtitle: `${employees.length} employé(s) enregistré(s)` },
    contrats:       { title: 'Contrats de Travail',    subtitle: `${contrats.length} contrat(s) enregistré(s)` },
    documentation:  { title: 'Documentation',          subtitle: `Demandes, suivi & traçabilité — ${demandes.length} demande(s)` },
    pointage:   { title: 'Feuille de Pointage',    subtitle: 'Présences — calcul automatique des jours et salaires' },
    paie:       { title: 'Générer Paie',            subtitle: 'Créer et imprimer un bulletin de paie' },
    historique: { title: 'Historique Paie',        subtitle: `${bulletins.length} bulletin(s) généré(s)` },
    finance:    { title: 'Charges & Finance',      subtitle: `Recettes: ${totalRecettesNet.toLocaleString()} DH — Charges: ${totalChargesNet.toLocaleString()} DH` },
  };

  const { title, subtitle } = viewMeta[view] || {};

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      <Sidebar view={view} setView={handleSetView} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar title={title} subtitle={subtitle} />
        <div style={{ flex: 1, overflow: 'auto' }}>
          {view === 'dashboard'  && <DashboardView  employees={employees} bulletins={bulletins} setView={handleSetView} setSelectedEmp={setSelectedEmp} />}
          {view === 'employees'  && <EmployeesView  employees={employees} setEmployees={setEmployees} />}
          {view === 'contrats'   && <ContratsView   employees={employees} contrats={contrats} setContrats={setContrats} />}
          {view === 'pointage'   && <PointageView    employees={employees} />}
          {view === 'paie'       && <PaieView        employees={employees} setBulletins={setBulletins} selectedEmp={selectedEmp} setSelectedEmp={setSelectedEmp} />}
          {view === 'historique' && <HistoriqueView  bulletins={bulletins} setBulletins={setBulletins} />}
          {view === 'finance'        && <FinanceView        charges={charges} setCharges={setCharges} recettes={recettes} setRecettes={setRecettes} bulletins={bulletins} />}
          {view === 'documentation'  && <DocumentationView  employees={employees} demandes={demandes} setDemandes={setDemandes} />}
        </div>
      </div>
    </div>
  );
}
