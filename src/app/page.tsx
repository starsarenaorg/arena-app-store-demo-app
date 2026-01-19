'use client';
import pkg from '../../package.json';

import {avalanche as viemAvalanche} from 'viem/chains';
import {ethers} from "ethers";
import {useEffect, useRef, useState} from 'react';
import {formatEther, parseEther} from 'viem';
import {
  ArenaAppStoreSdk as ArenaAppStoreSdkType,
  ArenaUserProfile
} from '@the-arena/arena-app-store-sdk';

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

  // Transaction states
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [sendTxResult, setSendTxResult] = useState<string>('');

  // Contract states
  const [incrementResult, setIncrementResult] = useState<string>('');
  const [contractValue, setContractValue] = useState<number | string>('?');

  // Wagmi v2 connector states
  const [walletAddressByWagmi2Connector, setWalletAddressByWagmi2Connector] = useState<string | null>(null);
  const [chainByWagmi2Connector, setChainByWagmi2Connector] = useState<number | null | undefined>(null);
  const [balanceByWagmi2Connector, setBalanceByWagmi2Connector] = useState<string>('');
  const [contractValueByWagmi2Connector, setContractValueByWagmi2Connector] = useState<number | string>('?');
  const [wagmiResult, setWagmiResult] = useState<string>('');

  // Sign Message states
  const [messageToSign, setMessageToSign] = useState<string>('');
  const [signResult, setSignResult] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<string>('');

  // Sign Profile states
  const [signProfileResult, setSignProfileResult] = useState<string>('');

  // Store wagmi v2 connector instance to reuse across calls
  const wagmi2ConnectorRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return; // Prevents SSR error

    (async () => {
      const { ArenaAppStoreSdk } = await import('@the-arena/arena-app-store-sdk');

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

      setSendTxResult(`Transaction sent! Hash: ${txHash}`);
    } catch (err: any) {
      setSendTxResult(`Error: ${err.message}`);
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
      console.error(err);
      throw err;
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
      setIncrementResult(`Transaction sent! Hash: ${tx.hash}`);

      tx.wait().then(() => {
        setIncrementResult(`Transaction complete!`);
      });

    } catch (err: any) {
      setIncrementResult(`Error: ${err.message}`);
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

      setIncrementResult(`Transaction sent! Hash: ${txHash}`);

      const receipt = await waitForTransaction(provider, txHash);

      if (receipt.status === "0x1") {
        setIncrementResult(`✅ Transaction confirmed in block ${parseInt(receipt.blockNumber, 16)}`);
      } else {
        setIncrementResult(`❌ Transaction failed`);
      }

    } catch (err: any) {
      setIncrementResult(`Error: ${err.message}`);
    }
  }

  const connectWithWagmi2Connector = async () => {
    try {
      const { arenaWagmi2ConnectorFactory } = await import("@the-arena/wagmi2-connector");

      const sdkProvider = sdkRef.current?.provider as any;
      if (!sdkProvider) throw new Error('Provider not initialized');

      // Create wagmi v2 connector factory
      const connectorFactory = arenaWagmi2ConnectorFactory({
        provider: sdkProvider,
      });

      // Create a minimal config to instantiate the connector
      const mockConfig = {
        chains: [viemAvalanche as any] as const,
        emitter: {
          emit: (event: string, data?: any) => {
            console.log(`Event: ${event}`, data);
          }
        }
      };

      // Instantiate the connector and store it for reuse
      const connector = connectorFactory(mockConfig);
      wagmi2ConnectorRef.current = connector;

      // Connect using wagmi v2 API
      const { accounts, chainId } = await connector.connect();
      const account = accounts[0];

      // Reflect address and chain in UI
      if (account) setWalletAddressByWagmi2Connector(account);
      if (chainId) setChainByWagmi2Connector(chainId);

      // Get provider and read balance/contract
      const provider = await connector.getProvider();
      const browserProvider = new ethers.BrowserProvider(provider);
      const balWei = await browserProvider.getBalance(account);
      setBalanceByWagmi2Connector(ethers.formatEther(balWei));

      const contract = new ethers.Contract(
        INCREMENT_CONTRACT_ADDRESS,
        INCREMENT_CONTRACT_ABI,
        browserProvider
      );
      const value = await contract.number();
      setContractValueByWagmi2Connector(value.toString());
    } catch (err: any) {
      setWagmiResult(`Error: ${err.message}`);
    }
  };

  const getContractForWagmi2 = async () => {
    try {
      // Use the already connected connector instance
      const connector = wagmi2ConnectorRef.current;
      if (!connector) throw new Error('Wagmi v2 connector not connected. Please connect first.');

      // Get provider and create contract with signer
      const provider = await connector.getProvider();
      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();

      return new ethers.Contract(
        INCREMENT_CONTRACT_ADDRESS,
        INCREMENT_CONTRACT_ABI,
        signer
      );
    } catch (err: any) {
      throw new Error(`Contract setup failed: ${err.message}`);
    }
  };

  const fetchContractValueForWagmi2 = async () => {
    try {
      const contract = await getContractForWagmi2();
      if (!contract) throw new Error('Contract not initialized');

      const value = await contract.number(); // call the view function
      console.log("Current number (wagmi v2):", value.toString());
      setContractValueByWagmi2Connector(value.toString());
    } catch (err: any) {
      setWagmiResult(`Error: ${err.message}`);
    }
  };

  const incrementNumberForWagmi2 = async () => {
    try {
      const contract = await getContractForWagmi2();
      if (!contract) throw new Error('Contract not initialized');

      const tx = await contract.increment(); // send transaction
      console.log("Transaction sent (wagmi v2):", tx);
      setWagmiResult(`Transaction sent! Hash: ${tx.hash}`);

      tx.wait().then(() => {
        setWagmiResult(`Transaction complete!`);
      });

    } catch (err: any) {
      setWagmiResult(`Error: ${err.message}`);
    }
  };

  const signMessage = async () => {
    try {
      const provider = sdkRef.current?.provider;
      const account = provider?.accounts[0];

      if (!provider || !account) throw new Error('Wallet not connected');
      if (!messageToSign) throw new Error('Please enter a message to sign');

      const hexMessage = `0x${Buffer.from(messageToSign, 'utf8').toString('hex')}`;

      const signature = await provider.request({
        method: 'personal_sign',
        params: [hexMessage, account],
      });

      setSignResult(signature as string);
      setVerifyResult('');
    } catch (err: any) {
      setSignResult(`Error: ${err.message}`);
    }
  };

  const verifySignature = async () => {
    try {
      if (!messageToSign || !signResult || signResult.startsWith('Error')) throw new Error('No message or valid signature to verify');

      const signerAddr = ethers.verifyMessage(messageToSign, signResult);
      if (walletAddress && signerAddr.toLowerCase() === walletAddress.toLowerCase()) {
        setVerifyResult('✅ Valid Signature (matches connected wallet)');
      } else {
        setVerifyResult(`❌ Invalid Signature (signer: ${signerAddr})`);
      }
    } catch (err: any) {
      setVerifyResult(`Error: ${err.message}`);
    }
  };

  const signUserProfile = async () => {
    try {
      setSignProfileResult("Fetching user profile...");
      const userProfile = await sdkRef.current?.fetchUserProfile();

      if (!userProfile) throw new Error("Could not fetch user profile");

      const profileString = JSON.stringify(userProfile, null, 2);
      const hexMessage = `0x${Buffer.from(profileString, 'utf8').toString('hex')}`;

      const provider = sdkRef.current?.provider;
      const account = provider?.accounts[0];
      if (!provider || !account) throw new Error('Wallet not connected');

      const signature = await provider.request({
        method: 'personal_sign',
        params: [hexMessage, account],
      });

      setSignProfileResult(`Profile:\n${profileString}\n\nSignature:\n${signature}`);

    } catch (err: any) {
      setSignProfileResult(`Error: ${err.message}`);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold">Arena Demo App</h1>
        <div className="text-sm text-neutral-400 font-mono">
            <p>App Version: {pkg.version}</p>
            <p>SDK Version: {pkg.dependencies['@the-arena/arena-app-store-sdk']}</p>
            <p>Wagmi Connector Version: {pkg.dependencies['@the-arena/wagmi2-connector']}</p>
        </div>

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
              {sendTxResult}
            </pre>
          </div>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Sign Message</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block mb-1">Message:</label>
              <textarea
                className="w-full bg-neutral-700 text-white p-2 rounded"
                placeholder="Enter message to sign..."
                value={messageToSign}
                onChange={(e) => setMessageToSign(e.target.value)}
              />
            </div>
              <button
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              onClick={signMessage}
            >
              Sign Message
            </button>
            <pre className="bg-black p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {signResult}
            </pre>

            <button
              className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
              onClick={verifySignature}
            >
              Verify Signature
            </button>
            <pre className="bg-black p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {verifyResult}
            </pre>
          </div>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Sign User Profile</h2>
          <button
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
            onClick={signUserProfile}
          >
            Sign User Profile
          </button>
          <pre className="bg-black p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
            {signProfileResult}
          </pre>
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
              {incrementResult}
            </pre>
          </div>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Arena Wagmi v2 Connector</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <div className="w-full flex flex-row gap-32 items-center justify-center">
                <button
                  className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700"
                  onClick={connectWithWagmi2Connector}
                >
                  Connect
                </button>
              </div>
              <div className="flex flex-col content-start gap-4">
                <div className="w-full flex flex-row gap-32 items-center justify-center">
                  <p>
                    {`Chain By Wagmi v2 Connector: ${chainByWagmi2Connector}`}
                  </p>
                </div>
                <div className="w-full flex flex-col items-center justify-center">
                  <p>
                    {`Address By Wagmi v2 Connector:`}
                  </p>
                  <p>
                    {`${walletAddressByWagmi2Connector}`}
                  </p>
                </div>
                <div className="w-full flex flex-row gap-32 items-center justify-center">
                  <p>
                    {`Balance By Wagmi v2 Connector: ${balanceByWagmi2Connector}`}
                  </p>
                </div>
                <div className="w-full flex flex-row gap-32 items-center justify-center">
                  <p>
                    {`Contract Value By Wagmi v2 Connector: ${contractValueByWagmi2Connector}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
                  onClick={fetchContractValueForWagmi2}
                >
                  Fetch Value With Wagmi
                </button>
                <button
                  className="bg-orange-600 px-4 py-2 rounded hover:bg-orange-700"
                  onClick={incrementNumberForWagmi2}
                >
                  Increment With Wagmi
                </button>
              </div>
            </div>
            <pre className="bg-black p-3 rounded overflow-x-auto">
              {wagmiResult}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
