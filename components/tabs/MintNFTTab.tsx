"use client";

import { useState, useCallback, useEffect } from "react";
import { CanvasDrawing } from "../CanvasDrawing";
import { tokenCreatorABI, factoryAddress, singleNFTABI } from "../../lib/contractABI";
import { useConnect, useReadContract, useWriteContract, useAccount, useChainId, useSwitchChain } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { parseEther } from "viem";
import { createPublicClient, http } from "viem";
import { ethers } from "ethers";

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

// Fetch NFT details
const useNFTDetails = (contractAddress: string, enabled: boolean) => {
  const isValidAddress = ethers.isAddress(contractAddress);

  const { data: name, error: nameError } = useReadContract({
    address: isValidAddress ? (contractAddress as `0x${string}`) : undefined,
    abi: singleNFTABI,
    functionName: "name",
    query: { enabled: enabled && isValidAddress },
  });

  const { data: mintPrice, error: mintPriceError } = useReadContract({
    address: isValidAddress ? (contractAddress as `0x${string}`) : undefined,
    abi: singleNFTABI,
    functionName: "mintPrice",
    query: { enabled: enabled && isValidAddress },
  });

  const { data: totalSupply, error: totalSupplyError } = useReadContract({
    address: isValidAddress ? (contractAddress as `0x${string}`) : undefined,
    abi: singleNFTABI,
    functionName: "totalSupply",
    query: { enabled: enabled && isValidAddress },
  });

  const { data: mintedCount, error: mintedCountError } = useReadContract({
    address: isValidAddress ? (contractAddress as `0x${string}`) : undefined,
    abi: singleNFTABI,
    functionName: "mintedCount",
    query: { enabled: enabled && isValidAddress },
  });

  const { data: metadataURI, error: metadataURIError } = useReadContract({
    address: isValidAddress ? (contractAddress as `0x${string}`) : undefined,
    abi: singleNFTABI,
    functionName: "metadataURI",
    query: { enabled: enabled && isValidAddress },
  });

  const [image, setImage] = useState<string | undefined>(undefined);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (metadataURI) {
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
  }, [metadataURI]);

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

interface MintNFTTabProps {
  fid: string;
  address: string | undefined;
  addFrame?: () => void;
  composeCast?: (cast: { text: string; embeds: string[] }) => void;
}

export const MintNFTTab = ({ fid, address, addFrame, composeCast }: MintNFTTabProps) => {
  const { connect } = useConnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
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
  const [mintError, setMintError] = useState<string | null>(null);
  const [isMintLoading, setIsMintLoading] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [supplyError, setSupplyError] = useState("");

  // Fetch NFT details using custom hook
  const {
    name: mintName,
    mintPrice,
    totalSupply: mintTotalSupply,
    mintedCount,
    metadataURI,
    image: mintImage,
    isSoldOut,
    error: nftDetailsError,
    isLoading: nftDetailsLoading,
  } = useNFTDetails(mintContractAddress, isMintDialogOpen);

  // Read tokenCount
  const { data: tokenCount, error: tokenCountError } = useReadContract({
    address: factoryAddress,
    abi: tokenCreatorABI,
    functionName: "tokenCount",
    chainId: 10143,
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

  // Update mintDetails when data is fetched
  useEffect(() => {
    if (mintName && mintPrice && mintTotalSupply && mintedCount && metadataURI && !nftDetailsError) {
      setMintDetails({
        name: mintName,
        mintPrice,
        totalSupply: mintTotalSupply,
        mintedCount,
        metadataURI,
        image: mintImage || "",
        isSoldOut: isSoldOut || false,
      });
    } else if (nftDetailsError) {
      setMintError("Failed to load NFT details.");
    }
  }, [mintName, mintPrice, mintTotalSupply, mintedCount, metadataURI, mintImage, isSoldOut, nftDetailsError]);

  useEffect(() => {
    if (chainId !== 10143) {
      setError("Wrong network detected. Please switch to Monad Testnet.");
      if (switchChain) {
        switchChain({ chainId: 10143 });
      }
    } else {
      setError(null);
    }
  }, [chainId, switchChain]);

  const [mintDetails, setMintDetails] = useState<{
    name: string;
    mintPrice: string;
    totalSupply: string;
    mintedCount: string;
    metadataURI: string;
    image: string;
    isSoldOut: boolean;
  } | null>(null);

  const handleConnectWallet = async () => {
    try {
      if (switchChain) {
        await switchChain({ chainId: 10143 });
      }
      connect({ connector: farcasterFrame() });
    } catch (err: any) {
      setError("Failed to connect wallet or switch to Monad Testnet.");
      console.error(err);
    }
  };

  const handleLoadMintDetails = useCallback(() => {
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
    setIsMintLoading(false);
  }, [address, mintContractAddress]);

  const handleMintNFTFromDialog = async () => {
    if (!address) {
      setMintError("Please connect wallet first");
      return;
    }
    if (!ethers.isAddress(mintContractAddress)) {
      setMintError("Invalid contract address");
      return;
    }
    if (!mintPrice) {
      setMintError("Mint price not loaded. Please try again.");
      return;
    }

    setIsMintLoading(true);
    setMintError(null);

    try {
      if (switchChain) {
        await switchChain({ chainId: 10143 });
      }

      const priceInWei = parseEther(mintPrice);

      const txHash = await writeContractAsync({
        address: mintContractAddress as `0x${string}`,
        abi: singleNFTABI,
        functionName: "mint",
        value: priceInWei,
        chainId: 10143,
      });

      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http("https://monad-testnet.g.alchemy.com/v2/kgba2A2om3dyvvOWDkRbB74QvRbhr5uQ", { timeout: 30000 }),
      });

      let receipt = null;
      const maxRetries = 10;
      const retryDelay = 3000;
      for (let i = 0; i < maxRetries; i++) {
        try {
          receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          if (receipt) break;
          console.log(`Mint receipt not found, retrying (${i + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } catch (err) {
          console.log(`Retry ${i + 1:`, err);
        }
      }

      if (!receipt) {
        throw new Error(
          `Mint transaction receipt not found after ${maxRetries} retries. Check: https://testnet.monadexplorer.com/tx/${txHash}`
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
          : null
      );
      alert("NFT minted successfully!");
    } catch (error: any) {
      if (error.name === "ConnectorChainMismatchError") {
        setMintError("Wallet is on the wrong network. Please switch to Monad Testnet.");
      } else {
        setMintError("Failed to mint NFT: " + error.message);
      }
      console.error("Mint NFT error:", error);
    } finally {
      setIsMintLoading(false);
    }
  };

  const handleMintNFT = async () => {
    if (isLoading) return;
    if (!fid) {
      setError("User not authenticated. Please sign in with Farcaster.");
      return;
    }
    if (!address) {
      setError("Please connect your Farcaster custody wallet.");
      return;
    }
    if (!canvasImage) {
      setError("Please draw an image to mint.");
      return;
    }
    if (!name || !symbol || !price || !totalSupply) {
      setError("Please enter name, symbol, price, and total supply for your NFT.");
      return;
    }

    if (!price || isNaN(Number(price)) || parseFloat(price) <= 0) {
      setError("Invalid price");
      return;
    }
    if (!totalSupply || isNaN(Number(totalSupply)) || parseInt(totalSupply) < 2) {
      setError("Invalid total supply");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (switchChain) {
        await switchChain({ chainId: 10143 });
      }

      const priceInWei = parseEther(price);
      const totalSupplyNum = parseInt(totalSupply);
      if (isNaN(totalSupplyNum) || totalSupplyNum <= 0) {
        throw new Error("Total supply must be a positive number.");
      }
      if (name.trim() === "" || symbol.trim() === "") {
        throw new Error("Name and symbol cannot be empty.");
      }
      if (name.length > 32 || symbol.length > 32) {
        throw new Error("Name and symbol must be 32 characters or less.");
      }
      if (priceInWei <= 0) {
        throw new Error("Mint price must be greater than 0.");
      }

      console.log("Inputs:", {
        name,
        symbol,
        price,
        priceInWei: priceInWei.toString(),
        totalSupply,
        totalSupplyNum,
      });

      // Upload image to Pinata
      const formData = new FormData();
      const blob = await (await fetch(canvasImage)).blob();
      formData.append("file", blob, "nft.png");

      const pinataResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
        },
        body: formData,
      });
      if (!pinataResponse.ok) throw new Error("Failed to upload image to Pinata.");
      const pinataData = await pinataResponse.json();
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${pinataData.IpfsHash}`;
      console.log("Image URL:", imageUrl);

      // Upload metadata to Pinata
      const metadata = { name, image: imageUrl, price };
      const metadataResponse = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      });
      if (!metadataResponse.ok) throw new Error("Failed to upload metadata to Pinata.");
      const metadataData = await metadataResponse.json();
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataData.IpfsHash}`;
      console.log("Metadata URL:", metadataUrl);

      // Check tokenCount
      if (tokenCountError) {
        throw new Error(`Failed to fetch tokenCount: ${tokenCountError.message}`);
      }
      console.log("Current token count:", tokenCount?.toString());

      // Estimate gas
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http("https://monad-testnet.g.alchemy.com/v2/kgba2A2om3dyvvOWDkRbB74QvRbhr5uQ", { timeout: 30000 }),
      });

      const estimatedGas = await publicClient.estimateContractGas({
        address: factoryAddress,
        abi: tokenCreatorABI,
        functionName: "createToken",
        args: [name, symbol, metadataUrl, priceInWei, totalSupplyNum],
        account: address as `0x${string}`,
      });

      // Call createToken
      const txHash = await writeContractAsync({
        address: factoryAddress,
        abi: tokenCreatorABI,
        functionName: "createToken",
        args: [name, symbol, metadataUrl, priceInWei, totalSupplyNum],
        gas: (estimatedGas * BigInt(12)) / BigInt(10),
        chainId: 10143,
      });
      console.log("Transaction sent:", txHash);

      // Wait for transaction receipt
      let receipt = null;
      const maxRetries = 10;
      const retryDelay = 3000;
      for (let i = 0; i < maxRetries; i++) {
        try {
          receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          if (receipt) break;
          console.log(`Receipt not found, retrying (${i + 1}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } catch (err) {
          console.log(`Retry ${i + 1} failed:`, err);
        }
      }
      if (!receipt) {
        throw new Error(
          `Transaction receipt not found after ${maxRetries} retries. Check: https://testnet.monadexplorer.com/tx/${txHash}`
        );
      }
      console.log("Fetched receipt:", receipt);

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted. Check contract logs or increase gas.");
      }

      // Parse TokenCreated event
      const event = receipt.logs
        .map((log) => {
          try {
            const iface = new ethers.Interface(tokenCreatorABI);
            return iface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === "TokenCreated");
      if (!event) throw new Error("TokenCreated event not found.");
      const newContractAddress = event.args.contractAddress;
      console.log("New NFT contract address:", newContractAddress);

      // Save NFT to database
      const nftResponse = await fetch("/api/nfts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ca: newContractAddress,
          uri: metadataUrl,
          name,
          fid,
        }),
      });
      if (!nftResponse.ok) {
        const errorData = await nftResponse.json();
        throw new Error("Failed to save NFT to database.");
      }
      console.log("NFT saved to database:", await nftResponse.json());

      // Update user
      const userResponse = await fetch(`/api/users?fid=${fid}`);
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user data");
      }
      const userData = await userResponse.json();
      const updatedMine = [...(userData.mine || []), newContractAddress];

      const updateUserResponse = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          mine: updatedMine,
          bought: userData.bought || [],
        }),
      });
      if (!updateUserResponse.ok) {
        throw new Error("Failed to update user.");
      }
      console.log("User updated with new NFT:", await updateUserResponse.json());

      setNftDetails({
        name,
        symbol,
        price,
        totalSupply,
        contractAddress: newContractAddress,
        transactionHash: txHash,
        image: imageUrl,
        metadataUrl,
      });
      setIsDialogOpen(true);
    } catch (err: any) {
      setError("Failed to create NFT.");
      console.error("Minting error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setNftDetails(null);
  }, []);

  const handleCloseMintDialog = useCallback(() => {
    setIsMintDialogOpen(false);
    setMintContractAddress("");
    setMintDetails(null);
    setMintError(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const handleAddFrame = useCallback(() => {
    if (addFrame && nftDetails?.metadataUrl) {
      addFrame();
      console.log("Frame added with metadata URL:", nftDetails.metadataUrl);
    } else {
      console.log("addFrame not available or no metadata URL");
    }
  }, [addFrame, nftDetails]);

  const handleComposeCast = useCallback(() => {
    if (!composeCast || !nftDetails) {
      console.log("composeCast not available or no NFT details");
      return;
    }

    const castText = `Mint my new meme today!\nCopy CA -> Paste in 🛒 -> Mint!\nName: ${nftDetails.name}\nSymbol: ${nftDetails.symbol}\nPrice: ${nftDetails.price} MON\nTotal Supply: ${nftDetails.totalSupply}\nCA: ${nftDetails.contractAddress}`;
    const embeds = nftDetails.image ? [nftDetails.image, "https://polft.vercel.app"] : ["https://polft.vercel.app"];

    composeCast({ text: castText, embeds });
    console.log("Cast composed:", { text: castText, embeds });
  }, [composeCast, nftDetails]);

  return (
    <div className="overflow-x-hidden flex flex-col items-center gap-4 p-4 sm:p-6 w-full max-w-2xl mx-auto">
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
          placeholder="Price (MON)"
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
        {priceError && <p className="text-red-500 text-xs mt-1">{priceError}</p>}
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
        {supplyError && <p className="text-red-500 text-xs mt-1">{supplyError}</p>}
        <button
          onClick={handleMintNFT}
          disabled={isLoading || !address || !!priceError || !!supplyError || !price || !totalSupply}
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
                      <span className="font-semibold text-[#4B0082]">Name:</span>{" "}
                      <span className="text-black">{nftDetails.name}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-[#4B0082]">Symbol:</span>{" "}
                      <span className="text-black">{nftDetails.symbol}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-[#4B0082]">Price:</span>{" "}
                      <span className="text-black">{nftDetails.price} MON</span>
                    </p>
                    <p>
                      <span className="font-semibold text-[#4B0082]">Total Supply:</span>{" "}
                      <span className="text-black">{nftDetails.totalSupply}</span>
                    </p>
                    <p className="break-all">
                      <span className="font-semibold text-[#4B0082]">Contract Address:</span>{" "}
                      <span className="text-black">{nftDetails.contractAddress}</span>
                    </p>
                    <p className="break-all">
                      <span className="font-semibold text-[#4B0082]">Transaction Hash:</span>{" "}
                      <span className="text-black">{nftDetails.transactionHash}</span>
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
              disabled={isMintLoading || !address || nftDetailsLoading}
              className={`w-full p-3 mb-3 bg-[#FFD700] text-[#4B0082] font-bold rounded-lg border-[2px] border-[#800080] hover:bg-[#FFEC8B] hover:scale-105 active:scale-95 transition-all duration-300 text-sm ${
                isMintLoading || !address || nftDetailsLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {nftDetailsLoading ? "Loading..." : "Load Details"}
            </button>
            {mintDetails && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#4B0082]">{mintDetails.name}</h3>
                <p>Mint Price: {mintDetails.mintPrice} MON</p>
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
