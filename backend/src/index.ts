import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth } from '@clerk/express';
import stripeRoutes from './routes/stripe';
import aiRoutes from './routes/ai';
import mcpRoutes from './routes/mcp';
import governanceRoutes from './routes/governance';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ChittyFinance API v1.2',
    features: [
      'AI-Powered CFO Assistant',
      'Comprehensive Bookkeeping',
      'MCP Orchestration',
      'Financial Reporting',
      'Bank Reconciliation',
      'Compliance Monitoring',
      'LLC Capital Account Management',
      'Multi-Entity Governance',
      'Multi-State Compliance',
      'Inter-Entity Transactions',
      'Consolidated Reporting'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/protected', requireAuth(), (req, res) => {
  res.json({ message: 'This is a protected route', userId: (req as any).auth?.userId });
});

// Core API Routes
app.use('/api/stripe', stripeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/governance', governanceRoutes);

// MCP Feature Information Endpoint
app.get('/api/mcp/features', (_req, res) => {
  res.json({
    orchestration: {
      description: 'Model Control Protocol for orchestrating finance functions',
      capabilities: [
        'Automated bank reconciliation',
        'Financial report generation',
        'Compliance monitoring',
        'Cash flow analysis',
        'Transaction categorization',
        'Month-end close automation'
      ]
    },
    bookkeeping: {
      description: 'Full double-entry bookkeeping system',
      features: [
        'Chart of accounts management',
        'Journal entry automation',
        'Trial balance generation',
        'Financial statement preparation',
        'LLC capital account tracking',
        'Tax compliance monitoring'
      ]
    },
    reporting: {
      description: 'Comprehensive financial reporting',
      reports: [
        'Balance Sheet',
        'Income Statement',
        'Cash Flow Statement',
        'Trial Balance',
        'Aged Receivables',
        'Expense Analysis'
      ]
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ChittyFinance v1.2 backend running on port ${PORT}`);
  console.log(`📊 Features: MCP Orchestration, AI CFO, Bookkeeping, Compliance`);
  console.log(`🏢 Business Types: LLC, Corporation, Sole Proprietorship`);
  console.log(`⚡ Powered by ChittyServices.com`);
});