import mongoose from 'mongoose';

const DemandeSchema = new mongoose.Schema({
  reference:        { type: String, default: '' },   // DEM-YYYYMM-NNN (auto-généré)
  titre:            { type: String, required: true },
  type:             { type: String, default: 'Autre' },
  employeeId:       { type: String, default: '' },
  employeeNom:      { type: String, default: '' },
  expediteur:       { type: String, default: '' },   // Nom si expéditeur externe
  dateDemande:      { type: String, required: true },
  description:      { type: String, default: '' },
  priorite:         { type: String, default: 'normale' }, // normale | urgente | faible
  statut:           { type: String, default: 'recue' },   // recue | en_cours | traitee | refusee
  referenceReponse: { type: String, default: '' },   // REP-YYYYMM-NNN (auto-généré à la réponse)
  reponse:          { type: String, default: '' },
  dateReponse:      { type: String, default: '' },
  traitePar:        { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Demande || mongoose.model('Demande', DemandeSchema);
