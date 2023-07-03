import { ethers } from "hardhat";

export const kernelFixture = async () => {
  const beneficiary = (await ethers.getSigners())[0];

  const EntryPointFactory = await ethers.getContractFactory("EntryPoint");
  const KernelFacFactory = await ethers.getContractFactory("KernelFactory");
  const PasskeysValidatorFactory = await ethers.getContractFactory(
    "TwoFAPasskeysValidator"
  );
  const ephemeralValidatorFactory = await ethers.getContractFactory(
    "EphemeralPasskeysValidator"
  )

  const entryPoint = await EntryPointFactory.deploy();
  const factory = await KernelFacFactory.deploy(entryPoint.address);
  const validator = await PasskeysValidatorFactory.deploy();  
  const ephemeralPasskeys = await ephemeralValidatorFactory.deploy();
  let kernel = '';

  const createKernel = async (
    owner: any, 
    passkeysPubX: string, 
    passkeysPubY: string,
    origin: string,
    authData: string
  ) => {
    const _data = ethers.utils.concat([
        ethers.utils.arrayify(owner.address),
        ethers.utils.arrayify(passkeysPubX),
        ethers.utils.arrayify(passkeysPubY),
        Buffer.from([origin.length]),
        Buffer.from(origin),
        Buffer.from([ethers.utils.arrayify(authData).length]),
        ethers.utils.arrayify(authData)
    ]);
    const createTx = await factory.connect(owner).createAccount(
      validator.address,
      _data,
      0
    );
    const res = await createTx.wait();
    const event = res.events?.find((e: any) => e.eventSignature === "AccountCreated(address,address,bytes,uint256)");
    if (event?.topics[1]) {
      kernel = '0x' + event?.topics[1]?.slice(26,)
    }
  }

  const getInitCode = (
    owner: string,
    passkeysPubX: string,
    passkeysPubY: string,
    origin: string,
    authData: string,
  ) => {
    const abiCoder = ethers.utils.defaultAbiCoder;
    const createAccountData = ethers.utils.concat([
      ethers.utils.arrayify(owner),
      ethers.utils.arrayify(passkeysPubX),
      ethers.utils.arrayify(passkeysPubY),
      Buffer.from([origin.length]),
      Buffer.from(origin),
      Buffer.from([ethers.utils.arrayify(authData).length]),
      ethers.utils.arrayify(authData)
    ]);

    return ethers.utils.solidityPack(
      ['address', 'bytes'],
      [
        factory.address,
        '0x296601cd' +
          abiCoder
            .encode(
              ['address', 'bytes', 'uint256'],
              [validator.address, ethers.utils.hexlify(createAccountData), 0]
            )
            .slice(2),
      ]
    );
  }

  const fillUserOp = async (sender: string, data: Uint8Array[], initCode?: string) => {
    const nonce = Number(await entryPoint.getNonce(sender, 0));
    const ops = data.map((d, index) => ({ 
      initCode: index === 0 && initCode ? initCode : '0x',
      sender,
      nonce: nonce + index,
      callData: d,
      callGasLimit: 10000000,
      verificationGasLimit: 10000000,
      preVerificationGas: 5000000,
      maxFeePerGas: 5000000,
      maxPriorityFeePerGas: 100000,
      signature: '0x',
      paymasterAndData: '0x',
    }));
    const opHash = await Promise.all(ops.map(async (op) => await entryPoint.getUserOpHash(op)));
    return { ops, opHash };
  }

  const sendUserOp = async (ops: any) => {
    const sendRes = await entryPoint.handleOps(ops, beneficiary.address);
    await sendRes.wait();
  }

  const depositEntryPoint = async (staker: any) => {
    await entryPoint.depositTo(staker, { value: "1000000000000000000" });
  }

  const getKernelAddress = async (
    owner: any, 
    passkeysPubX: string, 
    passkeysPubY: string,
    origin: string,
    authData: string
  ) => {
    const _data = ethers.utils.concat([
      ethers.utils.arrayify(owner.address),
      ethers.utils.arrayify(passkeysPubX),
      ethers.utils.arrayify(passkeysPubY),
      Buffer.from([origin.length]),
      Buffer.from(origin),
      Buffer.from([ethers.utils.arrayify(authData).length]),
      ethers.utils.arrayify(authData)
    ]);
    const account = await factory.connect(owner).getAccountAddress(
      validator.address,
      _data,
      0
    );
    return account;
  }

  const createEphemeral = async (startTime: number, endTime: number) => {
    const abiCoder = ethers.utils.defaultAbiCoder;
    const data = ethers.utils.concat([
      "0x51945447" + 
      abiCoder.encode(
        ["address", "uint256", "bytes", "uint8"],
        [
          validator.address,
          0,
          "0x53efdd38" + abiCoder.encode(
            ["bytes"],
            [
              ethers.utils.solidityPack(
                ["address", "uint48", "uint48"],
                [ephemeralPasskeys.address, startTime, endTime]
              )
            ]
          ).slice(2),
          0
        ]
      ).slice(2)
    ]);
    return data;
  }

  const setEphemeral = (publicKey: string[]) => {
    const abiCoder = ethers.utils.defaultAbiCoder;
    const data = ethers.utils.concat([
      "0x51945447" + 
      abiCoder.encode(
        ["address", "uint256", "bytes", "uint8"],
        [
          ephemeralPasskeys.address,
          0,
          "0x0c959556" + abiCoder.encode(
            ["bytes"],
            [
              ethers.utils.solidityPack(
                ["uint256", "uint256"],
                [publicKey[0], publicKey[1]]
              )
            ]
          ).slice(2),
          0
        ]
      ).slice(2)
    ]);
    return data;
  }

  return {
    entryPoint,
    getInitCode,
    createKernel,
    depositEntryPoint,
    fillUserOp,
    sendUserOp,
    getKernelAddress,
    createEphemeral,
    setEphemeral,
  }
}

export type KernelFixture = Awaited<ReturnType<typeof kernelFixture>>;