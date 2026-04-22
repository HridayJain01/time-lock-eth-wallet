import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.2/+esm";

const ABI = [
  "function owner() view returns (address)",
  "function unlockTime() view returns (uint256)",
  "function DEPOSIT_LOCK_SECONDS() view returns (uint256)",
  "function getBalance() view returns (uint256)",
  "function deposit() payable",
  "function withdraw()",
  "event Deposited(address indexed from, uint256 amount, uint256 newBalance)",
  "event UnlockTimeUpdated(uint256 newUnlockTime)",
  "event Withdrawn(address indexed to, uint256 amount)"
];

const HARDHAT_PARAMS = {
  chainId: "0x7a69",
  chainName: "Hardhat Local",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: []
};

const els = {
  contractAddress: document.getElementById("contractAddress"),
  depositAmount: document.getElementById("depositAmount"),
  connectBtn: document.getElementById("connectBtn"),
  switchBtn: document.getElementById("switchBtn"),
  loadBtn: document.getElementById("loadBtn"),
  depositBtn: document.getElementById("depositBtn"),
  withdrawBtn: document.getElementById("withdrawBtn"),
  account: document.getElementById("account"),
  owner: document.getElementById("owner"),
  unlock: document.getElementById("unlock"),
  countdown: document.getElementById("countdown"),
  balance: document.getElementById("balance"),
  chain: document.getElementById("chain"),
  log: document.getElementById("log")
};

let provider;
let signer;
let contract;
let currentUnlock = null;
let countdownInterval;
let deploymentCache = null;

function setLog(message) {
  els.log.textContent = message;
}

function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr || "-";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatCountdown(unlockTs) {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(unlockTs) - now;
  if (diff <= 0) return "Unlocked";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h}h ${m}m ${s}s`;
}

async function autoPrefillAddress() {
  try {
    const res = await fetch("./deployment.json", { cache: "no-store" });
    if (!res.ok) return;
    deploymentCache = await res.json();
    if (deploymentCache?.contractAddress) {
      els.contractAddress.value = deploymentCache.contractAddress;
      setLog("Loaded deployment.json. Click Load Contract.");
    }
  } catch {
    // Ignore when deployment file doesn't exist yet.
  }
}

async function ensureDeploymentAddress() {
  const currentAddress = els.contractAddress.value.trim();
  if (ethers.isAddress(currentAddress)) {
    return currentAddress;
  }

  if (!deploymentCache) {
    await autoPrefillAddress();
  }

  const fallbackAddress = els.contractAddress.value.trim();
  if (ethers.isAddress(fallbackAddress)) {
    return fallbackAddress;
  }

  return null;
}

async function connectWallet() {
  if (!window.ethereum) {
    setLog("MetaMask not detected. Install extension first.");
    return;
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();

  const account = await signer.getAddress();
  const network = await provider.getNetwork();

  els.account.textContent = `${shortAddr(account)} (${account})`;
  els.chain.textContent = `${network.chainId}`;
  setLog("Wallet connected.");
}

async function switchToHardhat() {
  if (!window.ethereum) {
    setLog("MetaMask not detected.");
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_PARAMS.chainId }]
    });
    setLog("Switched to Hardhat Local network.");
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [HARDHAT_PARAMS]
      });
      setLog("Added and switched to Hardhat Local network.");
    } else {
      setLog(`Network switch failed: ${switchError.message}`);
    }
  }
}

async function loadContract() {
  if (!provider || !signer) {
    setLog("Connect MetaMask first.");
    return;
  }

  const address = await ensureDeploymentAddress();
  if (!address) {
    setLog("Invalid contract address.");
    return;
  }

  els.contractAddress.value = address;

  contract = new ethers.Contract(address, ABI, signer);

  try {
    const [owner, unlockTime, balanceWei, network] = await Promise.all([
      contract.owner(),
      contract.unlockTime(),
      contract.getBalance(),
      provider.getNetwork()
    ]);

    currentUnlock = unlockTime;
    els.owner.textContent = `${shortAddr(owner)} (${owner})`;
    els.unlock.textContent = `${new Date(Number(unlockTime) * 1000).toLocaleString()} (${unlockTime})`;
    els.balance.textContent = `${ethers.formatEther(balanceWei)} ETH`;
    els.chain.textContent = `${network.chainId}`;

    if (countdownInterval) clearInterval(countdownInterval);
    els.countdown.textContent = formatCountdown(unlockTime);
    countdownInterval = setInterval(() => {
      els.countdown.textContent = formatCountdown(currentUnlock);
    }, 1000);

    els.depositBtn.disabled = false;
    els.withdrawBtn.disabled = false;
    setLog("Contract loaded successfully.");
  } catch (e) {
    setLog(`Load failed: ${e.shortMessage || e.message}`);
  }
}

async function refreshBalance() {
  if (!contract) return;
  const balanceWei = await contract.getBalance();
  els.balance.textContent = `${ethers.formatEther(balanceWei)} ETH`;
}

async function refreshUnlockTime() {
  if (!contract) return;
  const unlockTime = await contract.unlockTime();
  currentUnlock = unlockTime;
  els.unlock.textContent = `${new Date(Number(unlockTime) * 1000).toLocaleString()} (${unlockTime})`;
  els.countdown.textContent = formatCountdown(unlockTime);
}

async function depositEth() {
  if (!contract) {
    setLog("Load contract first.");
    return;
  }

  try {
    const amount = els.depositAmount.value.trim();
    if (!amount || Number(amount) <= 0) {
      setLog("Enter a valid deposit amount.");
      return;
    }

    setLog("Sending deposit transaction...");
    const tx = await contract.deposit({ value: ethers.parseEther(amount) });
    await tx.wait();
    await refreshUnlockTime();
    await refreshBalance();
    setLog(`Deposit successful. Unlock reset to 30 seconds. Tx: ${tx.hash}`);
  } catch (e) {
    setLog(`Deposit failed: ${e.shortMessage || e.message}`);
  }
}

async function withdrawEth() {
  if (!contract) {
    setLog("Load contract first.");
    return;
  }

  try {
    setLog("Sending withdraw transaction...");
    const tx = await contract.withdraw();
    await tx.wait();
    await refreshUnlockTime();
    await refreshBalance();
    setLog(`Withdraw successful. Tx: ${tx.hash}`);
  } catch (e) {
    setLog(`Withdraw failed: ${e.shortMessage || e.message}`);
  }
}

els.connectBtn.addEventListener("click", connectWallet);
els.switchBtn.addEventListener("click", switchToHardhat);
els.loadBtn.addEventListener("click", loadContract);
els.depositBtn.addEventListener("click", depositEth);
els.withdrawBtn.addEventListener("click", withdrawEth);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", connectWallet);
  window.ethereum.on("chainChanged", () => window.location.reload());
}

autoPrefillAddress();
