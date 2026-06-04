import mongoose from 'mongoose';

const PointageSchema = new mongoose.Schema({
  employeeId:    { type: String, required: true },
  employeeNom:   { type: String, required: true },
  matricule:     { type: String, default: '' },
  qualification: { type: String, default: '' },
  mois:          { type: String, required: true },
  salaireBrut:   { type: Number, default: 0 },
  jours:         { type: Object, default: {} },
  observation:   { type: String, default: '' },
}, { timestamps: true });

PointageSchema.index({ employeeId: 1, mois: 1 }, { unique: true, sparse: true });

export default mongoose.models.Pointage || mongoose.model('Pointage', PointageSchema);
