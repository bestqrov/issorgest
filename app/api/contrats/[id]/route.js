import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Contrat from '@/models/Contrat';

export async function PUT(req, { params }) {
  await connectDB();
  const body = await req.json();
  const contrat = await Contrat.findByIdAndUpdate(params.id, body, { new: true }).lean();
  if (!contrat) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ ...contrat, id: contrat._id.toString() });
}

export async function DELETE(_, { params }) {
  await connectDB();
  await Contrat.findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
}
