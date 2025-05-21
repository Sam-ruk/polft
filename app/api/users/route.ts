import { NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';

export async function GET(request: Request) {
  console.log('Received GET /api/users with params:', request.url);

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (!fid) {
      console.error('No fid provided in query');
      return NextResponse.json({ error: 'FID required' }, { status: 400 });
    }

    const user = await User.findOne({ fid: fid.toLowerCase() });
    console.log(`Queried user for fid: ${fid}`, user || 'Not found');
    return NextResponse.json(user || { fid: fid.toLowerCase(), mine: [], bought: [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/users.');
    // return NextResponse.json(
    //   { error: 'Internal Server Error', details: error.message },
    //   { status: 500 }
    // );
  }
}

export async function POST(request: Request) {
  console.log('Received POST /api/users');

  try {
    await connectDB();
    const { fid, mine = [], bought = [] } = await request.json();

    if (!fid) {
      console.error('Missing fid in request body');
      return NextResponse.json({ error: 'FID required' }, { status: 400 });
    }

    const user = await User.findOneAndUpdate(
      { fid: fid.toLowerCase() },
      { $set: { mine, bought } },
      { upsert: true, new: true }
    );
    console.log('Upserted user for fid:', fid, user);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/users.');
    // if (error.code === 11000) {
    //   return NextResponse.json({ error: 'User with this fid already exists' }, { status: 409 });
    // }
    // return NextResponse.json(
    //   { error: 'Internal Server Error', details: error.message },
    //   { status: 500 }
    // );
  }
}
