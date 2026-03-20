import { Router } from 'express';
import { asyncHandler } from '../../util/asyncHandler.util.js';
import { verifyJWT } from '../../midelware/verify.midelware.js';
import { getNotifications, markAllAsRead, markOneAsRead, getUnreadCount } from '../../controler/v2/notifications.controller.js';

const router = Router();

router.get('/', verifyJWT, asyncHandler(getNotifications));
router.patch('/read-all', verifyJWT, asyncHandler(markAllAsRead));
router.patch('/:id/read', verifyJWT, asyncHandler(markOneAsRead));
router.get('/unread-count', verifyJWT, asyncHandler(getUnreadCount));

export default router;
