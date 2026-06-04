import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Recette from '@/models/Recette';

export async function PUT(req, { params }) {
  await connectDB();
  const body = await req.json();
  const doc = await Recette.findByIdAndUpdate(params.id, body, { new: true }).lean();
  if (!doc) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ ...doc, id: doc._id.toString() });
}

export async function DELETE(_, { params }) {
  await connectDB();
  await Recette.findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
}
