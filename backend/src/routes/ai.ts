import { Router } from 'express';
import { requireAuth } from '@clerk/express';
import { db } from '../db';
import { users, aiMessages, financialSummaries, transactions } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateFinancialAdvice, analyzeTransaction } from '../services/openai';

const router = Router();

router.post('/financial-advice', requireAuth(), async (req, res) => {
  try {
    const { question } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId || !question) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const financialSummary = await db.select()
      .from(financialSummaries)
      .where(eq(financialSummaries.userId, user[0].id))
      .orderBy(desc(financialSummaries.createdAt))
      .limit(1);

    const recentTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.userId, user[0].id))
      .orderBy(desc(transactions.date))
      .limit(10);

    const financialData = {
      summary: financialSummary[0] || null,
      recentTransactions: recentTransactions,
    };

    const advice = await generateFinancialAdvice(question, financialData);

    await db.insert(aiMessages).values([
      {
        userId: user[0].id,
        role: 'user',
        content: question,
      },
      {
        userId: user[0].id,
        role: 'assistant',
        content: advice,
      },
    ]);

    res.json({ advice });
  } catch (error) {
    console.error('AI advice error:', error);
    res.status(500).json({ error: 'Failed to generate financial advice' });
  }
});

router.get('/chat-history', requireAuth(), async (req, res) => {
  try {
    const userId = (req as any).auth?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const messages = await db.select()
      .from(aiMessages)
      .where(eq(aiMessages.userId, user[0].id))
      .orderBy(desc(aiMessages.createdAt))
      .limit(50);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

router.post('/analyze-transaction', requireAuth(), async (req, res) => {
  try {
    const { description, amount } = req.body;

    if (!description || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const analysis = await analyzeTransaction(description, amount);
    res.json(analysis);
  } catch (error) {
    console.error('Transaction analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze transaction' });
  }
});

export default router;