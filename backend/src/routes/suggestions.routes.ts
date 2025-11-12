/**
 * Suggestions Routes - AI-powered PRO recommendations
 * 
 * Endpoints:
 * - GET /suggestions/:userId - Get personalized suggestions
 * - GET /suggestions/similar/:proId - Get similar PROs
 * - POST /suggestions/feedback - Record user feedback
 */

import { Router, Request, Response } from 'express';

import { logger } from '../logger';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getSuggestionsForUser,
  getSimilarPros,
  recordSuggestionFeedback,
} from '../services/ai-suggestion.service';

const router = Router();

/**
 * GET /suggestions/:userId
 * Get personalized PRO suggestions for a user
 * 
 * Query params:
 * - limit: number (default: 5)
 * 
 * Returns: Array of PRO suggestions with scores
 */
router.get('/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const limit = parseInt(req.query.limit as string) || 5;

    // Verify user is requesting their own suggestions or is admin
    if (req.user?.uid !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const suggestions = await getSuggestionsForUser(userId, limit);

    res.json({
      ok: true,
      suggestions,
      count: suggestions.length,
    });

  } catch (error: any) {
    logger.error({ error: error.message }, 'Suggestions query failed');
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});

/**
 * GET /suggestions/similar/:proId
 * Get similar PROs (for recommendation section)
 * 
 * Query params:
 * - limit: number (default: 3)
 * 
 * Returns: Array of similar PROs
 */
router.get('/similar/:proId', async (req: Request, res: Response) => {
  try {
    const proId = req.params.proId;
    const limit = parseInt(req.query.limit as string) || 3;

    const similarPros = await getSimilarPros(proId, limit);

    res.json({
      ok: true,
      similar: similarPros,
      count: similarPros.length,
    });

  } catch (error: any) {
    logger.error({ error: error.message }, 'Similar PROs query failed');
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});

/**
 * POST /suggestions/feedback
 * Record user feedback on suggestions (for ML improvement)
 * 
 * Body:
 * - userId: string
 * - proId: string
 * - action: 'viewed' | 'booked' | 'dismissed'
 * 
 * Returns: Success confirmation
 */
router.post('/feedback', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, proId, action } = req.body;

    if (!userId || !proId || !action) {
      return res.status(400).json({
        error: 'Missing required fields: userId, proId, action',
      });
    }

    if (!['viewed', 'booked', 'dismissed'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action. Must be: viewed, booked, or dismissed',
      });
    }

    // Verify user is providing feedback for themselves or is admin
    if (req.user?.uid !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    await recordSuggestionFeedback(userId, proId, action);

    res.json({
      ok: true,
      message: 'Feedback recorded successfully',
    });

  } catch (error: any) {
    logger.error({ error: error.message }, 'Feedback recording failed');
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }
});

export default router;
