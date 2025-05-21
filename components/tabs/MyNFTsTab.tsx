"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface MyNFTsTabProps {
  fid: string;
}

interface NFT {
  ca: string;
  uri: string;
  name: string;
  image: string;
}

export const MyNFTsTab = ({ fid }: MyNFTsTabProps) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!fid) {
        setError("User not authenticated. Please sign in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const userResponse = await fetch(`/api/users?fid=${fid}`);
        if (!userResponse.ok) throw new Error("Failed to fetch user data");
        const userData = await userResponse.json();
        const mine = userData.mine || [];

        const nftPromises = mine.map(async (ca: string) => {
          const nftResponse = await fetch(`/api/nfts?ca=${ca}`);
          if (!nftResponse.ok) throw new Error(`Failed to fetch NFT for CA: ${ca}`);
          const nft = (await nftResponse.json())[0];
          const metadataResponse = await fetch(nft.uri);
          if (!metadataResponse.ok) throw new Error(`Failed to fetch metadata for URI: ${nft.uri}`);
          const metadata = await metadataResponse.json();
          return { ...nft, image: metadata.image };
        });

        const nftData = await Promise.all(nftPromises);
        setNfts(nftData);
      } catch (err: any) {
        setError(`Failed to load NFTs.`);
        console.error("NFT fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [fid]);

  return (
    <div className="absolute inset-0 bg-[#d19ffc] px-4 py-8 pt-20 overflow-auto">
      <div className="w-full max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-2xl min-h-fit">
        <h1 className="text-4xl font-bold text-center text-black mb-6" style={{ fontFamily: "Pacifico" }}>
          My NFTs
        </h1>

        {loading ? (
          <p className="text-center text-gray-600 text-lg">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-500 text-lg">{error}</p>
        ) : nfts.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">You have not minted any NFTs yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {nfts.map((nft) => (
              <div key={nft.ca} className="bg-gray-100 rounded-xl p-4 shadow-lg">
                <Image
                  src={nft.image || "/placeholder.png"}
                  alt={nft.name}
                  width={200}
                  height={200}
                  className="rounded-lg w-full object-cover"
                  onError={() => console.error("Failed to load image:", nft.image)}
                />
                <p className="mt-3 text-gray-800 font-semibold text-center">{nft.name}</p>
                <p className="text-sm text-gray-600 text-center break-all">CA: {nft.ca}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
