import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Charge from '@/models/Charge';

export async function PUT(req, { params }) {
  await connectDB();
  const body = await req.json();
  const doc = await Charge.findByIdAndUpdate(params.id, body, { new: true }).lean();
  if (!doc) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ ...doc, id: doc._id.toString() });
}

export async function DELETE(_, { params }) {
  await connectDB();
  await Charge.findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
}
