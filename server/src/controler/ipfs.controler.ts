import { Response, Request } from 'express';
import AsyncHandler from '../util/asyncHandler.util.js';
import { uploadOnIpfsBill, uploadOnIpfs } from '../services/ipfs(pinata)/ipfs.services.js';
import { ApiError } from '../util/apiError.util.js';
import { ApiResponse } from '../util/apiResponse.util.js';

interface RequestBill extends Request {
  bill?: Express.Multer.File;
}

interface BillData {}

const UploadFileOnIpfs = AsyncHandler(async (req: RequestBill, res: Response) => {
  const file = req.file;
  console.log('📤 File upload request received:', file?.originalname);

  if (!file) throw new ApiError(400, 'Please provide img');

  const uploadOnIpfsFile = await uploadOnIpfsBill(file);
  console.log('📦 IPFS upload result:', uploadOnIpfsFile);

  if (!uploadOnIpfsFile || !uploadOnIpfsFile.success) {
    const errorMessage =
      uploadOnIpfsFile?.error || 'something went wrong while uploading file on ipfs';
    console.error('❌ IPFS upload failed:', errorMessage);
    throw new ApiError(500, errorMessage);
  }

  console.log('✅ File uploaded to IPFS successfully:', uploadOnIpfsFile.cid);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        cid: uploadOnIpfsFile.cid,
        success: true,
      },
      'file uploaded'
    )
  );
});

// const UploadDataOnIpfs=AsyncHandler(async(req:Request,res:Response)=>{
//     const data:BillData=req.body;
//     if(!data) throw new ApiError(400,"Invalid data");
//     const Upload=await uploadOnIpfs(data);
//     if(!Upload) throw new ApiError(500,`something went wrong while Uploading data ${Upload}`);
//     return res.status(200).json(new ApiResponse(200,Upload,"uploadJson"));
// });

export { UploadFileOnIpfs };
