import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Bulletin from '@/models/Bulletin';

export async function GET() {
  await connectDB();
  const bulletins = await Bulletin.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(bulletins.map(b => ({ ...b, id: b._id.toString() })));
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  const bul = await Bulletin.create(body);
  return NextResponse.json({ ...bul.toObject(), id: bul._id.toString() }, { status: 201 });
}
