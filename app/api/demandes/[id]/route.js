import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Demande from '@/models/Demande';

export async function PUT(req, { params }) {
  await connectDB();
  const body = await req.json();
  const demande = await Demande.findByIdAndUpdate(params.id, body, { new: true }).lean();
  if (!demande) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ ...demande, id: demande._id.toString() });
}

export async function DELETE(_, { params }) {
  await connectDB();
  await Demande.findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
}
