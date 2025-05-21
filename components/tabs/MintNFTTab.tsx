"use client";

import { useState, useCallback, useEffect } from "react";
import { CanvasDrawing } from "../CanvasDrawing";
import { tokenCreatorABI, factoryAddress, singleNFTABI } from "../../lib/contractABI";
import { useConnect, useReadContract, useWriteContract, useAccount } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { parseEther } from "viem";
import { createPublicClient, http } from "viem";
import { ethers } from "ethers";

interface MintNFTTabProps {
  fid: string;
  address: string | undefined;
  addFrame?: () => void;
  composeCast?: (cast: { text: string; embeds: string[] }) => void;
}

export const MintNFTTab = ({ fid, address, addFrame, composeCast }: MintNFTTabProps) => {
  const { connect } = useConnect();
  const [canvasImage, setCanvasImage] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState(300);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [price, setPrice] = useState("");
  const [totalSupply, setTotalSupply] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMintDialogOpen, setIsMintDialogOpen] = useState(false);
  const [nftDetails, setNftDetails] = useState<{
    name: string;
    symbol: string;
    price: string;
    totalSupply: string;
    contractAddress: string;
    transactionHash: string;
    image: string | null;
    metadataUrl: string;
  } | null>(null);
  const [mintContractAddress, setMintContractAddress] = useState<string>("");
  const [mintDetails, setMintDetails] = useState<{
    name: string;
    mintPrice: string;
    totalSupply: string;
    mintedCount: string;
    metadataURI: string;
    image: string;
    isSoldOut: boolean;
  } | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [isMintLoading, setIsMintLoading] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [supplyError, setSupplyError] = useState("");

  // Read tokenCount
  const { data: tokenCount, error: tokenCountError } = useReadContract({
    address: factoryAddress,
    abi: tokenCreatorABI,
    functionName: "tokenCount",
  });

  // Define contract reads for mint details at the top level
  const { data: nameData, error: nameError } = useReadContract({
    address: mintContractAddress as `0x${string}`,
    abi: singleNFTABI,
    functionName: "name",
    query: { enabled: !!mintContractAddress && ethers.isAddress(mintContractAddress) },
  });

  const { data: mintPriceData, error: mintPriceError } = useReadContract({
    address: mintContractAddress as `0x${string}`,
    abi: singleNFTABI,
    functionName: "mintPrice",
    query: { enabled: !!mintContractAddress && ethers.isAddress(mintContractAddress) },
  });

  const { data: totalSupplyData, error: totalSupplyError } = useReadContract({
    address: mintContractAddress as `0x${string}`,
    abi: singleNFTABI,
    functionName: "totalSupply",
    query: { enabled: !!mintContractAddress && ethers.isAddress(mintContractAddress) },
  });

  const { data: mintedCountData, error: mintedCountError } = useReadContract({
    address: mintContractAddress as `0x${string}`,
    abi: singleNFTABI,
    functionName: "mintedCount",
    query: { enabled: !!mintContractAddress && ethers.isAddress(mintContractAddress) },
  });

  const { data: metadataURIData, error: metadataURIError } = useReadContract({
    address: mintContractAddress as `0x${string}`,
    abi: singleNFTABI,
    functionName: "metadataURI",
    query: { enabled: !!mintContractAddress && ethers.isAddress(mintContractAddress) },
  });

  // Write createToken
  const { writeContractAsync } = useWriteContract();

  // Check URL for CA to open mint dialog
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ca = params.get("ca");
    if (ca && ethers.isAddress(ca)) {
      setMintContractAddress(ca);
      setIsMintDialogOpen(true);
    }
  }, []);

  const handleConnectWallet = () => {
    try {
      connect({ connector: farcasterFrame() });
    } catch (err: any) {
      setError(`Failed to connect wallet.`);
    }
  };

  const handleLoadMintDetails = async () => {
    if (!address) {
      setMintError("Please connect wallet first");
      return;
    }
    if (!ethers.isAddress(mintContractAddress)) {
      setMintError("Invalid contract address");
      return;
    }

    setIsMintLoading(true);
    setMintError(null);
    setMintDetails(null);

    try {
      // Check for errors from contract reads
      if (nameError || mintPriceError || totalSupplyError || mintedCountError || metadataURIError) {
        throw new Error("Failed to fetch contract data");
      }

      // Ensure all data is available
      if (!nameData || !mintPriceData || !totalSupplyData || !mintedCountData || !metadataURIData) {
        throw new Error("Incomplete contract data");
      }

      // Fetch metadata
      const metadataResponse = await fetch(metadataURIData as string);
      if (!metadataResponse.ok) throw new Error("Failed to fetch metadata");
      const metadata = await metadataResponse.json();

      const isSoldOut = Number(mintedCountData) >= Number(totalSupplyData);
      setMintDetails({
        name: nameData as string,
        mintPrice: ethers.formatEther(mintPriceData as bigint),
        totalSupply: totalSupplyData.toString(),
        mintedCount: mintedCountData.toString(),
        metadataURI: metadataURIData as string,
        image: metadata.image,
        isSoldOut,
      });
    } catch (error: any) {
      setMintError(`Failed to load NFT details.`);
      console.error("Load details error:", error);
    } finally {
      setIsMintLoading(false);
    }
  };

  const handleMintNFTFromDialog = async () => {
    if (!address) {
      setMintError("Please connect wallet first");
      return;
    }
    if (!ethers.isAddress(mintContractAddress)) {
      setMintError("Invalid contract address");
      return;
    }

    setIsMintLoading(true);
    setMintError(null);

    try {
      if (mintPriceError || !mintPriceData) {
        throw new Error("Failed to fetch mint price");
      }

      const txHash = await writeContractAsync({
        address: mintContractAddress as `0x${string}`,
        abi: singleNFTABI,
        functionName: "mint",
        value: mintPriceData as bigint,
      });

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
        throw new Error("Mint transaction reverted.");
      }

      setMintDetails((prev) =>
        prev
          ? {
              ...prev,
              mintedCount: (parseInt(prev.mintedCount) + 1).toString(),
              isSoldOut: parseInt(prev.mintedCount) + 1 >= parseInt(prev.totalSupply),
            }
          : null,
      );
      alert("NFT minted successfully!");
    } catch (error: any) {
      setMintError(`Failed to mint NFT.`);
      console.error("Mint NFT error:", error);
    } finally {
      setIsMintLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-4 p-4 sm:p-6 w-full max-w-2xl mx-auto">
      {!address && (
        <div className="text-center mb-4">
          <p className="text-red-500 text-sm">Please connect your Farcaster custody wallet to mint NFTs.</p>
          <button
            onClick={handleConnectWallet}
            className="mt-2 px-4 py-2 bg-[#FFD700] text-[#4B0082] font-bold rounded-[15px] border-[2px] border-[#800080] hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300 text-sm"
          >
            Connect Wallet
          </button>
        </div>
      )}
      <CanvasDrawing setCanvasImage={setCanvasImage} setCanvasSize={setCanvasSize} />
      <div className="flex flex-col gap-3 w-full items-center">
        <input
          type="text"
          placeholder="NFT Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-1.5 border rounded text-xs sm:text-sm w-[50vw] min-w-[80px]"
        />
        <input
          type="text"
          placeholder="NFT Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="p-1.5 border rounded text-xs sm:text-sm w-[50vw] min-w-[80px]"
        />
        <input
  type="text"
  placeholder="Price (MONAD)"
  value={price}
  onChange={(e) => {
    const val = e.target.value;
    if (/^\d*\.?\d*$/.test(val)) {
      setPrice(val);
      if (val === "" || parseFloat(val) === 0) {
        setPriceError("Price must be greater than 0");
      } else {
        setPriceError("");
      }
    } else {
      setPriceError("Only numeric values allowed");
    }
  }}
  className="p-1.5 border rounded text-xs sm:text-sm w-[50vw] min-w-[80px]"
/>
{priceError && (
  <p className="text-red-500 text-xs mt-1">{priceError}</p>
)}

<input
  type="text"
  placeholder="Total Supply"
  value={totalSupply}
  onChange={(e) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      const num = Number(val);
      setTotalSupply(val);
      if (val === "" || num < 2) {
        setSupplyError("Supply must be an integer ≥ 2");
      } else {
        setSupplyError("");
      }
    } else {
      setSupplyError("Only whole numbers allowed");
    }
  }}
  className="p-1.5 border rounded text-xs sm:text-sm w-[50vw] min-w-[80px]"
/>
{supplyError && (
  <p className="text-red-500 text-xs mt-1">{supplyError}</p>
)}

        <button
  onClick={handleMintNFT}
  disabled={
    isLoading ||
    !address ||
    !!priceError ||
    !!supplyError ||
    !price ||
    !totalSupply
  }
  className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-[#FFD700] text-[#4B0082] font-bold rounded-[15px] border-[2px] sm:border-[3px] border-[#800080] hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300 w-[50vw] min-w-[80px] text-xs sm:text-sm ${
    isLoading || !address || !!priceError || !!supplyError || !price || !totalSupply
      ? "opacity-50 cursor-not-allowed"
      : ""
  }`}
>
  {isLoading ? "Creating..." : "Create NFT"}
</button>

        {error && <p className="text-red-500 text-xs w-[50vw] min-w-[80px] text-center">{error}</p>}
      </div>
      {isDialogOpen && nftDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000] animate-fadeIn">
          <div
            className="bg-white rounded-2xl w-full mx-4 sm:mx-auto shadow-2xl transform transition-all duration-300 scale-100"
            style={{ maxWidth: `${canvasSize}px` }}
          >
            <div className="bg-gradient-to-r from-[#FFD700] to-[#FFEC8B] p-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold text-[#4B0082]">NFT Minted Successfully!</h2>
              <button
                onClick={handleCloseDialog}
                className="text-[#4B0082] hover:text-[#800080] text-2xl font-bold focus:outline-none transition-colors duration-200"
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {nftDetails.image ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={nftDetails.image}
                      alt="Minted NFT"
                      className="w-full h-auto object-cover rounded-lg border-2 border-[#800080]"
                      style={{ maxWidth: `${canvasSize * 0.4}px`, maxHeight: `${canvasSize * 0.4}px` }}
                      onError={() => console.error("Failed to load image:", nftDetails.image)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 text-sm sm:text-base">
                    <p>
                      <span className="font-semibold text-[#4B0082]">Name:</span> {nftDetails.name}
                    </p>
                    <p>
                      <span className="font-semibold text-[#4B0082]">Symbol:</span> {nftDetails.symbol}
                    </p>
                    <p>
                      <span className="font-semibold text-[#4B0082]">Price:</span> {nftDetails.price} MONAD
                    </p>
                    <p>
                      <span className="font-semibold text-[#4B0082]">Total Supply:</span> {nftDetails.totalSupply}
                    </p>
                    <p className="break-all">
                      <span className="font-semibold text-[#4B0082]">Contract Address:</span>{" "}
                      {nftDetails.contractAddress}
                    </p>
                    <p className="break-all">
                      <span className="font-semibold text-[#4B0082]">Transaction Hash:</span>{" "}
                      {nftDetails.transactionHash}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-red-500 text-sm">Image not available</p>
              )}
              <div className="flex flex-col gap-2 mt-4">
                {composeCast && (
                  <button
                    onClick={handleComposeCast}
                    className="px-4 py-2 bg-[#FFD700] text-[#4B0082] font-bold rounded-[15px] border-[2px] border-[#800080] hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300 w-full text-sm"
                  >
                    Share Cast
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {isMintDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000] animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 sm:mx-auto shadow-2xl transform transition-all duration-300 scale-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#4B0082]">Mint NFT</h2>
              <button
                onClick={handleCloseMintDialog}
                className="text-[#4B0082] hover:text-[#800080] text-2xl font-bold focus:outline-none"
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              placeholder="Contract Address"
              value={mintContractAddress}
              onChange={(e) => setMintContractAddress(e.target.value)}
              className="w-full p-3 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800080] text-sm"
            />
            <button
              onClick={handleLoadMintDetails}
              disabled={isMintLoading || !address}
              className={`w-full p-3 mb-3 bg-[#FFD700] text-[#4B0082] font-bold rounded-lg border-[2px] border-[#800080] hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300 text-sm ${
                isMintLoading || !address ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isMintLoading ? "Loading..." : "Load Details"}
            </button>
            {mintDetails && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#4B0082]">{mintDetails.name}</h3>
                <p>Mint Price: {mintDetails.mintPrice} MONAD</p>
                <p>Supply: {mintDetails.mintedCount}/{mintDetails.totalSupply}</p>
                {mintDetails.image && (
                  <img
                    src={mintDetails.image}
                    alt={mintDetails.name}
                    className="w-full h-auto object-cover rounded-lg border-2 border-[#800080] mt-2"
                    style={{ maxWidth: "200px" }}
                  />
                )}
                {mintDetails.isSoldOut && <p className="text-red-500 mt-2">Sold Out</p>}
              </div>
            )}
            {!mintDetails?.isSoldOut && mintDetails && (
              <button
                onClick={handleMintNFTFromDialog}
                disabled={isMintLoading || !address}
                className={`w-full p-3 bg-[#FFD700] text-[#4B0082] font-bold rounded-lg border-[2px] border-[#800080] hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300 text-sm ${
                  isMintLoading || !address ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isMintLoading ? "Minting..." : "Mint NFT"}
              </button>
            )}
            {mintError && <p className="text-red-500 text-xs mt-3">{mintError}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
