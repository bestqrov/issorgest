import mongoose from 'mongoose';

const DeductionSchema = new mongoose.Schema({
  key:    { type: String, required: true },
  label:  { type: String, required: true },
  amount: { type: Number, default: 0 },
}, { _id: false });

const EmployeeSchema = new mongoose.Schema({
  nom:              { type: String, required: true },
  matricule:        { type: String, default: '' },
  cin:              { type: String, default: '' },
  telephone:        { type: String, default: '' },
  qualification:    { type: String, default: 'Ouvrier' },
  salaireBrut:      { type: Number, default: 0 },
  typeContrat:      { type: String, default: 'ANAPEC' },
  dateEmbauche:     { type: String, default: '' },
  dateFinContrat:   { type: String, default: '' },
  actif:            { type: Boolean, default: true },
  deductionsDefaut: { type: [DeductionSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
