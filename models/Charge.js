import mongoose from 'mongoose';

const ChargeSchema = new mongoose.Schema({
  categorie:      { type: String, required: true },
  libelle:        { type: String, required: true },
  montant:        { type: Number, required: true, default: 0 },
  date:           { type: String, required: true },
  chantier:       { type: String, default: '' },
  modePaiement:   { type: String, default: 'Espèces', enum: ['Espèces', 'Virement', 'Chèque', 'Carte'] },
  statut:         { type: String, default: 'payé', enum: ['payé', 'impayé', 'en_attente'] },
  note:           { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Charge || mongoose.model('Charge', ChargeSchema);
