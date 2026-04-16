const { expect } = require("chai");
const hre = require("hardhat");

const { ethers } = hre;

describe("TimeLockWallet", function () {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const block = await ethers.provider.getBlock("latest");
    const unlockTime = block.timestamp + 3600;

    const TimeLockWallet = await ethers.getContractFactory("TimeLockWallet");
    const wallet = await TimeLockWallet.deploy(unlockTime, {
      value: ethers.parseEther("1"),
    });

    await wallet.waitForDeployment();

    return { wallet, owner, otherAccount, unlockTime };
  }

  it("sets owner and unlock time on deployment", async function () {
    const { wallet, owner, unlockTime } = await deployFixture();

    expect(await wallet.owner()).to.equal(owner.address);
    expect(await wallet.unlockTime()).to.equal(unlockTime);
  });

  it("rejects withdrawals before unlock time", async function () {
    const { wallet } = await deployFixture();

    await expect(wallet.withdraw()).to.be.revertedWith("Funds are locked");
  });

  it("allows only owner to withdraw", async function () {
    const { wallet, otherAccount, unlockTime } = await deployFixture();

    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(wallet.connect(otherAccount).withdraw()).to.be.revertedWith("Not owner");
  });

  it("withdraws full balance after unlock time", async function () {
    const { wallet, owner, unlockTime } = await deployFixture();

    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine", []);

    const before = await ethers.provider.getBalance(owner.address);
    const tx = await wallet.withdraw();
    const receipt = await tx.wait();
    const gasPaid = receipt.gasUsed * receipt.gasPrice;
    const after = await ethers.provider.getBalance(owner.address);

    expect(await wallet.getBalance()).to.equal(0n);
    expect(after).to.equal(before + ethers.parseEther("1") - gasPaid);
  });

  it("accepts direct deposits", async function () {
    const { wallet, otherAccount } = await deployFixture();

    await otherAccount.sendTransaction({
      to: wallet.target,
      value: ethers.parseEther("0.2"),
    });

    expect(await wallet.getBalance()).to.equal(ethers.parseEther("1.2"));
  });
});
