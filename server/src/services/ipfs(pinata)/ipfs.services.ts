import { PinataSDK } from 'pinata';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.PINATA_JWT) {
  throw new Error('PINATA_JWT is not defined in environment variables');
}
if (!process.env.PINATA_GATEWAY) {
  throw new Error('PINATA_GATEWAY is not defined in environment variables');
}

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

const retriveFromIpfs = async (cid: string) => {
  try {
    const data = await pinata.gateways.public.get(cid);
    if (!data) throw new Error('Something went wrong while retrieving data from IPFS');
    return {
      success: true,
      data,
      cid,
    };
  } catch (error) {
    return {
      success: false,
      error,
      cid,
    };
  }
};

const uploadOnIpfs = async (data: Object) => {
  try {
    const uploadData = await pinata.upload.public.json(data);
    if (!uploadData) throw new Error('Something went wrong while uploading data to IPFS');
    return {
      success: true,
      cid: uploadData.cid,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
};

const uploadOnIpfsBill = async (data: Express.Multer.File) => {
  try {
    // Check if file exists before reading
    if (!fs.existsSync(data.path)) {
      throw new Error(`File not found at path: ${data.path}`);
    }
    const fileBuffer = fs.readFileSync(data.path);

    const file = new File([fileBuffer], data.originalname, { type: data.mimetype });

    const uploadData = await pinata.upload.public.file(file);

    if (!uploadData || !uploadData.cid) {
      throw new Error('No CID returned from Pinata');
    }

    // Clean up the uploaded file from local storage
    try {
      fs.unlinkSync(data.path);
      console.log('🗑️ Cleaned up local file');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup local file:', cleanupError);
    }

    return {
      success: true,
      cid: uploadData.cid,
    };
  } catch (error: any) {
    console.error('❌ IPFS upload error:', error.message);
    return {
      success: false,
      error: error.message || error,
    };
  }
};

const deleteIpfsData = async (cid: string[]) => {
  try {
    const dataDelet = await pinata.files.public.delete(cid);
    if (!dataDelet) throw new Error('Something went wrong while deleting data from IPFS');
    return {
      success: true,
      cid,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
};

export { retriveFromIpfs, uploadOnIpfs, deleteIpfsData, uploadOnIpfsBill };
