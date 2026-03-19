import { z } from 'zod';

export const signupSchema = z.object({
    body: z.object({
        ngoName: z.string().min(3, 'NGO name must be at least 3 characters long'),
        email: z.email('Invalid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters long'),
        description: z.string().min(10, 'Description must be at least 10 characters long'),
        regNumber: z.string().optional(),
        phoneNo: z.string().optional(),
        image: z.url('Invalid image URL').optional().or(z.literal('')),
        website: z.url('Invalid website URL').optional().or(z.literal('')),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.email('Invalid email address').optional(),
        password: z.string().min(1, 'Password is required').optional(),
        walletAddress: z.string().optional(),
    }).refine(data => (data.email && data.password) || data.walletAddress, {
        message: 'Either email/password or walletAddress must be provided',
        path: ['email'],
    }),
});

export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
});
