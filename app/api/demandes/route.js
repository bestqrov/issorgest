import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Demande from '@/models/Demande';

export async function GET() {
  await connectDB();
  const demandes = await Demande.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(demandes.map(d => ({ ...d, id: d._id.toString() })));
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();

  // Auto-generate reference: DEM-YYYYMM-NNN
  if (!body.reference) {
    const now   = new Date();
    const ym    = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await Demande.countDocuments();
    body.reference = `DEM-${ym}-${String(count + 1).padStart(3, '0')}`;
  }

  const demande = await Demande.create(body);
  return NextResponse.json({ ...demande.toObject(), id: demande._id.toString() }, { status: 201 });
}
