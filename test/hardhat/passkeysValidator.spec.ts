import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { utils } from "ethers";
import { ethers } from "hardhat";
import {getECDSAKey, signECDSA} from "./utils/ecdsa";
import {kernelFixture} from "./utils/fixture";
import type { KernelFixture } from "./utils/fixture";
import {faucet} from "./utils/faucet";

describe("PasskeysValidator", function () {
  const { provider } = ethers;
  const abiCoder = utils.defaultAbiCoder;

  let owner: any;
  let minter: any;
  let origin: string;
  let authDataStr: string;
  let authData: string;
  
  let entryPoint: KernelFixture["entryPoint"];
  let getInitCode: KernelFixture["getInitCode"];
  let createKernel: KernelFixture["createKernel"];
  let createECDSAKernel: KernelFixture["createECDSAKernel"];
  let depositEntryPoint: KernelFixture["depositEntryPoint"];
  let fillUserOp: KernelFixture["fillUserOp"];
  let sendUserOp: KernelFixture["sendUserOp"];
  let getKernelAddress: KernelFixture["getKernelAddress"];
  let createEphemeral: KernelFixture["createEphemeral"];
  let setEphemeral: KernelFixture["setEphemeral"];
  let constructNFTMintData: KernelFixture["constructNFTMintData"];

  before (async function () {
    owner = (await ethers.getSigners())[0];
    minter = (await ethers.getSigners())[1];
    origin = "http://localhost:3000";
    authDataStr = "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAA".replace(/-/g, '+').replace(/_/g, '/');
    authData = '0x' + Buffer.from(authDataStr, 'base64').toString('hex');

    ({ 
      entryPoint, 
      getInitCode, 
      createKernel,
      createECDSAKernel, 
      depositEntryPoint, 
      fillUserOp, 
      sendUserOp, 
      getKernelAddress, 
      createEphemeral, 
      setEphemeral, 
      constructNFTMintData, 
    } = await loadFixture(kernelFixture));
  })
  
  it("Should pass passkeys", async function () {
    const { privateKey, publicKey } = getECDSAKey();
    
    await createKernel(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    )
    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);
    await faucet(sender, provider);
  
    const {ops, opHash} = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          ethers.utils.arrayify("0xd5416221"),
          ethers.utils.arrayify("0xffffffff"),
        ])
      ]
    )
    const sigByOwner = await owner.signMessage(utils.arrayify(opHash[0] as any));
    const signByPasskeys = signECDSA(privateKey, opHash[0], origin, authDataStr);
    ops[0].signature = utils.hexConcat([
      '0x00000000',
      sigByOwner,
      signByPasskeys
    ])
    await sendUserOp(ops);
  });

  it("Should pass creating account with initCode", async function () {
    const { privateKey, publicKey } = getECDSAKey();

    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);

    const initCode = getInitCode(
      owner.address,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    const {ops, opHash} = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          ethers.utils.arrayify("0xd5416221"),
          ethers.utils.arrayify("0xffffffff"),
        ])
    ],
      initCode
    )
    const sigByOwner = await owner.signMessage(utils.arrayify(opHash[0] as any));
    const signByPasskeys = signECDSA(privateKey, opHash[0], origin, authDataStr);
    ops[0].signature = utils.hexConcat([
      '0x00000000',
      sigByOwner,
      signByPasskeys
    ])
    await sendUserOp(ops);
  })

  it("Should pass sending value", async function () {
    const { privateKey, publicKey } = getECDSAKey();
    const abiCoder = utils.defaultAbiCoder;

    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);
    await faucet(sender, provider);
    const beforeBalance = await provider.getBalance(sender);

    const initCode = getInitCode(
      owner.address,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    const {ops, opHash} = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          '0x51945447',
          abiCoder
          .encode(
            ['address', 'uint256', 'bytes', 'uint8'],
            [owner.address, utils.parseEther('10'), '0x', 0]
          )
        ])
    ],
      initCode
    )
    const sigByOwner = await owner.signMessage(utils.arrayify(opHash[0] as any));
    const signByPasskeys = signECDSA(privateKey, opHash[0], origin, authDataStr);
    ops[0].signature = utils.hexConcat([
      '0x00000000',
      sigByOwner,
      signByPasskeys
    ])
    await sendUserOp(ops);
    const afterBalance = await provider.getBalance(sender);
    expect(afterBalance).to.eq(beforeBalance.sub(utils.parseEther('10')));
  })

  it("Should pass with multiple ops", async function () {
    const { privateKey, publicKey } = getECDSAKey();

    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);
    await faucet(sender, provider);

    const initCode = getInitCode(
      owner.address,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    const {ops, opHash} = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          ethers.utils.arrayify("0xd5416221"),
          ethers.utils.arrayify("0xffffffff"),
        ]),
        constructNFTMintData(sender)
      ],
      initCode
    )
    const signedOps = await Promise.all(ops.map(async (op, i) => {
      const sigByOwner = await owner.signMessage(utils.arrayify(opHash[i] as any));
      const signByPasskeys = signECDSA(privateKey, opHash[i], origin, authDataStr);
      op.signature = utils.hexConcat([
        '0x00000000',
        sigByOwner,
        signByPasskeys
      ])
      return op;
    }))
    await sendUserOp(signedOps);
  })

  it("Should pass with mint ops", async function () {
    const { privateKey, publicKey } = getECDSAKey();

    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);
    await faucet(sender, provider);

    const minterAccount = await createECDSAKernel(minter);
    if (!minterAccount) throw new Error("minterAccount is null")
    await depositEntryPoint(minterAccount);
    await faucet(minterAccount, provider);

    const initCode = getInitCode(
      owner.address,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    const {ops, opHash} = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          ethers.utils.arrayify("0xd5416221"),
          ethers.utils.arrayify("0xffffffff"),
        ]),
      ],
      initCode
    )
    const {ops: mintOps, opHash: mintOpHash} = await fillUserOp(
      minterAccount,
      [
        constructNFTMintData(sender)
      ]
    )
    const signedMintOps = await Promise.all(mintOps.map(async (op, i) => {
      const sigByOwner = await minter.signMessage(utils.arrayify(mintOpHash[i] as any));
      op.signature = utils.hexConcat([
        '0x00000000',
        sigByOwner,
      ])
      return op;
    }))
    const signedOps = await Promise.all(ops.map(async (op, i) => {
      const sigByOwner = await owner.signMessage(utils.arrayify(opHash[i] as any));
      const signByPasskeys = signECDSA(privateKey, opHash[i], origin, authDataStr);
      op.signature = utils.hexConcat([
        '0x00000000',
        sigByOwner,
        signByPasskeys
      ])
      return op;
    }))
    await sendUserOp([...signedOps, ...signedMintOps])
  })

  it("Should pass ephemeral wallet", async function () {
    const { privateKey, publicKey } = getECDSAKey();

    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);

    const initCode = getInitCode(
      owner.address,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );

    const start = (await ethers.provider.getBlock("latest")).timestamp;
    const end = start + 10000;
    const createEphemeralData = await createEphemeral(start, end);
    const setEphemeralData = setEphemeral(publicKey);
    
    // only sudo mode, create ephemeral wallet, set ephemeral wallet
    const { ops, opHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
        createEphemeralData,
        setEphemeralData
      ],
      initCode
    )
    const signedOps = await Promise.all(opHash.map(async (hash, index) => {
      const sigByOwner = await owner.signMessage(utils.arrayify(hash));
      const sigByPasskeys = signECDSA(privateKey, hash, origin, authDataStr);
      ops[index].signature = utils.hexConcat([
        '0x00000000',
        sigByOwner,
        sigByPasskeys
      ])
      return ops[index];
    }))
    await sendUserOp(signedOps);

    const { ops: passkeyOp, opHash: passkeyOpHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
      ]
    )
    const secondSignByPasskeys = signECDSA(privateKey, passkeyOpHash[0], origin, authDataStr);
    passkeyOp[0].signature = utils.hexConcat([
      '0x00000000',
      secondSignByPasskeys,
      Buffer.from([origin.length]),
      Buffer.from(origin),
      Buffer.from([ethers.utils.arrayify(authData).length]),
      ethers.utils.arrayify(authData)
    ])
    await sendUserOp(passkeyOp);
  })

  it("Should pass sig with 2FA after ephemeral wallet created", async function () {
    const { privateKey, publicKey } = getECDSAKey();

    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);

    const initCode = getInitCode(
      owner.address,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );

    const start = (await ethers.provider.getBlock("latest")).timestamp;
    const end = start + 10000;
    const createEphemeralData = await createEphemeral(start, end);
    const setEphemeralData = setEphemeral(publicKey);
    
    // only sudo mode, create ephemeral wallet, set ephemeral wallet
    const { ops, opHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
        createEphemeralData,
        setEphemeralData
      ],
      initCode
    )
    const signedOps = await Promise.all(opHash.map(async (hash, index) => {
      const sigByOwner = await owner.signMessage(utils.arrayify(hash));
      const sigByPasskeys = signECDSA(privateKey, hash, origin, authDataStr);
      ops[index].signature = utils.hexConcat([
        '0x00000000',
        sigByOwner,
        sigByPasskeys
      ])
      return ops[index];
    }))
    await sendUserOp(signedOps);

    const { ops: passkeyOp, opHash: passkeyOpHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
      ]
    )
    const sigByOwner = await owner.signMessage(utils.arrayify(passkeyOpHash[0]));
    const sigByPasskeys = signECDSA(privateKey, passkeyOpHash[0], origin, authDataStr);
    passkeyOp[0].signature = utils.hexConcat([
      '0x00000000',
      sigByOwner,
      sigByPasskeys
    ])
    await sendUserOp(passkeyOp);
  })

  it("Should revert eoa sig only", async function () {
    const { privateKey, publicKey } = getECDSAKey();

    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);

    const initCode = getInitCode(
      owner.address,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );

    const start = (await ethers.provider.getBlock("latest")).timestamp;
    const end = start + 10000;
    const createEphemeralData = await createEphemeral(start, end);
    const setEphemeralData = setEphemeral(publicKey);
    
    // only sudo mode, create ephemeral wallet, set ephemeral wallet
    const { ops, opHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
        createEphemeralData,
        setEphemeralData
      ],
      initCode
    )
    const signedOps = await Promise.all(opHash.map(async (hash, index) => {
      const sigByOwner = await owner.signMessage(utils.arrayify(hash));
      const sigByPasskeys = signECDSA(privateKey, hash, origin, authDataStr);
      ops[index].signature = utils.hexConcat([
        '0x00000000',
        sigByOwner,
        sigByPasskeys
      ])
      return ops[index];
    }))
    await sendUserOp(signedOps);

    const { ops: passkeyOp, opHash: passkeyOpHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
      ]
    )

    // sign by owner 
    const sigByOwner = await owner.signMessage(utils.arrayify(passkeyOpHash[0]));
    passkeyOp[0].signature = utils.hexConcat([
      '0x00000000',
      sigByOwner,
    ])
    await expect(sendUserOp(passkeyOp)).to.be.revertedWith(
      "FailedOp"
    );
  })

  it("Should revert wrong passkey", async function () {
    const { privateKey, publicKey } = getECDSAKey();
    const { privateKey: anotherPrvkey, publicKey: anotherPubkey } = getECDSAKey();

    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);

    const initCode = getInitCode(
      owner.address,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );

    const start = (await ethers.provider.getBlock("latest")).timestamp;
    const end = start + 10000;
    const createEphemeralData = await createEphemeral(start, end);
    const setEphemeralData = setEphemeral(publicKey);
    
    // only sudo mode, create ephemeral wallet, set ephemeral wallet
    const { ops, opHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
        createEphemeralData,
        setEphemeralData
      ],
      initCode
    )
    const signedOps = await Promise.all(opHash.map(async (hash, index) => {
      const sigByOwner = await owner.signMessage(utils.arrayify(hash));
      const sigByPasskeys = signECDSA(privateKey, hash, origin, authDataStr);
      ops[index].signature = utils.hexConcat([
        '0x00000000',
        sigByOwner,
        sigByPasskeys
      ])
      return ops[index];
    }))
    await sendUserOp(signedOps);

    const { ops: passkeyOp, opHash: passkeyOpHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
      ]
    )

    // sign by owner 
    const sigByPasskeys = signECDSA(anotherPrvkey, passkeyOpHash[0], origin, authDataStr);
    passkeyOp[0].signature = utils.hexConcat([
      '0x00000000',
      sigByPasskeys,
      Buffer.from([origin.length]),
      Buffer.from(origin),
      Buffer.from([ethers.utils.arrayify(authData).length]),
      ethers.utils.arrayify(authData)
    ])
    await expect(sendUserOp(passkeyOp)).to.be.revertedWith(
      "FailedOp"
    );
  })

  it("Should revert passkey after endTime", async function () {
    const { privateKey, publicKey } = getECDSAKey();

    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);

    const initCode = getInitCode(
      owner.address,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );

    const start = (await ethers.provider.getBlock("latest")).timestamp;
    const end = start + 10000;
    const createEphemeralData = await createEphemeral(start, end);
    const setEphemeralData = setEphemeral(publicKey);
    
    // only sudo mode, create ephemeral wallet, set ephemeral wallet
    const { ops, opHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
        createEphemeralData,
        setEphemeralData
      ],
      initCode
    )
    const signedOps = await Promise.all(opHash.map(async (hash, index) => {
      const sigByOwner = await owner.signMessage(utils.arrayify(hash));
      const sigByPasskeys = signECDSA(privateKey, hash, origin, authDataStr);
      ops[index].signature = utils.hexConcat([
        '0x00000000',
        sigByOwner,
        sigByPasskeys
      ])
      return ops[index];
    }))
    await sendUserOp(signedOps);

    const { ops: passkeyOp, opHash: passkeyOpHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
      ]
    )

    // sign by wrong passkey 
    const sigByPasskeys = signECDSA(privateKey, passkeyOpHash[0], origin, authDataStr);
    passkeyOp[0].signature = utils.hexConcat([
      '0x00000000',
      sigByPasskeys,
      Buffer.from([origin.length]),
      Buffer.from(origin),
      Buffer.from([ethers.utils.arrayify(authData).length]),
      ethers.utils.arrayify(authData)
    ])
    await ethers.provider.send("evm_increaseTime", [10001]);
    await expect(sendUserOp(passkeyOp)).to.be.revertedWith(
      "FailedOp"
    );
  })

  it("Should revert passkey before startTime", async function () {
    const { privateKey, publicKey } = getECDSAKey();

    const sender = await getKernelAddress(
      owner,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );
    await depositEntryPoint(sender);

    const initCode = getInitCode(
      owner.address,
      publicKey[0],
      publicKey[1],
      origin,
      authData
    );

    const start = (await ethers.provider.getBlock("latest")).timestamp + 10000;
    const end = start + 10000;
    const createEphemeralData = await createEphemeral(start, end);
    const setEphemeralData = setEphemeral(publicKey);
    
    // only sudo mode, create ephemeral wallet, set ephemeral wallet
    const { ops, opHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
        createEphemeralData,
        setEphemeralData
      ],
      initCode
    )
    const signedOps = await Promise.all(opHash.map(async (hash, index) => {
      const sigByOwner = await owner.signMessage(utils.arrayify(hash));
      const sigByPasskeys = signECDSA(privateKey, hash, origin, authDataStr);
      ops[index].signature = utils.hexConcat([
        '0x00000000',
        sigByOwner,
        sigByPasskeys
      ])
      return ops[index];
    }))
    await sendUserOp(signedOps);

    const { ops: passkeyOp, opHash: passkeyOpHash } = await fillUserOp(
      sender,
      [
        ethers.utils.concat([
          "0xd5416221",
          abiCoder.encode(
            ["bytes4"], 
            ["0xffffffff"]
          )
        ]),
      ]
    )

    // sign by owner 
    const sigByPasskeys = signECDSA(privateKey, passkeyOpHash[0], origin, authDataStr);
    passkeyOp[0].signature = utils.hexConcat([
      '0x00000000',
      sigByPasskeys,
      Buffer.from([origin.length]),
      Buffer.from(origin),
      Buffer.from([ethers.utils.arrayify(authData).length]),
      ethers.utils.arrayify(authData)
    ])
    // await sendUserOp(passkeyOp);
    await expect(sendUserOp(passkeyOp)).to.be.revertedWith('FailedOp');
  })
});