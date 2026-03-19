import { CID } from 'multiformats';
import { PinataSDK } from 'pinata';
import dotenv from 'dotenv';
dotenv.config();

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

const isValidCid = async (cid: string) => {
  try {
    CID.parse(cid);
    return true;
  } catch (error) {
    return false;
  }
};

const ImgFormater = async (cid: string): Promise<string> => {
  try {
    if (!cid) {
      return '';
    }

    if (cid.startsWith('http')) {
      return cid;
    }

    // Generate a signed URL for the CID
    // Safety check for valid JWT (mock/placeholder check)
    if (!process.env.PINATA_JWT || process.env.PINATA_JWT === 'mock_jwt_for_internal_testing') {
      return `https://${process.env.PINATA_GATEWAY}/ipfs/${cid}`;
    }

    const signedUrl = await pinata.gateways.private.createAccessLink({
      cid: cid,
      expires: 3600, // 1 hour
    });

    return signedUrl;
  } catch (error) {
    console.error('Error formatting image URL:', error);
    // Fallback to public gateway if signing fails
    return `https://${process.env.PINATA_GATEWAY}/ipfs/${cid}`;
  }
};

export { isValidCid, ImgFormater };
