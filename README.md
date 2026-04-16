# Time-Lock Wallet (Hardhat Local)

A minimal Time-Lock Wallet smart contract project using Hardhat.

## What this project includes

- Solidity contract: `contracts/TimeLockWallet.sol`
- Deployment script: `scripts/deploy.js`
- Test suite: `test/TimeLockWallet.js`
- Hardhat config: `hardhat.config.js`

## Prerequisites

- Node.js 22.x LTS (recommended)
- npm
- MetaMask (optional for UI interactions)

> You are currently on Node.js 25, and Hardhat shows a warning. It may still run, but Node 22 LTS is recommended for stability.

## Step-by-step setup

1. Install dependencies

```bash
npm install
```

2. Compile contracts

```bash
npm run compile
```

3. Run tests

```bash
npm test
```

4. Start local blockchain in terminal 1

```bash
npm run node
```

5. Deploy to local blockchain in terminal 2

```bash
npm run deploy:local
```

You will see:
- deployer address
- unlock time (Unix timestamp)
- deployed contract address

Deployment metadata is also written to `frontend/deployment.json` for the browser demo.

## MetaMask demo run (for presentation)

1. Keep Hardhat local node running in terminal 1:

```bash
npm run node
```

2. Deploy in terminal 2:

```bash
npm run deploy:local
```

3. Serve demo UI in terminal 3:

```bash
npm run demo:serve
```

4. Open in browser:

```text
http://127.0.0.1:4173
```

5. In MetaMask, add/switch to Hardhat local network:
  - RPC URL: `http://127.0.0.1:8545`
  - Chain ID: `31337`
  - Currency symbol: `ETH`

6. Import Hardhat account #0 private key into MetaMask (demo only):

```text
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

7. On the page:
  - Click "Connect MetaMask"
  - Click "Switch to Hardhat 31337"
  - Click "Load Contract" (address auto-filled from deployment.json)
  - Click "Deposit" to add ETH
  - Click "Withdraw" after unlock time

8. For faster demo, skip waiting by moving time in Hardhat console:

```bash
npx hardhat console --network localhost
```

```javascript
const addr = "PASTE_DEPLOYED_CONTRACT_ADDRESS";
const wallet = await ethers.getContractAt("TimeLockWallet", addr);
const unlock = await wallet.unlockTime();
await network.provider.send("evm_setNextBlockTimestamp", [Number(unlock) + 1]);
await network.provider.send("evm_mine");
```

## Interact using Hardhat console

With local node running:

```bash
npx hardhat console --network localhost
```

Then run:

```javascript
const [owner] = await ethers.getSigners();
const addr = "PASTE_DEPLOYED_CONTRACT_ADDRESS";
const wallet = await ethers.getContractAt("TimeLockWallet", addr);

(await wallet.getBalance()).toString();
(await wallet.unlockTime()).toString();
```

Deposit ETH:

```javascript
await owner.sendTransaction({ to: addr, value: ethers.parseEther("0.1") });
(await wallet.getBalance()).toString();
```

Withdraw (only after unlock):

```javascript
await wallet.withdraw();
```

## Fast local testing of time-lock

If you do not want to wait for real time, move chain time forward in console:

```javascript
const unlock = await wallet.unlockTime();
await network.provider.send("evm_setNextBlockTimestamp", [Number(unlock) + 1]);
await network.provider.send("evm_mine");
await wallet.withdraw();
```

## Contract behavior

- Constructor sets:
  - `owner`
  - `unlockTime` (must be in future)
- Accepts ETH via:
  - `receive()`
  - `deposit()`
- `withdraw()` checks:
  - caller is owner
  - current block time >= unlock time
- Emits events:
  - `Deposited`
  - `Withdrawn`
