import mongoose from 'mongoose';

const DeductionSchema = new mongoose.Schema({
  key:    { type: String },
  label:  { type: String },
  amount: { type: Number, default: 0 },
}, { _id: false });

const BulletinSchema = new mongoose.Schema({
  employeeId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeNom:   { type: String, required: true },
  matricule:     { type: String, default: '' },
  qualification: { type: String, default: '' },
  salaireBrut:   { type: Number, default: 0 },
  deductions:    { type: [DeductionSchema], default: [] },
  netAPayer:     { type: Number, default: 0 },
  periode:       { type: String, default: '' },
  datePaiement:  { type: String, default: '' },
  etat:          { type: String, enum: ['paye', 'non_paye', 'en_attente'], default: 'en_attente' },
}, { timestamps: true });

export default mongoose.models.Bulletin || mongoose.model('Bulletin', BulletinSchema);
