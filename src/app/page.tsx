'use client';

import { useEffect, useRef, useState } from 'react';
import { parseEther, formatEther } from 'viem';
import { ArenaAppStoreSdk } from 'arena-app-store-sdk';

export default function Home() {
  const sdkRef = useRef<ArenaAppStoreSdk | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('');
  const [profile, setProfile] = useState<string>('');
  const [transactionResult, setTransactionResult] = useState<string>('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return; // Prevents SSR error

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
  }, []);

  const getUserProfile = async () => {
    try {
      const result = await sdkRef.current?.sendRequest('getUserProfile');
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
      </div>
    </main>
  );
}
