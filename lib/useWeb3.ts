import { useState, useEffect } from "react";
import { ethers } from "ethers";

export const useWeb3 = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false); // Add loading state

  const connectWallet = async () => {
    setError(null);
    setIsConnecting(true); // Set loading state

    console.log("Step 1: Checking for Ethereum provider...");
    if (typeof window.ethereum === "undefined") {
      const errMsg = "No Ethereum wallet detected. Please install MetaMask or another ETH-compatible wallet.";
      setError(errMsg);
      console.log(errMsg);
      setIsConnecting(false);
      return;
    }
    console.log("Ethereum provider detected.");

    try {
      console.log("Step 2: Initializing provider...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);
      console.log("Current chain ID:", currentChainId);

      console.log("Step 3: Requesting wallet connection...");
      const accounts = await provider.send("eth_requestAccounts", []);
      console.log("Wallet connected, accounts:", accounts);

      const targetChainId = 10143;
      console.log("Step 4: Checking if network switch is needed...");
      if (currentChainId !== targetChainId) {
        console.log(`Attempting to switch to Monad Testnet (Chain ID: ${targetChainId})...`);
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: ethers.toBeHex(targetChainId) }],
          });
          console.log("Successfully switched to Monad Testnet.");
        } catch (switchError: any) {
          console.log("Switch error:", switchError);
          if (switchError.code === 4902) {
            console.log("Network not found, attempting to add Monad Testnet...");
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: ethers.toBeHex(targetChainId),
                    chainName: "Monad Testnet",
                    rpcUrls: ["https://testnet-rpc.monad.xyz"],
                    nativeCurrency: {
                      name: "Monad",
                      symbol: "MONAD",
                      decimals: 18,
                    },
                    blockExplorerUrls: ["https://explorer.testnet.monad.xyz"], 
                  },
                ],
              });
              console.log("Monad Testnet added successfully.");
              console.log("Retrying network switch...");
              await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: ethers.toBeHex(targetChainId) }],
              });
              console.log("Successfully switched to Monad Testnet after adding.");
            } catch (addError: any) {
              const errMsg = "Failed to add Monad Testnet: " + (addError.message || "Unknown error");
              setError(errMsg);
              console.log("Add network error:", addError);
              setIsConnecting(false);
              return;
            }
          } else if (switchError.code === 4001) {
            const errMsg = "User rejected the network switch request. Please switch to Monad Testnet (Chain ID: 10143) manually.";
            setError(errMsg);
            console.log("User rejected network switch.");
            setIsConnecting(false);
            return;
          } else {
            const errMsg = "Failed to switch to Monad Testnet: " + (switchError.message || "Unknown error");
            setError(errMsg);
            console.log("Switch network error:", switchError);
            setIsConnecting(false);
            return;
          }
        }
      } else {
        console.log("Already on Monad Testnet (Chain ID: 10143).");
      }

      console.log("Step 5: Finalizing connection...");
      const updatedNetwork = await provider.getNetwork();
      const newChainId = Number(updatedNetwork.chainId);
      setChainId(newChainId);
      console.log("Updated chain ID:", newChainId);

      console.log("Fetching signer...");
      const signer = await provider.getSigner();
      console.log("Signer fetched:", signer);

      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
      setError(null);
      console.log("Wallet connection completed successfully.");
    } catch (err: any) {
      const errMsg = "Failed to connect wallet: " + (err.message || "Unknown error");
      setError(errMsg);
      console.log("Wallet connection error:", err);
    } finally {
      setIsConnecting(false); // Reset loading state
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      console.log("Checking existing wallet connection on page load...");
      if (typeof window.ethereum !== "undefined") {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send("eth_accounts", []);
          if (accounts.length > 0) {
            console.log("Wallet already connected, accounts:", accounts);
            const network = await provider.getNetwork();
            const currentChainId = Number(network.chainId);
            setChainId(currentChainId);
            setAccount(accounts[0]);
            setProvider(provider);
            const signer = await provider.getSigner();
            setSigner(signer);
            console.log("Signer set on page load:", signer);
            if (currentChainId !== 10143) {
              console.log("Auto-switching to Monad Testnet on page load...");
              await connectWallet();
            }
          } else {
            console.log("No wallet connected on page load.");
          }
        } catch (err) {
          console.log("Error checking wallet connection on page load:", err);
        }
      } else {
        console.log("No Ethereum provider detected on page load.");
      }
    };

    checkConnection();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || null);
        console.log("Accounts changed:", accounts);
      });
      window.ethereum.on("chainChanged", (newChainId: string) => {
        const updatedChainId = Number(newChainId);
        setChainId(updatedChainId);
        console.log("Chain changed to:", updatedChainId);
        if (updatedChainId !== 10143) {
          console.log("Chain changed to non-Monad Testnet, reattempting switch...");
          connectWallet();
        }
      });
    }
  }, []);

  return { web3: provider, account, chainId, error, connectWallet, signer, isConnecting };
};