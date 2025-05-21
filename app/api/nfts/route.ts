import { NextResponse } from 'next/server';
import { connectDB, NFT } from '@/lib/db';

export async function GET(request: Request) {
  console.log('Received GET /api/nfts with params:', request.url);

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const ca = searchParams.get('ca');

    const nfts = ca ? await NFT.find({ ca }) : await NFT.find();
    console.log(`Found ${nfts.length} NFTs for ca: ${ca || 'all'}`);
    return NextResponse.json(nfts, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/nfts.');
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('Received POST /api/nfts');

  try {
    await connectDB();
    const { ca, uri, name } = await request.json();

    if (!ca || !uri || !name) {
      console.error('Missing required fields:', { ca, uri, name });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const nft = new NFT({ ca, uri, name });
    await nft.save();
    console.log('Created NFT:', nft);
    return NextResponse.json(nft, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/nfts.');
    if (error.code === 11000) {
      return NextResponse.json({ error: 'NFT with this ca already exists' }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
