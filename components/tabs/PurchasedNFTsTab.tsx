"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAccount, useWriteContract, useSwitchChain, useChainId } from "wagmi";
import { createPublicClient, http, parseEther } from "viem";
import { ethers } from "ethers";
import { singleNFTABI } from "../../lib/contractABI";

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://monad-testnet.g.alchemy.com/v2/kgba2A2om3dyvvOWDkRbB74QvRbhr5uQ"] },
    public: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
};

const useNFTDetails = (contractAddress: string, enabled: boolean) => {
  const isValidAddress = ethers.isAddress(contractAddress);

  const { data: name, error: nameError } = useContractRead(
    isValidAddress && enabled
      ? {
          address: contractAddress as `0x${string}`,
          abi: singleNFTABI,
          functionName: "name",
          chainId: 10143,
        }
      : { address: undefined, abi: singleNFTABI, functionName: "name" }
  );

  const { data: mintPrice, error: mintPriceError } = useContractRead(
    isValidAddress && enabled
      ? {
          address: contractAddress as `0x${string}`,
          abi: singleNFTABI,
          functionName: "mintPrice",
          chainId: 10143,
        }
      : { address: undefined, abi: singleNFTABI, functionName: "mintPrice" }
  );

  const { data: totalSupply, error: totalSupplyError } = useContractRead(
    isValidAddress && enabled
      ? {
          address: contractAddress as `0x${string}`,
          abi: singleNFTABI,
          functionName: "totalSupply",
          chainId: 10143,
        }
      : { address: undefined, abi: singleNFTABI, functionName: "totalSupply" }
  );

  const { data: mintedCount, error: mintedCountError } = useContractRead(
    isValidAddress && enabled
      ? {
          address: contractAddress as `0x${string}`,
          abi: singleNFTABI,
          functionName: "mintedCount",
          chainId: 10143,
        }
      : { address: undefined, abi: singleNFTABI, functionName: "mintedCount" }
  );

  const { data: metadataURI, error: metadataURIError } = useContractRead(
    isValidAddress && enabled
      ? {
          address: contractAddress as `0x${string}`,
          abi: singleNFTABI,
          functionName: "metadataURI",
          chainId: 10143,
        }
      : { address: undefined, abi: singleNFTABI, functionName: "metadataURI" }
  );

  const [image, setImage] = useState<string | undefined>(undefined);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (metadataURI && enabled && isValidAddress) {
        try {
          const metadataResponse = await fetch(metadataURI as string);
          if (!metadataResponse.ok) throw new Error("Failed to fetch metadata");
          const metadata = await metadataResponse.json();
          setImage(metadata.image);
        } catch (error: any) {
          setFetchError("Failed to fetch metadata");
        }
      }
    };
    fetchMetadata();
  }, [metadataURI, enabled, isValidAddress]);

  const isSoldOut =
    mintedCount && totalSupply ? Number(mintedCount) >= Number(totalSupply) : false;

  return {
    name: name as string | undefined,
    mintPrice: mintPrice ? ethers.formatEther(mintPrice as bigint) : undefined,
    totalSupply: totalSupply?.toString(),
    mintedCount: mintedCount?.toString(),
    metadataURI: metadataURI as string | undefined,
    image,
    isSoldOut,
    error:
      nameError ||
      mintPriceError ||
      totalSupplyError ||
      mintedCountError ||
      metadataURIError ||
      fetchError,
    isLoading:
      enabled &&
      isValidAddress &&
      !name &&
      !mintPrice &&
      !totalSupply &&
      !mintedCount &&
      !metadataURI &&
      !fetchError,
  };
};

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
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractAddress, setContractAddress] = useState("");
  const [mintError, setMintError] = useState<string | null>(null);
  const [isMintLoading, setIsMintLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mintDetails, setMintDetails] = useState<MintDetails | null>(null);

  const targetChainId = 10143; // Monad Testnet

  // Fetch NFT details using the useNFTDetails hook
  const {
    name,
    mintPrice,
    totalSupply,
    mintedCount,
    metadataURI,
    image,
    isSoldOut,
    error: nftDetailsError,
    isLoading: nftDetailsLoading,
  } = useNFTDetails(contractAddress, isDialogOpen);

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

  // Update mintDetails when data is fetched
  useEffect(() => {
    if (name && mintPrice && totalSupply && mintedCount && metadataURI && !nftDetailsError) {
      setMintDetails({
        name,
        mintPrice,
        totalSupply,
        mintedCount,
        metadataURI,
        image: image || "",
        isSoldOut: isSoldOut || false,
      });
    } else if (nftDetailsError) {
      setMintError("Failed to load NFT details.");
    }
  }, [name, mintPrice, totalSupply, mintedCount, metadataURI, image, isSoldOut, nftDetailsError]);

  // Check network on mount and when chainId changes
  useEffect(() => {
    if (chainId !== targetChainId) {
      setMintError("Wrong network detected. Please switch to Monad Testnet.");
      if (switchChainAsync) {
        switchChainAsync({ chainId: targetChainId }).catch((err) => {
          setMintError("Failed to switch to Monad Testnet.");
          console.error("Network switch error:", err);
        });
      }
    } else {
      setMintError(null);
    }
  }, [chainId, switchChainAsync]);

  // Fetch NFTs on mount
  useEffect(() => {
    if (fid) fetchNFTs();
  }, [fid]);

  // Handle loading mint details
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
    setIsDialogOpen(true);
    setIsMintLoading(false);
  };

  // Handle minting NFT from dialog
  const handleMintNFT = async () => {
    console.log("Starting mint process...", { address, contractAddress, mintPrice, chainId });
    if (!address) {
      setMintError("Please connect your wallet");
      console.error("No wallet address");
      setIsMintLoading(false);
      return;
    }
    if (!ethers.isAddress(contractAddress)) {
      setMintError("Invalid contract address");
      console.error("Invalid contract address:", contractAddress);
      setIsMintLoading(false);
      return;
    }
    if (!mintPrice) {
      setMintError("Mint price not loaded. Please try again.");
      console.error("Mint price missing");
      setIsMintLoading(false);
      return;
    }
    if (!mintDetails) {
      setMintError("NFT details not loaded. Please try again.");
      console.error("mintDetails is null");
      setIsMintLoading(false);
      return;
    }
    if (mintDetails.isSoldOut) {
      setMintError("NFT is sold out");
      console.error("NFT is sold out");
      setIsMintLoading(false);
      return;
    }
    if (chainId !== targetChainId) {
      setMintError("Please switch to Monad Testnet (Chain ID: 10143)");
      console.log("Attempting to switch chain...");
      try {
        await switchChainAsync({ chainId: targetChainId });
        console.log("Switched to Monad Testnet using switchChainAsync");
      } catch (error: any) {
        if (typeof window !== "undefined" && window.ethereum) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [monadTestnet],
            });
            await switchChainAsync({ chainId: targetChainId });
            console.log("Added and switched to Monad Testnet");
          } catch (addChainError: any) {
            setMintError(`Failed to add/switch to Monad Testnet: ${addChainError.message || "Unknown error"}`);
            console.error("Add chain error:", addChainError);
            setIsMintLoading(false);
            return;
          }
        } else {
          setMintError("No wallet provider detected (e.g., MetaMask). Please install a wallet.");
          console.error("window.ethereum is undefined");
          setIsMintLoading(false);
          return;
        }
      }
    }

    setIsMintLoading(true);
    setMintError(null);

    try {
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http("https://monad-testnet.g.alchemy.com/v2/kgba2A2om3dyvvOWDkRbB74QvRbhr5uQ", { timeout: 30000 }),
      });

      // Check balance
      const balance = await publicClient.getBalance({ address });
      console.log("Wallet balance:", ethers.formatEther(balance), "Required:", mintPrice);
      if (Number(ethers.formatEther(balance)) < Number(mintPrice) + 0.01) {
        throw new Error("Insufficient funds for minting and gas");
      }

      // Simulate transaction
      try {
        const { encodeFunctionData } = await import("viem");
        const result = await publicClient.call({
          account: address,
          to: contractAddress as `0x${string}`,
          data: encodeFunctionData({
            abi: singleNFTABI,
            functionName: "mint",
          }),
          value: parseEther(mintPrice),
        });
        console.log("Simulated call result:", result);
      } catch (error) {
        console.error("Simulated call failed:", error);
        throw new Error("Contract call simulation failed");
      }

      // Send transaction
      console.log("Sending mint transaction...");
      const txHash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: singleNFTABI,
        functionName: "mint",
        value: parseEther(mintPrice),
        chainId: targetChainId,
      });
      console.log("Transaction hash:", txHash);

      // Poll for receipt
      let receipt = null;
      const maxRetries = 20;
      const retryDelay = 5000;
      for (let i = 0; i < maxRetries; i++) {
        try {
          console.log(`Polling for receipt, attempt ${i + 1}/${maxRetries}...`);
          receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          console.log("Receipt:", receipt);
          if (receipt) break;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } catch (err) {
          console.error(`Receipt retry ${i + 1} failed:`, err);
        }
      }

      if (!receipt) {
        throw new Error(
          `Transaction receipt not found after ${maxRetries} retries. Check: https://testnet.monadexplorer.com/tx/${txHash}`
        );
      }
      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted. Check contract conditions.");
      }

      // Update user's bought array
      console.log("Updating user data...");
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
        console.error("API update failed, but mint succeeded");
        setMintError("NFT minted, but failed to update user data");
      }

      console.log("Mint successful, refreshing NFTs...");
      await fetchNFTs();
      setIsDialogOpen(false);
      setContractAddress("");
      alert("NFT minted successfully!");
    } catch (error: any) {
      console.error("Mint error:", error);
      setMintError(`Failed to mint NFT: ${error.message || "Unknown error"}`);
    } finally {
      setIsMintLoading(false);
      console.log("Mint process complete");
    }
  };

  // Close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setMintDetails(null);
    setMintError(null);
    setContractAddress("");
  };

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
            disabled={isMintLoading || !address || nftDetailsLoading}
            className={`p-3 bg-[#FFD700] text-[#4B0082] font-bold rounded-lg border-2 border-[#800080] hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300 w-full sm:w-1/4 text-sm ${
              isMintLoading || !address || nftDetailsLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {nftDetailsLoading ? "Loading..." : "Load Details"}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000] animate-fadeIn">
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
