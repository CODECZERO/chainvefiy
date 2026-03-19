import { z } from 'zod';

export const createPostSchema = z.object({
    body: z.object({
        Title: z.string().min(3, 'Title must be at least 3 characters long').max(100, 'Title cannot exceed 100 characters'),
        Type: z.string().min(2, 'Type is required'),
        Description: z.string().min(10, 'Description must be at least 10 characters long'),
        Location: z.string().min(2, 'Location is required'),
        ImgCid: z.string().optional(),
        NeedAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
            message: 'NeedAmount must be a positive number string',
        }),
        Status: z.enum(['Active', 'Completed', 'Failed']).optional(),
        DangerLevel: z.enum(['Low', 'Medium', 'High', 'Extreme']).optional(),
    }),
});
