import elliptic from "elliptic";
import {ethers, utils} from "ethers";

export const getECDSAKey = () => {
  const ec = new elliptic.ec('p256');
  const passkeys = ec.genKeyPair();
  const publicKey = [
    '0x' + passkeys.getPublic().getX().toString('hex').padStart(64, '0'),
    '0x' + passkeys.getPublic().getY().toString('hex').padStart(64, '0')
  ]

  return {
    privateKey: passkeys,
    publicKey: publicKey
  }
}

export const signECDSA = (
  privateKey: any, 
  message: string, 
  origin: string,
  authDataStr: string
) => {
  const clientData = {
    type: 'webauthn.get',
    challenge: utils.hashMessage(utils.arrayify(message as any)).slice(2,), // message, // utils.arrayify(message as any),
    origin: origin,
    crossOrigin: false
  };
  const authDataBuffer = Buffer.from(authDataStr, 'base64');
  const clientString = Buffer.from(JSON.stringify(clientData))
  const clientDataHash = ethers.utils.sha256(clientString);
  const signatureBase = Buffer.concat([authDataBuffer, ethers.utils.arrayify(clientDataHash)]);
  const signatureBaseHash = ethers.utils.sha256(signatureBase).slice(2,);

  const signByPasskeys = privateKey.sign(signatureBaseHash);
  const r = signByPasskeys.r.toString('hex').padStart(64, '0');
  const s = signByPasskeys.s.toString('hex').padStart(64, '0');
  return '0x' + r + s;
}