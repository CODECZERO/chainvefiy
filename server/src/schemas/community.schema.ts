import { z } from 'zod';

export const voteOnTaskSchema = z.object({
    body: z.object({
        taskId: z.string().min(1, 'Task ID is required'),
        voterWallet: z.string().min(1, 'Voter wallet is required'),
        isScam: z.boolean(),
        reason: z.string().optional(),
    }),
});

export const submitProofSchema = z.object({
    body: z.object({
        supplierId: z.string().min(1, 'NGO ID is required'),
        taskId: z.string().min(1, 'Task ID is required'),
        proofCid: z.string().min(1, 'Proof CID is required'),
        description: z.string().optional(),
        submitterWallet: z.string().min(1, 'Submitter wallet is required'),
        transactionHash: z.string().optional(),
    }),
});

export const voteOnProofSchema = z.object({
    params: z.object({
        proofId: z.string().min(1, 'Proof ID is required'),
    }),
    body: z.object({
        taskId: z.string().min(1, 'Task ID is required'),
        voter: z.string().min(1, 'Voter wallet is required'),
        isScam: z.boolean(),
    }),
});
