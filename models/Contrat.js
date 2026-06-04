import mongoose from 'mongoose';

const ContratSchema = new mongoose.Schema({
  employeeId:            { type: String, required: true },
  employeeNom:           { type: String, required: true },
  matricule:             { type: String, default: '' },
  typeContrat:           { type: String, required: true },  // CDI, CDD, ANAPEC Tahfiz, ANAPEC Stage, Autre
  dateDebut:             { type: String, required: true },
  dateFin:               { type: String, default: '' },     // CDD / ANAPEC / Autre
  dateSignature:         { type: String, default: '' },     // CDI uniquement
  dateApprobationAnapec: { type: String, default: '' },     // ANAPEC uniquement
  statut:                { type: String, default: 'actif' },// actif | termine | en_attente_signature | en_attente_anapec
  motifFin:              { type: String, default: '' },     // Promotion CDI, Fin CDD, Démission...
  note:                  { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Contrat || mongoose.model('Contrat', ContratSchema);
