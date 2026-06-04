import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Contrat from '@/models/Contrat';

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const query = employeeId ? { employeeId } : {};
  const contrats = await Contrat.find(query).sort({ dateDebut: -1 }).lean();
  return NextResponse.json(contrats.map(c => ({ ...c, id: c._id.toString() })));
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  const contrat = await Contrat.create(body);
  return NextResponse.json({ ...contrat.toObject(), id: contrat._id.toString() }, { status: 201 });
}
