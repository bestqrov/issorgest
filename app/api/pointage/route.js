import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Pointage from '@/models/Pointage';

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const mois = searchParams.get('mois');
    const query = mois ? { mois } : {};
    const data = await Pointage.find(query).sort({ employeeNom: 1 }).lean();
    return NextResponse.json(data.map(p => ({ ...p, id: p._id.toString() })));
  } catch (err) {
    console.error('Pointage GET error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    // Strip tous les champs _id/_v pour éviter le duplicate key null
    const { _id, id, __v, employeeId, mois, ...rest } = body;

    if (!employeeId || !mois) {
      return NextResponse.json({ error: 'employeeId et mois requis' }, { status: 400 });
    }

    const empIdStr = String(employeeId);

    const doc = await Pointage.findOneAndUpdate(
      { employeeId: empIdStr, mois },
      { $set: { ...rest, employeeId: empIdStr, mois } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: false }
    );

    return NextResponse.json({ ...doc.toObject(), id: doc._id.toString() }, { status: 201 });
  } catch (err) {
    console.error('Pointage POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
