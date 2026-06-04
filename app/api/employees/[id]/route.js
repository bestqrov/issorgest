import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Employee from '@/models/Employee';

export async function PUT(req, { params }) {
  await connectDB();
  const body = await req.json();
  const emp = await Employee.findByIdAndUpdate(params.id, body, { new: true }).lean();
  if (!emp) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ ...emp, id: emp._id.toString() });
}

export async function DELETE(_, { params }) {
  await connectDB();
  await Employee.findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
}
