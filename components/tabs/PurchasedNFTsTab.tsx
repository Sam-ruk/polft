"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAccount, useWriteContract } from "wagmi";
import { createPublicClient, http } from "viem";
import { ethers } from "ethers";
import { singleNFTABI } from "../../lib/contractABI";

interface PurchasedNFTsTabProps {
  fid: string;
}

interface NFT {
  ca: string;
  uri: string;
  name: string;
  image: string;
}

interface MintDetails {
  name: string;
  mintPrice: string;
  totalSupply: string;
  mintedCount: string;
  metadataURI: string;
  image: string;
  isSoldOut: boolean;
}

export const PurchasedNFTsTab = ({ fid }: PurchasedNFTsTabProps) => {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractAddress, setContractAddress] = useState("");
  const [mintError, setMintError] = useState<string | null>(null);
  const [isMintLoading, setIsMintLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mintDetails, setMintDetails] = useState<MintDetails | null>(null);

  // Fetch purchased NFTs
  const fetchNFTs = async () => {
    try {
      const userResponse = await fetch(`/api/users?fid=${fid}`);
      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const user = await userResponse.json();
      const bought = user.bought || [];
      const nftPromises = bought.map(async (ca: string) => {
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
    } catch (error: any) {
      console.error("Failed to fetch purchased NFTs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch NFT details for dialog
  const handleLoadMintDetails = async () => {
    if (!address) {
      setMintError("Please connect your wallet");
      return;
    }
    if (!ethers.isAddress(contractAddress)) {
      setMintError("Invalid contract address");
      return;
    }

    setIsMintLoading(true);
    setMintError(null);
    setMintDetails(null);

    try {
      const publicClient = createPublicClient({
        chain: {
          id: 10143,
          name: "Monad Testnet",
          rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
          nativeCurrency: { name: "MONAD", symbol: "MONAD", decimals: 18 },
          blockExplorers: { default: { name: "Monad Explorer", url: "https://explorer.testnet.monad.xyz" } },
        },
        transport: http("https://testnet-rpc.monad.xyz", { timeout: 30000 }),
      });

      const name = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: singleNFTABI,
        functionName: "name",
      }) as string;

      const mintPrice = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: singleNFTABI,
        functionName: "mintPrice",
      }) as bigint;

      const totalSupply = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: singleNFTABI,
        functionName: "totalSupply",
      }) as bigint;

      const mintedCount = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: singleNFTABI,
        functionName: "mintedCount",
      }) as bigint;

      const metadataURI = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: singleNFTABI,
        functionName: "metadataURI",
      }) as string;

      const metadataResponse = await fetch(metadataURI);
      if (!metadataResponse.ok) throw new Error("Failed to fetch metadata");
      const metadata = await metadataResponse.json();

      const isSoldOut = Number(mintedCount) >= Number(totalSupply);
      setMintDetails({
        name,
        mintPrice: ethers.formatEther(mintPrice),
        totalSupply: totalSupply.toString(),
        mintedCount: mintedCount.toString(),
        metadataURI,
        image: metadata.image,
        isSoldOut,
      });
      setIsDialogOpen(true);
    } catch (error: any) {
      setMintError(`Failed to load NFT details.`);
      console.error("Load details error:", error);
    } finally {
      setIsMintLoading(false);
    }
  };

  // Handle minting NFT from dialog
  const handleMintNFT = async () => {
    if (!address) {
      setMintError("Please connect your wallet");
      return;
    }
    if (!ethers.isAddress(contractAddress)) {
      setMintError("Invalid contract address");
      return;
    }

    setIsMintLoading(true);
    setMintError(null);

    try {
      const publicClient = createPublicClient({
        chain: {
          id: 10143,
          name: "Monad Testnet",
          rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
          nativeCurrency: { name: "MONAD", symbol: "MONAD", decimals: 18 },
          blockExplorers: { default: { name: "Monad Explorer", url: "https://explorer.testnet.monad.xyz" } },
        },
        transport: http("https://testnet-rpc.monad.xyz", { timeout: 30000 }),
      });

      const mintPrice = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: singleNFTABI,
        functionName: "mintPrice",
      }) as bigint;

      const txHash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: singleNFTABI,
        functionName: "mint",
        value: mintPrice,
      });
      console.log("Mint transaction sent:", txHash);

      let receipt = null;
      const maxRetries = 10;
      const retryDelay = 3000;
      for (let i = 0; i < maxRetries; i++) {
        try {
          receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          if (receipt) break;
          console.log(`Mint receipt not found, retrying (${i + 1}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } catch (err) {
          console.log(`Mint retry ${i + 1} failed:`, err);
        }
      }

      if (!receipt) {
        throw new Error(
          `Mint transaction receipt not found after ${maxRetries} retries. Check: https://explorer.testnet.monad.xyz/tx/${txHash}`,
        );
      }
      if (receipt.status === "reverted") {
        throw new Error("Mint transaction reverted");
      }

      // Update user's bought array
      const userResponse = await fetch(`/api/users?fid=${fid}`);
      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const updatedBought = [...(userData.bought || []), contractAddress];

      const updateUserResponse = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          mine: userData.mine || [],
          bought: updatedBought,
        }),
      });
      if (!updateUserResponse.ok) {
        const errorData = await updateUserResponse.json();
        throw new Error(`Failed to update user: ${errorData.error || "Unknown error"}`);
      }

      // Refresh NFTs
      await fetchNFTs();
      setIsDialogOpen(false);
      setContractAddress("");
      alert("NFT minted successfully!");
    } catch (error: any) {
      setMintError(`Failed to mint NFT: ${error.message || "Unknown error"}`);
      console.error("Mint error:", error);
    } finally {
      setIsMintLoading(false);
    }
  };

  // Close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setMintDetails(null);
    setMintError(null);
  };

  useEffect(() => {
    if (fid) fetchNFTs();
  }, [fid]);

  return (
    <div className="absolute inset-0 bg-[#d19ffc] px-4 py-8 pt-20 overflow-auto">
      <div className="w-full max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-2xl min-h-fit">
        <h1 className="text-4xl font-bold text-center text-black mb-6" style={{ fontFamily: "Pacifico" }}>
          Purchased NFTs
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 items-center mb-6">
          <input
            type="text"
            placeholder="Paste Contract Address"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg w-full sm:w-3/4 text-sm focus:outline-none focus:ring-2 focus:ring-[#800080]"
          />
          <button
            onClick={handleLoadMintDetails}
            disabled={isMintLoading || !address}
            className={`p-3 bg-[#FFD700] text-[#4B0082] font-bold rounded-lg border-2 border-[#800080] hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300 w-full sm:w-1/4 text-sm ${
              isMintLoading || !address ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isMintLoading ? "Loading..." : "Mint"}
          </button>
        </div>

        {mintError && <p className="mb-4 text-red-500 text-sm text-center">{mintError}</p>}

        {loading ? (
          <p className="text-center text-gray-600 text-lg">Loading...</p>
        ) : nfts.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">No purchased NFTs yet.</p>
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
                />
                <p className="mt-3 text-gray-800 font-semibold text-center">{nft.name}</p>
              </div>
            ))}
          </div>
        )}

        {isDialogOpen && mintDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[1000] animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-lg mx-4 p-6 shadow-2xl transform transition-all duration-300">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[#4B0082]">Mint NFT</h2>
                <button
                  onClick={handleCloseDialog}
                  className="text-[#4B0082] hover:text-[#800080] text-2xl font-bold focus:outline-none"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#4B0082]">{mintDetails.name}</h3>
                <p className="text-sm">Mint Price: {mintDetails.mintPrice} MON</p>
                <p className="text-sm mb-2">Supply: {mintDetails.mintedCount}/{mintDetails.totalSupply}</p>

                {mintDetails.image && (
                  <Image
                    src={mintDetails.image}
                    alt={mintDetails.name}
                    width={200}
                    height={200}
                    className="w-full h-auto object-cover rounded-lg border-2 border-[#800080] mt-2"
                  />
                )}

                {mintDetails.isSoldOut && (
                  <p className="text-red-500 font-bold mt-2">Sold Out</p>
                )}
              </div>

              {!mintDetails.isSoldOut && (
                <button
                  onClick={handleMintNFT}
                  disabled={isMintLoading || !address}
                  className={`w-full p-3 bg-[#FFD700] text-[#4B0082] font-bold rounded-lg border-2 border-[#800080] hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300 text-sm ${
                    isMintLoading || !address ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isMintLoading ? "Minting..." : "Mint NFT"}
                </button>
              )}

              {mintError && (
                <p className="text-red-500 text-sm mt-3 text-center">{mintError}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
