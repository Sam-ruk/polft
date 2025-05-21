"use client";

import { useState, useEffect } from "react";
import { useMiniAppContext } from "@/hooks/use-miniapp-context";
import { MintNFTTab } from "./tabs/MintNFTTab";
import { MyNFTsTab } from "./tabs/MyNFTsTab";
import { PurchasedNFTsTab } from "./tabs/PurchasedNFTsTab";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

export const PolFT = () => {
  const { context, actions, isEthProviderAvailable } = useMiniAppContext();
  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const [activeTab, setActiveTab] = useState("mintNFT");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [addFrameStatus, setAddFrameStatus] = useState<string | null>(null);

  const targetChainId = 10143; // Monad Testnet

  // Auto-connect wallet and switch chain
  useEffect(() => {
    if (!isConnected && isEthProviderAvailable && activeTab === "mintNFT") {
      setIsConnecting(true);
      setWalletError(null);
      try {
        connect({ connector: farcasterFrame() });
      } catch (err: any) {
        setWalletError(`Failed to connect wallet.`);
        console.error("Wallet connection error:", err);
      } finally {
        setIsConnecting(false);
      }
    }
    if (isConnected && chainId !== targetChainId) {
      try {
        switchChain({ chainId: targetChainId });
      } catch (err: any) {
        setWalletError(`Failed to switch to Monad Testnet.`);
        console.error("Chain switch error:", err);
      }
    }
  }, [isConnected, chainId, activeTab, isEthProviderAvailable, connect, switchChain]);

  // Auto-sign-in with Farcaster
  useEffect(() => {
    if (!context?.user?.fid && actions) {
      actions.signIn({ nonce: "1201" }).catch((err) => {
        console.error("Auto sign-in failed:", err);
        setWalletError("Failed to authenticate with Farcaster. Check Warpcast settings.");
      });
    }
  }, [context, actions]);

  const handleAddFrame = async () => {
    setAddFrameStatus(null);
    console.log("handleAddFrame called", {
      actions: !!actions,
      addFrame: !!actions?.addFrame,
      fid: context?.user?.fid,
      appUrl: "https://polft.vercel.app",
    });
    if (!context?.user?.fid) {
      console.error("User not signed in");
      setAddFrameStatus("Please sign in with Farcaster to save the miniapp.");
      return;
    }
    if (!actions?.addFrame) {
      console.error("addFrame action not available");
      setAddFrameStatus("Cannot save miniapp. Farcaster actions not available.");
      return;
    }
    try {
      await actions.addFrame();
      setAddFrameStatus("Miniapp saved to favorites!");
      setTimeout(() => setAddFrameStatus(null), 3000);
    } catch (error: any) {
      console.error("Failed to save miniapp:", error.message, error.stack);
      if (error.message.includes("AddFrame.InvalidDomainManifest")) {
        setAddFrameStatus(
          "Cannot save miniapp due to domain configuration issue. Try sharing the app URL in Warpcast instead."
        );
      } else {
        setAddFrameStatus(`Failed to save miniapp: ${error.message || "Unknown error"}.`);
      }
    }
  };

  const handleShareCast = () => {
    setAddFrameStatus(null);
    if (actions?.composeCast) {
      actions
        .composeCast({
          text: "Check out PolFT!",
          embeds: ["https://polft.vercel.app"],
        })
        .then(() => {
          setAddFrameStatus("App shared to Warpcast!");
          setTimeout(() => setAddFrameStatus(null), 3000);
        })
        .catch((err) => {
          console.error("Failed to compose cast:", err);
          setAddFrameStatus("Failed to share miniapp. Please try again.");
        });
    } else {
      setAddFrameStatus("Cannot share miniapp. Farcaster actions not available.");
    }
  };

  const renderContent = () => {
    if (isConnecting) {
      return <div className="text-center text-gray-600">Connecting wallet...</div>;
    }

    const fid = context?.user?.fid?.toString() || "";
    switch (activeTab) {
      case "mintNFT":
        return <MintNFTTab fid={fid} address={address} addFrame={actions?.addFrame} composeCast={actions?.composeCast} />;
      case "myNFTs":
        return <MyNFTsTab fid={fid} />;
      case "purchasedNFTs":
        return <PurchasedNFTsTab fid={fid} />;
      default:
        return null;
    }
  };

  const DialogBox = ({ message, onClose }: { message: string; onClose: () => void }) => {
    const isError = message.includes("Failed") || message.includes("Cannot");
    useEffect(() => {
      if (!isError) {
        const timer = setTimeout(() => onClose(), 3000);
        return () => clearTimeout(timer);
      }
    }, [isError, onClose]);

    return (
      <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-black bg-opacity-30 animate-fadeIn">
        <div
          className={`relative bg-white p-6 rounded-2xl max-w-sm w-full shadow-lg transform transition-all duration-300 animate-bounceIn ${
            isError ? "border-2 border-red-300" : "border-2 border-green-300"
          }`}
        >
          <div
            className={`absolute top-0 left-0 w-full h-2 rounded-t-2xl ${
              isError ? "bg-red-400" : "bg-green-400"
            }`}
          ></div>
          <p className={`text-center text-sm font-semibold ${isError ? "text-red-600" : "text-green-600"}`}>{message}</p>
          {isError && (
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#d9a8ff]">
      <div className="fixed top-0 left-0 w-full bg-[#d9a8ff] z-10 shadow-md">
        <div className="max-w-5xl mx-auto px-2 sm:px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          <div className="flex-shrink-0">
            {context?.user?.fid ? (
              <div className="flex items-center gap-1">
                <p className="py-1 px-1 bg-green-100 text-green-600 rounded-lg text-[10px] sm:text-[10px]">
                  FID: {context.user.fid}
                </p>
                {address && (
                  <p className="py-1 px-1 bg-blue-100 text-blue-600 rounded-lg text-[10px] sm:text-[9px]">
                    Wallet: {address.slice(0, 3)}..{address.slice(-2)}
                  </p>
                )}
              </div>
            ) : (
              <p className="py-0.5 px-0.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] sm:text-[10px]">
                Not signed in
              </p>
            )}
          </div>
          <div className="flex flex-nowrap gap-0.5">
            {[
              { id: "mintNFT", label: "🪙 Mint" },
              { id: "myNFTs", label: "🫵" },
              { id: "purchasedNFTs", label: "🛒" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`px-1 py-1 rounded-[10px] font-semibold text-[10px] sm:text-xs transition-all duration-300 whitespace-nowrap flex-shrink-0 min-w-[35px] ${
                  activeTab === tab.id
                    ? "bg-[#FFD700] text-[#4B0082] border-[1px] border-[#800080] shadow-sm"
                    : "bg-white text-[#4B0082] border-[1px] border-[#800080] hover:bg-[#FFEC8B] hover:scale-105"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
            <button
              className="px-1 py-1 rounded-[10px] font-semibold text-[10px] sm:text-xs transition-all duration-300 whitespace-nowrap flex-shrink-0 min-w-[35px] bg-white text-[#4B0082] border-[1px] border-[#800080] hover:bg-[#FFEC8B] hover:scale-105"
              onClick={handleAddFrame}
              title="Save to Favorites"
            >
              📌
            </button>
            <button
              className="px-1 py-1 rounded-[10px] font-semibold text-[10px] sm:text-xs transition-all duration-300 whitespace-nowrap flex-shrink-0 min-w-[35px] bg-white text-[#4B0082] border-[1px] border-[#800080] hover:bg-[#FFEC8B] hover:scale-105"
              onClick={handleShareCast}
              title="Share to Warpcast"
            >
              📤
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto pt-14 px-4 pb-6">
        {walletError && (
          <div className="mb-4 text-center">
            <p className="text-red-500 text-sm">{walletError}</p>
            <p className="text-gray-600 text-xs mt-1">Check the browser console (F12 ➡ Console) for more details.</p>
          </div>
        )}
        {addFrameStatus && <DialogBox message={addFrameStatus} onClose={() => setAddFrameStatus(null)} />}
        {renderContent()}
      </div>
    </div>
  );
};
