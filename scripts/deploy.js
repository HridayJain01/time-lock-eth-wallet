const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const currentBlock = await hre.ethers.provider.getBlock("latest");
  const nextBlockTimestamp = currentBlock.timestamp + 1;
  const unlockTime = nextBlockTimestamp + 30;

  await hre.network.provider.send("evm_setNextBlockTimestamp", [nextBlockTimestamp]);
  await hre.network.provider.send("evm_mine");

  const TimeLockWallet = await hre.ethers.getContractFactory("TimeLockWallet");
  const timeLockWallet = await TimeLockWallet.deploy(unlockTime, {
    value: hre.ethers.parseEther("1"),
  });

  await timeLockWallet.waitForDeployment();

  const deploymentData = {
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    contractAddress: timeLockWallet.target,
    deployer: deployer.address,
    unlockTime,
    deployedAt: new Date().toISOString()
  };

  const frontendPath = path.join(__dirname, "..", "frontend");
  fs.mkdirSync(frontendPath, { recursive: true });
  fs.writeFileSync(
    path.join(frontendPath, "deployment.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("Deployer:", deployer.address);
  console.log("Unlock Time:", unlockTime);
  console.log("TimeLockWallet deployed to:", timeLockWallet.target);
  console.log("Deployment file:", "frontend/deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
