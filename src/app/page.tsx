'use client';

import {avalanche} from 'wagmi/chains'; // or avalancheFuji if you're on testnet
import {ethers} from "ethers";
import {useEffect, useRef, useState} from 'react';
import {formatEther, parseEther} from 'viem';
import {
  ArenaAppStoreSdk as ArenaAppStoreSdkType,
  ArenaUserProfile
} from 'arena-app-store-sdk';

const INCREMENT_CONTRACT_ADDRESS = '0x8D4B5309Bfcb2e4F927c9C03d68554B404B7EcCe'
const INCREMENT_CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "increment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "number",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newNumber",
        "type": "uint256"
      }
    ],
    "name": "setNumber",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

export default function Home() {
  const sdkRef = useRef<ArenaAppStoreSdkType | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('');
  const [profile, setProfile] = useState<string>('');
  const [userImageUrl, setUserImageUrl] = useState<string | undefined>(undefined);
  const [transactionResult, setTransactionResult] = useState<string>('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [contractValue, setContractValue] = useState<number | string>('?');
  const [walletAddressByWagmiConnector, setWalletAddressByWagmiConnector] = useState<string | null>(null);
  const [chainByWagmiConnector, setChainByWagmiConnector] = useState<number | null | undefined>(null);
  const [balanceByWagmiConnector, setBalanceByWagmiConnector] = useState<string>('');
  const [contractValueByWagmiConnector, setContractValueByWagmiConnector] = useState<number | string>('?');

  useEffect(() => {
    if (typeof window === 'undefined') return; // Prevents SSR error

    (async () => {
      const { ArenaAppStoreSdk } = await import('arena-app-store-sdk');

      const sdk = new ArenaAppStoreSdk({
        projectId: '8631087374c7fee91d66744f57762ac0',
        metadata: {
          name: 'Arena Demo App',
          description: 'The Arena App Store Demo App',
          url: window.location.origin,
          icons: ['https://avatars.githubusercontent.com/u/37784886'],
        },
      });

      sdk.on('walletChanged', ({ address }: { address: any }) => {
        setWalletAddress(address || null);
      });

      sdkRef.current = sdk;
    })();
  }, []);

  const getUserProfile = async () => {
    try {
      setProfile("fetching...");
      const result: ArenaUserProfile | undefined | null = await sdkRef.current?.fetchUserProfile();
      setUserImageUrl(result?.userImageUrl);
      setProfile(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setProfile(`Error: ${err.message}`);
    }
  };

  const getWalletBalance = async () => {
    try {
      const provider = sdkRef.current?.provider;
      const account = provider?.accounts[0];
      if (!provider || !account) throw new Error('Wallet not connected');

      const rawBalance = await provider.request({
        method: 'eth_getBalance',
        params: [account, 'latest'],
      });

      const balanceInEth = formatEther(BigInt(rawBalance as any));
      setBalance(`Balance: ${balanceInEth} AVAX`);
    } catch (err: any) {
      setBalance(`Error: ${err.message}`);
    }
  };

  const sendTransaction = async () => {
    try {
      const provider = sdkRef.current?.provider;
      const account = provider?.accounts[0];
      if (!provider || !account) throw new Error('Wallet not connected');
      if (!toAddress || !amount) throw new Error('Please fill all fields');

      const value = parseEther(amount);
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: toAddress,
          value: value.toString(),
        }],
      });

      setTransactionResult(`Transaction sent! Hash: ${txHash}`);
    } catch (err: any) {
      setTransactionResult(`Error: ${err.message}`);
    }
  };

  const getContract = async () => {
    try {
      const provider = sdkRef.current?.provider;
      if (!provider) throw new Error('Provider not initialized');

      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();

      return new ethers.Contract(
        INCREMENT_CONTRACT_ADDRESS,
        INCREMENT_CONTRACT_ABI,
        signer
      );
    } catch (err: any) {
      setTransactionResult(`Error: ${err.message}`);
    }
  }

  const fetchContractValue = async () => {
    const contract = await getContract();
    if (!contract) throw new Error('Contract not initialized');

    const value = await contract.number(); // call the view function
    console.log("Current number:", value.toString());
    setContractValue(value);
  }

  const incrementNumberWithEthers = async () => {
    try {
      const contract = await getContract();
      if (!contract) throw new Error('Contract not initialized');

      const tx = await contract.increment(); // send transaction
      console.log("Transaction sent:", tx);
      setTransactionResult(`Transaction sent! Hash: ${tx.hash}`);

      tx.wait().then(() => {
        setTransactionResult(`Transaction complete!`);
      });

    } catch (err: any) {
      setTransactionResult(`Error: ${err.message}`);
    }
  }

  const waitForTransaction = async (provider: any, txHash: any) => {
    while (true) {
      const receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });

      if (receipt) return receipt; // mined!

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  };

  const incrementNumberWithRawRpc = async () => {
    try {
      const provider = sdkRef.current?.provider;
      const account = provider?.accounts[0];
      if (!provider || !account) throw new Error('Wallet not connected');

      const iface = new ethers.Interface(INCREMENT_CONTRACT_ABI);
      const data = iface.encodeFunctionData("increment", []);

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: INCREMENT_CONTRACT_ADDRESS,
          data: data,
        }],
      });

      setTransactionResult(`Transaction sent! Hash: ${txHash}`);

      const receipt = await waitForTransaction(provider, txHash);

      if (receipt.status === "0x1") {
        setTransactionResult(`✅ Transaction confirmed in block ${parseInt(receipt.blockNumber, 16)}`);
      } else {
        setTransactionResult(`❌ Transaction failed`);
      }

    } catch (err: any) {
      setTransactionResult(`Error: ${err.message}`);
    }
  }

  const connectWithWagmiConnector = async () => {
    try {
      const { ArenaWagmiConnector } = await import("arena-app-store-sdk");

      const sdkProvider = sdkRef.current?.provider as any;
      if (!sdkProvider) throw new Error('Provider not initialized');

      // Create connector with the SDK’s EIP-1193 provider
      const connector = new ArenaWagmiConnector({
        provider: sdkProvider,
        chains: [avalanche], // swap to avalancheFuji if your contract is on Fuji
      });

      // Use the OUTPUT of connect()
      const { account, chain, provider } = await connector.connect();

      // (optional) reflect address in UI
      if (account) setWalletAddressByWagmiConnector(account);
      if (chain) setChainByWagmiConnector(chain?.id);

      // Use the provider from connector.connect() to READ the contract
      const browserProvider = new ethers.BrowserProvider(provider);
      const balWei = await browserProvider.getBalance(account);
      setBalanceByWagmiConnector(ethers.formatEther(balWei));

      const contract = new ethers.Contract(
        INCREMENT_CONTRACT_ADDRESS,
        INCREMENT_CONTRACT_ABI,
        browserProvider
      );
      const value = await contract.number();
      setContractValueByWagmiConnector(value.toString());
    } catch (err: any) {
      setTransactionResult(`Error: ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold">Arena Demo App</h1>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Wallet Info</h2>
          <p>
            Connected Wallet:{" "}
            <span className="text-blue-400 font-mono">
              {walletAddress || "Not connected"}
            </span>
          </p>
          <button
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
            onClick={getWalletBalance}
          >
            Get Balance
          </button>
          <pre className="bg-black p-3 rounded overflow-x-auto">{balance}</pre>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">User Profile</h2>
          <button
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
            onClick={getUserProfile}
          >
            Get User Profile
          </button>
          {userImageUrl && (
            <img
              src={userImageUrl}
              alt="User"
              className="w-12 h-12 rounded-full object-cover border-2 border-blue-400"
            />
          )}
          <pre className="bg-black p-3 rounded overflow-x-auto">{profile}</pre>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Send Transaction</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block mb-1">To Address:</label>
              <input
                type="text"
                className="w-full bg-neutral-700 text-white p-2 rounded"
                placeholder="0x..."
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">Amount (AVAX):</label>
              <input
                type="number"
                min="0"
                step="0.00000001"
                className="w-full bg-neutral-700 text-white p-2 rounded"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              onClick={sendTransaction}
            >
              Send AVAX
            </button>
            <pre className="bg-black p-3 rounded overflow-x-auto">
              {transactionResult}
            </pre>
          </div>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Increment Contract Interaction</h2>
          <div className="flex flex-col gap-4">
            <div>
              <div className="w-full flex flex-row gap-32 items-center justify-center">
                <p>
                  {`Current Value: ${contractValue}`}
                </p>
                <button
                  className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                  onClick={fetchContractValue}
                >
                  Fetch Value
                </button>
              </div>
            </div>
            <button
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              onClick={incrementNumberWithEthers}
            >
              Increment With Ethers
            </button>
            <button
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              onClick={incrementNumberWithRawRpc}
            >
              Increment With Raw RPC
            </button>
            <pre className="bg-black p-3 rounded overflow-x-auto">
              {transactionResult}
            </pre>
          </div>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Arena Wagmi Connector</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <div className="w-full flex flex-row gap-32 items-center justify-center">
                <button
                  className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                  onClick={connectWithWagmiConnector}
                >
                  Connect With Arena Wagmi Connector
                </button>
              </div>
              <div className="flex flex-col content-start gap-4">
                <div className="w-full flex flex-row gap-32 items-center justify-center">
                  <p>
                    {`Chain By Wagmi Connector: ${chainByWagmiConnector}`}
                  </p>
                </div>
                <div className="w-full flex flex-row gap-32 items-center justify-center">
                  <p>
                    {`Address By Wagmi Connector: ${walletAddressByWagmiConnector}`}
                  </p>
                </div>
                <div className="w-full flex flex-row gap-32 items-center justify-center">
                  <p>
                    {`Balance By Wagmi Connector: ${balanceByWagmiConnector}`}
                  </p>
                </div>
                <div className="w-full flex flex-row gap-32 items-center justify-center">
                  <p>
                    {`Contract Value By Wagmi Connector: ${contractValueByWagmiConnector}`}
                  </p>
                </div>
              </div>
            </div>
            <pre className="bg-black p-3 rounded overflow-x-auto">
              {transactionResult}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
