import { Router } from 'express';
import { fetchPosts, createPost, fetchPost } from '../controler/post.controler.js';

const router = Router();
router.get('/', fetchPosts);
router.post('/', createPost);
router.get('/:id', fetchPost);

export default router;
