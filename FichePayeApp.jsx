"use client";

import React, { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, Calculator, Building2, PenLine, Plus, Trash2, HardHat } from "lucide-react";

const DEDUCTION_PRESETS = [
  { id: 'cnss',      label: 'Cotisation CNSS (Forfait ANAPEC)', defaultAmount: 200 },
  { id: 'ir',        label: 'Impôt sur le Revenu (IR)',          defaultAmount: 0   },
  { id: 'logement',  label: 'Retenue Logement',                  defaultAmount: 0   },
  { id: 'avance',    label: 'Avance sur Salaire',                defaultAmount: 0   },
  { id: 'nourriture',label: 'Frais de Nourriture',               defaultAmount: 0   },
  { id: 'credit',    label: 'Crédit / Remboursement',            defaultAmount: 0   },
  { id: 'transport', label: 'Retenue Transport',                 defaultAmount: 0   },
  { id: 'autre',     label: 'Autre Retenue',                     defaultAmount: 0   },
];

export default function FichePayeApp() {
  const [employee, setEmployee] = useState({
    nom: 'MOUSSAOUI Hemza',
    matricule: '0024',
    qualification: 'Ouvrier',
    salaireBrut: 4500,
    periode: 'Mai 2026',
    datePaiement: '2026-05-28',
    etat: 'en_attente',
    montantVerse: 0,
  });

  const ETATS = {
    paye:       { label: 'Payé',        color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: '✓' },
    partiel:    { label: 'Partiel',     color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', icon: '◑' },
    non_paye:   { label: 'Non Payé',    color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: '✗' },
    en_attente: { label: 'En Attente',  color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: '⏳' },
  };

  const [deductions, setDeductions] = useState([
    { key: 'cnss',     label: 'Cotisation CNSS (Forfait ANAPEC)', amount: 200 },
    { key: 'logement', label: 'Retenue Logement',                  amount: 900 },
  ]);

  const totalDeductions = deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const netAPayer = (parseFloat(employee.salaireBrut) || 0) - totalDeductions;
  const montantVerse = parseFloat(employee.montantVerse) || 0;
  const soldeNonRegle = Math.max(0, netAPayer - montantVerse);

  const computedEtat = montantVerse >= netAPayer && netAPayer > 0
    ? 'paye'
    : montantVerse > 0 && montantVerse < netAPayer
    ? 'partiel'
    : employee.etat;

  const printRef = useRef(null);

  const addDeduction = (preset) => {
    if (deductions.find(d => d.key === preset.id)) return;
    setDeductions([...deductions, { key: preset.id, label: preset.label, amount: preset.defaultAmount }]);
  };

  const removeDeduction = (key) => setDeductions(deductions.filter(d => d.key !== key));

  const updateDeductionAmount = (key, val) =>
    setDeductions(deductions.map(d => d.key === key ? { ...d, amount: parseFloat(val) || 0 } : d));

  const handleExportPDF = () => {
    const element = printRef.current;
    if (!element) return;

    const win = window.open('', '_blank', 'width=900,height=650');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bulletin_Paie_${employee.nom.replace(/\s+/g, '_')}_${employee.periode}</title>
  <style>
    @page { size: 210mm 148mm; margin: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #fff; }
  </style>
</head>
<body>${element.outerHTML}<script>window.onload=()=>{window.print();}<\/script></body>
</html>`);
    win.document.close();
  };

  const availableToAdd = DEDUCTION_PRESETS.filter(p => !deductions.find(d => d.key === p.id));

  return (
    <div className="p-6 max-w-5xl mx-auto bg-slate-50 min-h-screen space-y-6">

      {/* Header bar */}
      <div className="flex justify-between items-center pb-5 border-b border-slate-200">
        <div className="flex items-center gap-4">
          {/* Icône */}
          <div className="flex items-center justify-center w-12 h-12 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #1a4fa0, #2563eb)' }}>
            <HardHat className="h-7 w-7 text-white" />
          </div>
          {/* Texte */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-[3px] uppercase text-slate-400">STE</span>
              <span className="w-1 h-1 rounded-full bg-blue-400 inline-block" />
              <span className="text-[11px] font-semibold tracking-[3px] uppercase text-slate-400">SARL AU</span>
            </div>
            <h1 className="text-[26px] font-black tracking-tight leading-none" style={{ color: '#1a4fa0', letterSpacing: '-0.5px' }}>
              ISSORKAS
            </h1>
            <p className="text-[12px] font-semibold tracking-[1.5px] uppercase mt-0.5" style={{ color: '#2563eb' }}>
              Gestion de Paie
            </p>
          </div>
        </div>
        <Button onClick={handleExportPDF} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
          <FileDown className="h-4 w-4" /> Exporter PDF A5
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Formulaire */}
        <div className="lg:w-[340px] shrink-0 p-4 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
            <Calculator className="h-5 w-5 text-blue-600" /> Données du Salarié
          </h2>

          <div className="space-y-3">
            <div>
              <Label>Nom & Prénom</Label>
              <Input value={employee.nom} onChange={e => setEmployee({ ...employee, nom: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Matricule</Label>
                <Input value={employee.matricule} onChange={e => setEmployee({ ...employee, matricule: e.target.value })} />
              </div>
              <div>
                <Label>Qualification</Label>
                <Input value={employee.qualification} onChange={e => setEmployee({ ...employee, qualification: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Période</Label>
                <Input value={employee.periode} onChange={e => setEmployee({ ...employee, periode: e.target.value })} />
              </div>
              <div>
                <Label>Date Paiement</Label>
                <Input type="date" value={employee.datePaiement} onChange={e => setEmployee({ ...employee, datePaiement: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Salaire Brut Base (DH)</Label>
              <Input type="number" value={employee.salaireBrut} onChange={e => setEmployee({ ...employee, salaireBrut: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Montant Versé (DH)</Label>
              <Input
                type="number"
                value={employee.montantVerse}
                onChange={e => setEmployee({ ...employee, montantVerse: parseFloat(e.target.value) || 0 })}
                className="border-violet-200 focus:ring-violet-300"
              />
              {soldeNonRegle > 0 && (
                <div className="mt-1 flex items-center justify-between text-xs font-semibold px-1">
                  <span className="text-slate-500">Solde Non Réglé :</span>
                  <span className="text-red-600">{soldeNonRegle.toFixed(2)} DH</span>
                </div>
              )}
              {soldeNonRegle === 0 && montantVerse > 0 && (
                <div className="mt-1 text-xs font-semibold text-green-600 px-1">Salaire entièrement réglé ✓</div>
              )}
            </div>

            {/* État du paiement */}
            <div>
              <Label>État du Paiement</Label>
              {montantVerse > 0 && (
                <div className="text-xs text-violet-600 font-medium mb-1 px-1">Auto-calculé selon montant versé</div>
              )}
              <div className="flex gap-1 mt-1 flex-wrap">
                {Object.entries(ETATS).map(([key, e]) => {
                  const active = computedEtat === key;
                  return (
                    <button
                      key={key}
                      onClick={() => montantVerse === 0 && setEmployee({ ...employee, etat: key })}
                      style={{
                        flex: 1, padding: '6px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                        border: `2px solid ${active ? e.color : '#e2e8f0'}`,
                        background: active ? e.bg : '#f8fafc',
                        color: active ? e.color : '#94a3b8',
                        cursor: montantVerse === 0 ? 'pointer' : 'default',
                        transition: 'all 0.15s', opacity: montantVerse > 0 && !active ? 0.4 : 1,
                      }}
                    >
                      <div style={{ fontSize: '14px' }}>{e.icon}</div>
                      <div>{e.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <hr />

          {/* Deductions manager */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Trash2 className="h-4 w-4 text-red-400" /> Retenues & Déductions
            </h3>
            <div className="space-y-2">
              {deductions.map(d => (
                <div key={d.key} className="flex items-center gap-2">
                  <div className="flex-1 text-xs text-slate-600 truncate">{d.label}</div>
                  <Input
                    type="number"
                    className="w-20 text-right text-xs h-7"
                    value={d.amount}
                    onChange={e => updateDeductionAmount(d.key, e.target.value)}
                  />
                  <button onClick={() => removeDeduction(d.key)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {availableToAdd.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1">Ajouter une retenue :</p>
                <div className="flex flex-wrap gap-1">
                  {availableToAdd.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addDeduction(p)}
                      className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100"
                    >
                      <Plus className="h-3 w-3" /> {p.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 space-y-1 border-t pt-2">
              <div className="flex justify-between text-sm font-bold text-slate-800">
                <span>Net à Payer</span>
                <span className="text-blue-700">{netAPayer.toFixed(2)} DH</span>
              </div>
              {soldeNonRegle > 0 && (
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-red-600">Solde Non Réglé</span>
                  <span className="text-red-600">{soldeNonRegle.toFixed(2)} DH</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Aperçu A5 */}
        <div className="flex-1 bg-slate-100 p-4 flex justify-center items-start overflow-auto">
          <div
            ref={printRef}
            style={{
              width: '210mm', height: '148mm',
              background: '#ffffff',
              boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column',
              fontFamily: "'Segoe UI', Arial, sans-serif",
              fontSize: '10px', color: '#1e293b',
              position: 'relative', overflow: 'hidden',
              padding: '5px 6px 0 6px',
            }}
          >
            {/* ===== EN-TÊTE BLEU STYLE LOGO ===== */}
            <div style={{ borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
              {/* Bande top avec nom société */}
              <div style={{ background: '#1a4fa0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 20px', borderBottom: '2px solid #2d65b8' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#ffffff', letterSpacing: '3px', textTransform: 'uppercase' }}>
                  STE ISSORKAS SARL AU
                </span>
              </div>
              {/* Logo row */}
              <div style={{ background: '#2158b4', display: 'flex', alignItems: 'stretch', height: '42px' }}>
                {/* Logo left */}
                <div style={{ background: '#1a4fa0', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', borderRight: '3px solid #3b72d0', minWidth: '165px' }}>
                  <div style={{ width: '4px', height: '26px', background: '#ffffff', borderRadius: '2px' }} />
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', letterSpacing: '2px' }}>
                    <span style={{ fontWeight: 300 }}>i</span>SSORKAS
                  </span>
                </div>
                {/* Activity */}
                <div style={{ background: '#2563eb', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#ffffff', fontWeight: 800 }}>Travaux de fonçage Et Exploitation minière</div>
                    <div style={{ fontSize: '9px', color: '#ffffff', fontWeight: 800 }}>Travaux divers ou construction...</div>
                  </div>
                </div>
                {/* Badge */}
                <div style={{ background: '#1a4fa0', display: 'flex', alignItems: 'center', padding: '0 14px', borderLeft: '3px solid #3b72d0' }}>
                  <div style={{ background: '#ffffff', borderRadius: '4px', padding: '4px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: '#1a4fa0', letterSpacing: '1px', textTransform: 'uppercase' }}>Bulletin</div>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: '#1a4fa0', letterSpacing: '1px', textTransform: 'uppercase' }}>de Paie</div>
                  </div>
                </div>
              </div>
              {/* Infos légales */}
              <div style={{ background: '#12387a', padding: '3px 16px', display: 'flex', gap: '14px', flexWrap: 'nowrap', alignItems: 'center' }}>
                {[
                  ['ICE', '003695935000057'],
                  ['IF', '47185275'],
                  ['RC', '13369'],
                  ['CB BMCE', '011550000000121000021464603'],
                ].map(([k, v]) => (
                  <span key={k} style={{ fontSize: '7.5px', color: '#ffffff', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {k}: {v}
                  </span>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '7.5px', color: '#ffffff', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  Chantier: TANCHERFI L.E.M : 323316
                </span>
              </div>
            </div>

            {/* ===== CORPS ===== */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8px 14px 8px 14px' }}>

              {/* Infos salarié */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '5px', marginBottom: '7px' }}>
                {[
                  { label: 'Salarié', value: employee.nom },
                  { label: 'Matricule', value: employee.matricule },
                  { label: 'Période', value: employee.periode },
                  { label: 'Qualification', value: employee.qualification },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '4px 6px' }}>
                    <div style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#1a4fa0', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                <thead>
                  <tr style={{ background: '#1a4fa0', color: 'white' }}>
                    {['Désignation', 'Base / Brut', 'Gains', 'Retenues'].map((h, i) => (
                      <th key={h} style={{ padding: '4px 8px', fontWeight: 700, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid #2563eb', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '3px 8px', fontWeight: 600 }}>Salaire Brut de Base</td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', fontWeight: 700 }}>{(parseFloat(employee.salaireBrut)||0).toFixed(2)}</td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                  </tr>
                  {deductions.map((d, i) => (
                    <tr key={d.key} style={{ background: i % 2 === 0 ? '#fafafa' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '3px 8px', color: '#475569' }}>{d.label}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>({(parseFloat(d.amount)||0).toFixed(2)})</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#eff6ff', borderTop: '2px solid #1a4fa0' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 800, color: '#1a4fa0' }}>
                      <span>NET À PAYER</span>
                      {(() => {
                        const e = ETATS[computedEtat];
                        return (
                          <span style={{ marginLeft: '10px', background: e.bg, color: e.color, border: `1px solid ${e.border}`, borderRadius: '10px', padding: '1px 8px', fontSize: '8px', fontWeight: 800, letterSpacing: '0.5px' }}>
                            {e.icon} {e.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800, color: '#16a34a', fontSize: '11px' }}>{netAPayer.toFixed(2)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                  </tr>
                  {montantVerse > 0 && (
                    <tr style={{ background: '#f5f3ff', borderBottom: '1px solid #ddd6fe' }}>
                      <td style={{ padding: '3px 8px', color: '#7c3aed', fontWeight: 700 }}>Montant Versé</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', color: '#7c3aed', fontWeight: 700 }}>{montantVerse.toFixed(2)}</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                    </tr>
                  )}
                  {soldeNonRegle > 0 && (
                    <tr style={{ background: '#fff1f2', borderTop: '2px solid #dc2626' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 800, color: '#dc2626' }}>SOLDE NON RÉGLÉ</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 800, color: '#dc2626', fontSize: '11px' }}>{soldeNonRegle.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '5px', padding: '7px 10px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                    <div style={{ background: '#1a4fa0', borderRadius: '4px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={14} color="white" />
                    </div>
                    <span style={{ fontWeight: 700, color: '#1a4fa0', fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signature & Cachet Employeur</span>
                  </div>
                  <div style={{ height: '20px', borderBottom: '1.5px dashed #94a3b8', marginBottom: '3px' }} />
                  <div style={{ color: '#94a3b8', fontSize: '7.5px', textAlign: 'right' }}>STE ISSORKAS SARL AU</div>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '5px', padding: '7px 10px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                    <div style={{ background: '#2563eb', borderRadius: '4px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PenLine size={14} color="white" />
                    </div>
                    <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signature de l'Employé</span>
                  </div>
                  <div style={{ height: '20px', borderBottom: '1.5px dashed #94a3b8', marginBottom: '3px' }} />
                  <div style={{ color: '#64748b', fontSize: '7.5px', textAlign: 'right' }}>Date : {employee.datePaiement}</div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ marginTop: '5px', paddingTop: '4px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '7px', color: '#94a3b8' }}>
                STE ISSORKAS SARL AU — ICE: 003695935000057 — IF: 47185275 — RC: 13369 — Chantier TANCHERFI L.E.M : 323316 &nbsp;|&nbsp; Conforme au Code du Travail Marocain &amp; régime ANAPEC 2026
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
