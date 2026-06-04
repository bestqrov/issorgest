import mongoose from 'mongoose';

const RecetteSchema = new mongoose.Schema({
  source:         { type: String, required: true },
  libelle:        { type: String, required: true },
  montant:        { type: Number, required: true, default: 0 },
  date:           { type: String, required: true },
  chantier:       { type: String, default: '' },
  modePaiement:   { type: String, default: 'Virement', enum: ['Espèces', 'Virement', 'Chèque', 'Carte'] },
  statut:         { type: String, default: 'encaissé', enum: ['encaissé', 'en_attente', 'annulé'] },
  note:           { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Recette || mongoose.model('Recette', RecetteSchema);
