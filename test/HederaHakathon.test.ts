import { expect } from "chai";
import { ethers } from "hardhat";
import { HederaHakathon } from "../typechain-types";

describe("HederaHakathon", function () {
  let hederaHakathon: HederaHakathon;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const HederaHakathonFactory = await ethers.getContractFactory("HederaHakathon");
    hederaHakathon = await HederaHakathonFactory.deploy(owner.address);
    await hederaHakathon.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await hederaHakathon.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await hederaHakathon.name()).to.equal("HederaHakathon");
      expect(await hederaHakathon.symbol()).to.equal("GLT");
    });

    it("Should start with zero total supply", async function () {
      // ERC721 doesn't have totalSupply() by default
      // We can verify by checking that no tokens exist
      await expect(hederaHakathon.ownerOf(0)).to.be.reverted;
    });

    it("Should start with zero balance for all addresses", async function () {
      expect(await hederaHakathon.balanceOf(owner.address)).to.equal(0);
      expect(await hederaHakathon.balanceOf(addr1.address)).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint NFT", async function () {
      const tx = await hederaHakathon.safeMint(addr1.address);
      await expect(tx).to.emit(hederaHakathon, "NFTMinted").withArgs(addr1.address, 0);

      expect(await hederaHakathon.ownerOf(0)).to.equal(addr1.address);
      expect(await hederaHakathon.balanceOf(addr1.address)).to.equal(1);
    });

    it("Should return tokenId when minting", async function () {
      const tokenId = await hederaHakathon.safeMint.staticCall(addr1.address);
      expect(tokenId).to.equal(0);
    });

    it("Should increment tokenId for each mint", async function () {
      await hederaHakathon.safeMint(addr1.address);
      expect(await hederaHakathon.ownerOf(0)).to.equal(addr1.address);

      await hederaHakathon.safeMint(addr2.address);
      expect(await hederaHakathon.ownerOf(1)).to.equal(addr2.address);

      await hederaHakathon.safeMint(owner.address);
      expect(await hederaHakathon.ownerOf(2)).to.equal(owner.address);

      // Verify all tokens exist
      expect(await hederaHakathon.balanceOf(addr1.address)).to.equal(1);
      expect(await hederaHakathon.balanceOf(addr2.address)).to.equal(1);
      expect(await hederaHakathon.balanceOf(owner.address)).to.equal(1);
    });

    it("Should fail if non-owner tries to mint", async function () {
      await expect(
        hederaHakathon.connect(addr1).safeMint(addr1.address)
      ).to.be.revertedWithCustomError(hederaHakathon, "OwnableUnauthorizedAccount");
    });

    it("Should allow minting multiple NFTs to same address", async function () {
      await hederaHakathon.safeMint(addr1.address);
      await hederaHakathon.safeMint(addr1.address);
      await hederaHakathon.safeMint(addr1.address);

      expect(await hederaHakathon.balanceOf(addr1.address)).to.equal(3);
      expect(await hederaHakathon.ownerOf(0)).to.equal(addr1.address);
      expect(await hederaHakathon.ownerOf(1)).to.equal(addr1.address);
      expect(await hederaHakathon.ownerOf(2)).to.equal(addr1.address);
    });

    it("Should emit NFTMinted event with correct parameters", async function () {
      await expect(hederaHakathon.safeMint(addr1.address))
        .to.emit(hederaHakathon, "NFTMinted")
        .withArgs(addr1.address, 0);

      await expect(hederaHakathon.safeMint(addr2.address))
        .to.emit(hederaHakathon, "NFTMinted")
        .withArgs(addr2.address, 1);
    });
  });

  describe("Token Ownership", function () {
    beforeEach(async function () {
      await hederaHakathon.safeMint(addr1.address);
      await hederaHakathon.safeMint(addr2.address);
    });

    it("Should return correct owner for token", async function () {
      expect(await hederaHakathon.ownerOf(0)).to.equal(addr1.address);
      expect(await hederaHakathon.ownerOf(1)).to.equal(addr2.address);
    });

    it("Should return correct token URI (if implemented)", async function () {
      // Note: This contract doesn't implement tokenURI, so this will revert
      // Uncomment if tokenURI is added to the contract
      // expect(await hederaHakathon.tokenURI(0)).to.be.a("string");
    });

    it("Should track token ownership correctly", async function () {
      expect(await hederaHakathon.balanceOf(addr1.address)).to.equal(1);
      expect(await hederaHakathon.balanceOf(addr2.address)).to.equal(1);
    });
  });

  describe("Pause/Unpause", function () {
    beforeEach(async function () {
      await hederaHakathon.safeMint(addr1.address);
    });

    it("Should allow owner to pause contract", async function () {
      await hederaHakathon.pause();
      expect(await hederaHakathon.paused()).to.be.true;
    });

    it("Should allow owner to unpause contract", async function () {
      await hederaHakathon.pause();
      await hederaHakathon.unpause();
      expect(await hederaHakathon.paused()).to.be.false;
    });

    it("Should prevent minting when paused", async function () {
      await hederaHakathon.pause();
      await expect(
        hederaHakathon.safeMint(addr2.address)
      ).to.be.revertedWithCustomError(hederaHakathon, "EnforcedPause");
    });

    it("Should prevent transfers when paused", async function () {
      await hederaHakathon.pause();
      await expect(
        hederaHakathon.connect(addr1).transferFrom(addr1.address, addr2.address, 0)
      ).to.be.revertedWithCustomError(hederaHakathon, "EnforcedPause");
    });

    it("Should allow minting after unpause", async function () {
      await hederaHakathon.pause();
      await hederaHakathon.unpause();
      
      await expect(hederaHakathon.safeMint(addr2.address))
        .to.emit(hederaHakathon, "NFTMinted")
        .withArgs(addr2.address, 1);
    });

    it("Should fail if non-owner tries to pause", async function () {
      await expect(
        hederaHakathon.connect(addr1).pause()
      ).to.be.revertedWithCustomError(hederaHakathon, "OwnableUnauthorizedAccount");
    });

    it("Should fail if non-owner tries to unpause", async function () {
      await hederaHakathon.pause();
      await expect(
        hederaHakathon.connect(addr1).unpause()
      ).to.be.revertedWithCustomError(hederaHakathon, "OwnableUnauthorizedAccount");
    });
  });

  describe("ERC721 Standard Functions", function () {
    beforeEach(async function () {
      await hederaHakathon.safeMint(addr1.address);
    });

    it("Should support ERC721 interface", async function () {
      // ERC721 interface ID: 0x80ac58cd
      expect(await hederaHakathon.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should support ERC165 interface", async function () {
      // ERC165 interface ID: 0x01ffc9a7
      expect(await hederaHakathon.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("Should allow owner to approve spender", async function () {
      await hederaHakathon.connect(addr1).approve(addr2.address, 0);
      expect(await hederaHakathon.getApproved(0)).to.equal(addr2.address);
    });

    it("Should allow owner to transfer token", async function () {
      await hederaHakathon.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      expect(await hederaHakathon.ownerOf(0)).to.equal(addr2.address);
      expect(await hederaHakathon.balanceOf(addr1.address)).to.equal(0);
      expect(await hederaHakathon.balanceOf(addr2.address)).to.equal(1);
    });

    it("Should allow approved spender to transfer token", async function () {
      await hederaHakathon.connect(addr1).approve(addr2.address, 0);
      await hederaHakathon.connect(addr2).transferFrom(addr1.address, addr2.address, 0);
      expect(await hederaHakathon.ownerOf(0)).to.equal(addr2.address);
    });

    it("Should fail if non-owner tries to transfer", async function () {
      await expect(
        hederaHakathon.connect(addr2).transferFrom(addr1.address, addr2.address, 0)
      ).to.be.revertedWithCustomError(hederaHakathon, "ERC721InsufficientApproval");
    });
  });
});

