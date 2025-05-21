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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Error in GET /api/nfts:', errorMessage, errorStack);
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Error in POST /api/nfts:', errorMessage, errorStack);

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as any).code === 11000
    ) {
      return NextResponse.json({ error: 'NFT with this ca already exists' }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}
