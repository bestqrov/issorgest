import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Pointage from '@/models/Pointage';

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const body = await req.json();
    // Strip _id pour éviter les conflits
    const { _id, id, __v, ...updateData } = body;
    const doc = await Pointage.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true, runValidators: false }
    ).lean();
    if (!doc) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json({ ...doc, id: doc._id.toString() });
  } catch (err) {
    console.error('Pointage PUT error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_, { params }) {
  try {
    await connectDB();
    await Pointage.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
