import { Router } from 'express';
import { requireAuth } from '@clerk/express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { mcpOrchestrator } from '../services/mcp-orchestrator';
import { bookkeepingService } from '../services/bookkeeping';

const router = Router();

// MCP Orchestration Endpoints
router.post('/orchestrate', requireAuth(), async (req, res) => {
  try {
    const { functionType, data } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId || !functionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await mcpOrchestrator.orchestrateFinanceFunction(
      user[0].id,
      functionType,
      data
    );

    res.json({ success: true, result });
  } catch (error) {
    console.error('MCP orchestration error:', error);
    res.status(500).json({ error: 'Failed to orchestrate finance function' });
  }
});

// Reconciliation Endpoints
router.post('/reconciliation/start', requireAuth(), async (req, res) => {
  try {
    const { bankAccountId, statementDate, statementBalance, autoMatch } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId || !bankAccountId || !statementDate || statementBalance === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await mcpOrchestrator.orchestrateFinanceFunction(
      user[0].id,
      'reconciliation',
      {
        bankAccountId,
        statementDate: new Date(statementDate),
        statementBalance,
        autoMatch: autoMatch !== false
      }
    );

    res.json({ success: true, reconciliation: result });
  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ error: 'Failed to start reconciliation' });
  }
});

router.get('/reconciliation/status/:reconciliationId', requireAuth(), async (req, res) => {
  try {
    const { reconciliationId } = req.params;
    const userId = (req as any).auth?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Implementation would fetch reconciliation status
    res.json({ 
      reconciliationId,
      status: 'in_progress',
      progress: 75,
      matchedTransactions: 15,
      totalTransactions: 20
    });
  } catch (error) {
    console.error('Reconciliation status error:', error);
    res.status(500).json({ error: 'Failed to get reconciliation status' });
  }
});

// Reporting Endpoints
router.post('/reports/generate', requireAuth(), async (req, res) => {
  try {
    const { reportType, period, format = 'json' } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId || !reportType || !period) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await mcpOrchestrator.orchestrateFinanceFunction(
      user[0].id,
      'reporting',
      {
        reportType,
        period: {
          start: new Date(period.start),
          end: new Date(period.end)
        },
        format
      }
    );

    res.json({ success: true, report: result });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/reports/templates', requireAuth(), async (req, res) => {
  try {
    const templates = [
      {
        id: 'balance_sheet',
        name: 'Balance Sheet',
        description: 'Statement of financial position',
        category: 'financial_statements'
      },
      {
        id: 'income_statement',
        name: 'Income Statement',
        description: 'Profit and loss statement',
        category: 'financial_statements'
      },
      {
        id: 'cash_flow',
        name: 'Cash Flow Statement',
        description: 'Statement of cash flows',
        category: 'financial_statements'
      },
      {
        id: 'trial_balance',
        name: 'Trial Balance',
        description: 'List of all accounts with balances',
        category: 'working_papers'
      },
      {
        id: 'aged_receivables',
        name: 'Aged Receivables',
        description: 'Outstanding customer invoices by age',
        category: 'management_reports'
      },
      {
        id: 'expense_analysis',
        name: 'Expense Analysis',
        description: 'Detailed breakdown of expenses',
        category: 'management_reports'
      }
    ];

    res.json({ templates });
  } catch (error) {
    console.error('Report templates error:', error);
    res.status(500).json({ error: 'Failed to get report templates' });
  }
});

// Financial Analysis Endpoints
router.post('/analysis/comprehensive', requireAuth(), async (req, res) => {
  try {
    const { period, includeProjections = false } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await mcpOrchestrator.orchestrateFinanceFunction(
      user[0].id,
      'analysis',
      {
        analysisType: 'comprehensive',
        period: period ? {
          start: new Date(period.start),
          end: new Date(period.end)
        } : undefined,
        includeProjections
      }
    );

    res.json({ success: true, analysis: result });
  } catch (error) {
    console.error('Comprehensive analysis error:', error);
    res.status(500).json({ error: 'Failed to perform comprehensive analysis' });
  }
});

router.post('/analysis/cash-flow', requireAuth(), async (req, res) => {
  try {
    const { period, projectionMonths = 6 } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await mcpOrchestrator.orchestrateFinanceFunction(
      user[0].id,
      'analysis',
      {
        analysisType: 'cash_flow',
        period: period ? {
          start: new Date(period.start),
          end: new Date(period.end)
        } : undefined,
        projectionMonths
      }
    );

    res.json({ success: true, analysis: result });
  } catch (error) {
    console.error('Cash flow analysis error:', error);
    res.status(500).json({ error: 'Failed to perform cash flow analysis' });
  }
});

// Compliance Endpoints
router.post('/compliance/check', requireAuth(), async (req, res) => {
  try {
    const { areas = ['tax', 'accounting', 'regulatory'], period } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await mcpOrchestrator.orchestrateFinanceFunction(
      user[0].id,
      'compliance',
      {
        areas,
        period: period ? {
          start: new Date(period.start),
          end: new Date(period.end)
        } : undefined
      }
    );

    res.json({ success: true, compliance: result });
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: 'Failed to perform compliance check' });
  }
});

// Automation Endpoints
router.post('/automation/configure', requireAuth(), async (req, res) => {
  try {
    const { automationType, settings, schedule } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId || !automationType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await mcpOrchestrator.orchestrateFinanceFunction(
      user[0].id,
      'automation',
      {
        automationType,
        settings,
        schedule
      }
    );

    res.json({ success: true, automation: result });
  } catch (error) {
    console.error('Automation configuration error:', error);
    res.status(500).json({ error: 'Failed to configure automation' });
  }
});

router.post('/automation/execute', requireAuth(), async (req, res) => {
  try {
    const { automationType, data } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId || !automationType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await mcpOrchestrator.orchestrateFinanceFunction(
      user[0].id,
      'automation',
      {
        automationType,
        ...data
      }
    );

    res.json({ success: true, result });
  } catch (error) {
    console.error('Automation execution error:', error);
    res.status(500).json({ error: 'Failed to execute automation' });
  }
});

// Bookkeeping Integration Endpoints
router.post('/bookkeeping/initialize-chart', requireAuth(), async (req, res) => {
  try {
    const { businessType = 'llc' } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    await bookkeepingService.initializeChartOfAccounts(user[0].id, businessType);

    res.json({ success: true, message: 'Chart of accounts initialized' });
  } catch (error) {
    console.error('Chart of accounts initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize chart of accounts' });
  }
});

router.post('/bookkeeping/journal-entry', requireAuth(), async (req, res) => {
  try {
    const { date, description, reference, projectId, lines } = req.body;
    const userId = (req as any).auth?.userId;

    if (!userId || !date || !description || !lines) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const journalEntryId = await bookkeepingService.createJournalEntry(user[0].id, {
      date: new Date(date),
      description,
      reference,
      projectId,
      lines
    });

    res.json({ success: true, journalEntryId });
  } catch (error) {
    console.error('Journal entry creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create journal entry' });
  }
});

router.get('/bookkeeping/trial-balance', requireAuth(), async (req, res) => {
  try {
    const { asOfDate = new Date().toISOString() } = req.query;
    const userId = (req as any).auth?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const trialBalance = await bookkeepingService.generateTrialBalance(
      user[0].id,
      new Date(asOfDate as string)
    );

    res.json({ success: true, trialBalance, asOfDate });
  } catch (error) {
    console.error('Trial balance error:', error);
    res.status(500).json({ error: 'Failed to generate trial balance' });
  }
});

export default router;