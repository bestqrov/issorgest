import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Recette from '@/models/Recette';

export async function GET() {
  await connectDB();
  const data = await Recette.find().sort({ date: -1 }).lean();
  return NextResponse.json(data.map(r => ({ ...r, id: r._id.toString() })));
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  const doc = await Recette.create(body);
  return NextResponse.json({ ...doc.toObject(), id: doc._id.toString() }, { status: 201 });
}
