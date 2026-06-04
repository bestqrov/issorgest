import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Employee from '@/models/Employee';

export async function GET() {
  await connectDB();
  const employees = await Employee.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(employees.map(e => ({ ...e, id: e._id.toString() })));
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  const emp = await Employee.create(body);
  return NextResponse.json({ ...emp.toObject(), id: emp._id.toString() }, { status: 201 });
}
