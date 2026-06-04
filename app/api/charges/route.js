import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Charge from '@/models/Charge';

export async function GET() {
  await connectDB();
  const data = await Charge.find().sort({ date: -1 }).lean();
  return NextResponse.json(data.map(c => ({ ...c, id: c._id.toString() })));
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  const doc = await Charge.create(body);
  return NextResponse.json({ ...doc.toObject(), id: doc._id.toString() }, { status: 201 });
}
