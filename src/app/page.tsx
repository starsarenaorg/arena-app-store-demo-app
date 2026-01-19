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
  const snippets: Record<string, string> = {};

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
  // Sign Profile states
  const [signProfileResult, setSignProfileResult] = useState<string>('');
  const [profileToVerify, setProfileToVerify] = useState<string>('');
  const [profileSignature, setProfileSignature] = useState<string>('');
  const [verifyProfileResult, setVerifyProfileResult] = useState<string>('');

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

  snippets.userProfile = `const userProfile = await sdkRef.current?.fetchUserProfile();
// Returns: { userImageUrl: string, username: string, ... }`;

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

  snippets.walletInfo = `const provider = sdkRef.current?.provider;
const accounts = provider?.accounts;
const balance = await provider.request({
  method: 'eth_getBalance',
  params: [accounts[0], 'latest'],
});`;

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

  snippets.sendTransaction = `const txHash = await provider.request({
  method: 'eth_sendTransaction',
  params: [{
    from: account,
    to: toAddress,
    value: parseEther(amount).toString(),
  }],
});`;

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

  snippets.contract = `const browserProvider = new ethers.BrowserProvider(provider);
const signer = await browserProvider.getSigner();
const contract = new ethers.Contract(ADDRESS, ABI, signer);
const tx = await contract.increment();
await tx.wait();`;

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

  snippets.wagmi = `const connector = connectorFactory({ provider });
const { accounts } = await connector.connect();
const provider = await connector.getProvider();
// Use provider with ethers/viem as normal`;

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

  snippets.signMessage = `const hexMessage = \`0x\${Buffer.from(message, 'utf8').toString('hex')}\`;
const signature = await provider.request({
  method: 'personal_sign',
  params: [hexMessage, account],
});

// Verify
const signerAddr = ethers.verifyMessage(message, signature);`;

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

  snippets.signProfile = `const profile = await sdkRef.current?.fetchUserProfile();
const profileStr = JSON.stringify(profile);
const hexMessage = \`0x\${Buffer.from(profileStr, 'utf8').toString('hex')}\`;
const sig = await provider.request({
  method: 'personal_sign',
  params: [hexMessage, account],
});

// Verify
const signerAddr = ethers.verifyMessage(profileStr, sig);`;

  const signUserProfile = async () => {
    try {
      setSignProfileResult("Fetching user profile...");
      setVerifyProfileResult('');
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
      setProfileToVerify(profileString);
      setProfileSignature(signature as string);

    } catch (err: any) {
      setSignProfileResult(`Error: ${err.message}`);
    }
  }

  const verifyProfileSignature = async () => {
    try {
      if (!profileToVerify || !profileSignature) throw new Error('No profile or signature to verify');

      const signerAddr = ethers.verifyMessage(profileToVerify, profileSignature);
      if (walletAddress && signerAddr.toLowerCase() === walletAddress.toLowerCase()) {
        setVerifyProfileResult('✅ Valid Signature (matches connected wallet)');
      } else {
        setVerifyProfileResult(`❌ Invalid Signature (signer: ${signerAddr})`);
      }
    } catch (err: any) {
      setVerifyProfileResult(`Error: ${err.message}`);
    }
  };



  const CodeDisplay = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="relative mb-4 group">
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy to clipboard"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          )}
        </button>
        <pre className="bg-black/50 p-4 pt-8 rounded-lg text-sm font-mono text-neutral-300 overflow-x-auto overflow-y-auto max-h-64 border border-neutral-700">
          <code>{code}</code>
        </pre>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-6">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#EB540A] to-[#FF8C69]">
            Arena SDK Playground
          </h1>
          <div className="flex flex-wrap gap-3 text-sm font-mono">
            <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="text-[#FFD700]">App</span>
              <span className="text-[#FFF4B8] font-bold text-base">{pkg.version}</span>
            </div>
            <div className="bg-[#EB540A]/10 border border-[#EB540A]/30 px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="text-[#EB540A]">SDK</span>
              <span className="text-[#FFCBAD] font-bold text-base">{pkg.dependencies['@the-arena/arena-app-store-sdk']}</span>
            </div>
            <div className="bg-[#D946EF]/10 border border-[#D946EF]/30 px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="text-[#D946EF]">Wagmi</span>
              <span className="text-[#FAE8FF] font-bold text-base">{pkg.dependencies['@the-arena/wagmi2-connector']}</span>
            </div>
          </div>
        </div>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Wallet Info</h2>
          <h3 className="text-xl font-medium text-neutral-400">Code:</h3>
          <CodeDisplay code={snippets.walletInfo} />
          <h3 className="text-xl font-medium text-neutral-400">Try:</h3>
          <p>
            Connected Wallet:{" "}
            <span className="text-[#EB540A] font-mono">
              {walletAddress || "Not connected"}
            </span>
          </p>
          <button
            className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
            onClick={getWalletBalance}
          >
            Get Balance
          </button>
          <h3 className="text-xl font-medium text-neutral-400">Result:</h3>
          <pre className="bg-black p-3 rounded overflow-x-auto">{balance}</pre>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">User Profile</h2>
          <h3 className="text-xl font-medium text-neutral-400">Code:</h3>
          <CodeDisplay code={snippets.userProfile} />
          <h3 className="text-xl font-medium text-neutral-400">Try:</h3>
          <button
            className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
            onClick={getUserProfile}
          >
            Get User Profile
          </button>
          {userImageUrl && (
            <img
              src={userImageUrl}
              alt="User"
              className="w-12 h-12 rounded-full object-cover border-2 border-[#EB540A]"
            />
          )}
          <h3 className="text-xl font-medium text-neutral-400">Result:</h3>
          <pre className="bg-black p-3 rounded overflow-x-auto">{profile}</pre>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Send Transaction</h2>
          <h3 className="text-xl font-medium text-neutral-400">Code:</h3>
          <CodeDisplay code={snippets.sendTransaction} />
          <h3 className="text-xl font-medium text-neutral-400">Try:</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block mb-1">To Address:</label>
              <input
                type="text"
                className="w-full bg-neutral-700 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#EB540A]"
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
                className="w-full bg-neutral-700 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#EB540A]"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button
              className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
              onClick={sendTransaction}
            >
              Send AVAX
            </button>
            <h3 className="text-xl font-medium text-neutral-400">Result:</h3>
            <pre className="bg-black p-3 rounded overflow-x-auto">
              {sendTxResult}
            </pre>
          </div>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Sign Message</h2>
          <h3 className="text-xl font-medium text-neutral-400">Code:</h3>
          <CodeDisplay code={snippets.signMessage} />
          <h3 className="text-xl font-medium text-neutral-400">Try:</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block mb-1">Message:</label>
              <textarea
                className="w-full bg-neutral-700 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#EB540A]"
                placeholder="Enter message to sign..."
                value={messageToSign}
                onChange={(e) => setMessageToSign(e.target.value)}
              />
            </div>
              <button
              className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
              onClick={signMessage}
            >
              Sign Message
            </button>
            <h3 className="text-xl font-medium text-neutral-400">Result:</h3>
            <pre className="bg-black p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {signResult}
            </pre>

            <button
              className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
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
          <h3 className="text-xl font-medium text-neutral-400">Code:</h3>
          <CodeDisplay code={snippets.signProfile} />
          <h3 className="text-xl font-medium text-neutral-400">Try:</h3>
          <button
            className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
            onClick={signUserProfile}
          >
            Sign User Profile
          </button>
          <pre className="bg-black p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
            {signProfileResult}
          </pre>

          <button
              className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
              onClick={verifyProfileSignature}
            >
              Verify Signature
            </button>
            <pre className="bg-black p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {verifyProfileResult}
            </pre>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Increment Contract Interaction</h2>
          <h3 className="text-xl font-medium text-neutral-400">Code:</h3>
          <CodeDisplay code={snippets.contract} />
          <h3 className="text-xl font-medium text-neutral-400">Try:</h3>
          <div className="flex flex-col gap-4">
            <div>
              <div className="w-full flex flex-row gap-32 items-center justify-center">
                <p>
                  {`Current Value: ${contractValue}`}
                </p>
                <button
                  className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
                  onClick={fetchContractValue}
                >
                  Fetch Value
                </button>
              </div>
            </div>
            <button
              className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
              onClick={incrementNumberWithEthers}
            >
              Increment With Ethers
            </button>
            <button
              className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
              onClick={incrementNumberWithRawRpc}
            >
              Increment With Raw RPC
            </button>
            <h3 className="text-xl font-medium text-neutral-400">Result:</h3>
            <pre className="bg-black p-3 rounded overflow-x-auto">
              {incrementResult}
            </pre>
          </div>
        </section>

        <section className="bg-neutral-800 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-semibold">Arena Wagmi v2 Connector</h2>
          <h3 className="text-xl font-medium text-neutral-400">Code:</h3>
          <CodeDisplay code={snippets.wagmi} />
          <h3 className="text-xl font-medium text-neutral-400">Try:</h3>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <div className="w-full flex flex-row gap-32 items-center justify-center">
                <button
                  className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
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
                  className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
                  onClick={fetchContractValueForWagmi2}
                >
                  Fetch Value With Wagmi
                </button>
                <button
                  className="bg-[#EB540A] px-4 py-2 rounded hover:bg-[#CB4A0B] transition-colors font-semibold"
                  onClick={incrementNumberForWagmi2}
                >
                  Increment With Wagmi
                </button>
              </div>
            </div>
            <h3 className="text-xl font-medium text-neutral-400">Result:</h3>
            <pre className="bg-black p-3 rounded overflow-x-auto">
              {wagmiResult}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
