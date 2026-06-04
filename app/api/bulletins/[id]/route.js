import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Bulletin from '@/models/Bulletin';

export async function PATCH(req, { params }) {
  await connectDB();
  const body = await req.json();
  const bul = await Bulletin.findByIdAndUpdate(params.id, body, { new: true }).lean();
  if (!bul) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ ...bul, id: bul._id.toString() });
}

export async function DELETE(_, { params }) {
  await connectDB();
  await Bulletin.findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
}
