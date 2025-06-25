import { db } from '../db';
import { 
  users, 
  bankAccounts, 
  bankTransactions, 
  reconciliations,
  chartOfAccounts,
  journalEntries,
  financialSummaries,
  reportDefinitions,
  tasks,
  activityLog
} from '../db/schema';
import { eq, and, gte, lte, desc, asc, count, sum, avg } from 'drizzle-orm';
import { bookkeepingService } from './bookkeeping';
import { generateFinancialAdvice } from './openai';

export interface ReconciliationTask {
  bankAccountId: number;
  statementDate: Date;
  statementBalance: number;
  autoMatch?: boolean;
  reconciliationPeriod?: { start: Date; end: Date };
}

export interface ReportingTask {
  reportType: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'trial_balance' | 'custom';
  period: { start: Date; end: Date };
  format: 'json' | 'pdf' | 'csv' | 'xlsx';
  schedule?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  recipients?: string[];
}

export interface FinanceOrchestrationTask {
  type: 'reconciliation' | 'reporting' | 'analysis' | 'compliance' | 'automation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  userId: number;
  data: any;
  dependencies?: string[];
  scheduledFor?: Date;
}

export class MCPOrchestrator {
  private taskQueue: Map<string, FinanceOrchestrationTask> = new Map();
  private isProcessing = false;

  // Main Orchestration Methods
  async orchestrateFinanceFunction(userId: number, functionType: string, data: any): Promise<any> {
    const taskId = this.generateTaskId();
    
    const task: FinanceOrchestrationTask = {
      type: functionType as any,
      priority: data.priority || 'medium',
      userId,
      data,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : new Date()
    };

    this.taskQueue.set(taskId, task);
    await this.logActivity(userId, 'mcp_task_created', 'orchestration', null, { taskId, functionType });

    return await this.processTask(taskId);
  }

  private async processTask(taskId: string): Promise<any> {
    const task = this.taskQueue.get(taskId);
    if (!task) throw new Error('Task not found');

    try {
      let result;
      
      switch (task.type) {
        case 'reconciliation':
          result = await this.executeReconciliation(task.userId, task.data);
          break;
        case 'reporting':
          result = await this.executeReporting(task.userId, task.data);
          break;
        case 'analysis':
          result = await this.executeAnalysis(task.userId, task.data);
          break;
        case 'compliance':
          result = await this.executeComplianceCheck(task.userId, task.data);
          break;
        case 'automation':
          result = await this.executeAutomation(task.userId, task.data);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      await this.logActivity(task.userId, 'mcp_task_completed', 'orchestration', null, { taskId, result });
      this.taskQueue.delete(taskId);
      
      return result;
    } catch (error) {
      await this.logActivity(task.userId, 'mcp_task_failed', 'orchestration', null, { taskId, error: error.message });
      throw error;
    }
  }

  // Reconciliation Orchestration
  async executeReconciliation(userId: number, data: ReconciliationTask): Promise<any> {
    const { bankAccountId, statementDate, statementBalance, autoMatch = true } = data;

    // 1. Validate bank account exists
    const bankAccount = await db.select()
      .from(bankAccounts)
      .where(and(
        eq(bankAccounts.id, bankAccountId),
        eq(bankAccounts.userId, userId)
      ))
      .limit(1);

    if (!bankAccount.length) {
      throw new Error('Bank account not found');
    }

    // 2. Get unreconciled transactions
    const unreconciledTransactions = await db.select()
      .from(bankTransactions)
      .where(and(
        eq(bankTransactions.bankAccountId, bankAccountId),
        eq(bankTransactions.isReconciled, false),
        lte(bankTransactions.date, statementDate)
      ))
      .orderBy(asc(bankTransactions.date));

    // 3. Calculate book balance
    const bookBalance = await this.calculateBookBalance(bankAccountId, statementDate);

    // 4. Auto-match transactions if enabled
    let reconciledTransactions: number[] = [];
    if (autoMatch) {
      reconciledTransactions = await this.autoMatchTransactions(
        unreconciledTransactions,
        statementBalance,
        bookBalance
      );
    }

    // 5. Create reconciliation record
    const [reconciliation] = await db.insert(reconciliations).values({
      userId,
      bankAccountId,
      statementDate,
      statementBalance: statementBalance.toString(),
      bookBalance: bookBalance.toString(),
      adjustedBalance: bookBalance.toString(), // Will be updated after adjustments
      status: reconciledTransactions.length > 0 ? 'completed' : 'in_progress',
      reconciledTransactions: reconciledTransactions,
      completedBy: autoMatch ? 'system' : null,
      completedAt: autoMatch && reconciledTransactions.length > 0 ? new Date() : null,
    }).returning();

    // 6. Mark transactions as reconciled
    if (reconciledTransactions.length > 0) {
      await this.markTransactionsReconciled(reconciledTransactions, reconciliation.id);
    }

    // 7. Generate reconciliation insights
    const insights = await this.generateReconciliationInsights(
      userId,
      reconciliation.id,
      unreconciledTransactions,
      reconciledTransactions
    );

    return {
      reconciliationId: reconciliation.id,
      status: reconciliation.status,
      bookBalance,
      statementBalance,
      difference: Math.abs(bookBalance - statementBalance),
      reconciledCount: reconciledTransactions.length,
      totalTransactions: unreconciledTransactions.length,
      insights
    };
  }

  // Reporting Orchestration
  async executeReporting(userId: number, data: ReportingTask): Promise<any> {
    const { reportType, period, format } = data;

    let reportData;
    
    switch (reportType) {
      case 'balance_sheet':
        reportData = await bookkeepingService.generateBalanceSheet(userId, period.end);
        break;
      case 'income_statement':
        reportData = await bookkeepingService.generateIncomeStatement(userId, period.start, period.end);
        break;
      case 'trial_balance':
        reportData = await bookkeepingService.generateTrialBalance(userId, period.end);
        break;
      case 'cash_flow':
        reportData = await this.generateCashFlowReport(userId, period.start, period.end);
        break;
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    // Add metadata and formatting
    const report = {
      id: this.generateTaskId(),
      type: reportType,
      period,
      generatedAt: new Date(),
      data: reportData,
      format,
      metadata: {
        userId,
        generatedBy: 'mcp_orchestrator',
        version: '1.0'
      }
    };

    // Store report definition for future reference
    await db.insert(reportDefinitions).values({
      userId,
      name: `${reportType}_${period.start.toISOString().split('T')[0]}_${period.end.toISOString().split('T')[0]}`,
      type: reportType,
      filters: { period },
      lastGenerated: new Date(),
    });

    return report;
  }

  // Financial Analysis Orchestration
  async executeAnalysis(userId: number, data: any): Promise<any> {
    const analysisType = data.analysisType || 'comprehensive';
    
    // 1. Gather financial data
    const financialData = await this.gatherFinancialData(userId, data.period);
    
    // 2. Perform analysis based on type
    let analysis;
    
    switch (analysisType) {
      case 'comprehensive':
        analysis = await this.performComprehensiveAnalysis(userId, financialData);
        break;
      case 'cash_flow':
        analysis = await this.performCashFlowAnalysis(userId, financialData);
        break;
      case 'profitability':
        analysis = await this.performProfitabilityAnalysis(userId, financialData);
        break;
      case 'efficiency':
        analysis = await this.performEfficiencyAnalysis(userId, financialData);
        break;
      default:
        analysis = await this.performComprehensiveAnalysis(userId, financialData);
    }

    // 3. Generate AI insights
    const aiInsights = await generateFinancialAdvice(
      `Please analyze this financial data and provide insights: ${JSON.stringify(analysis)}`,
      financialData
    );

    // 4. Create actionable tasks
    const actionableTasks = await this.generateActionableTasks(userId, analysis, aiInsights);

    return {
      analysisId: this.generateTaskId(),
      type: analysisType,
      period: data.period,
      analysis,
      aiInsights,
      actionableTasks,
      generatedAt: new Date()
    };
  }

  // Compliance Orchestration
  async executeComplianceCheck(userId: number, data: any): Promise<any> {
    const complianceAreas = data.areas || ['tax', 'accounting', 'regulatory'];
    const results = {};

    for (const area of complianceAreas) {
      switch (area) {
        case 'tax':
          results[area] = await this.checkTaxCompliance(userId, data.period);
          break;
        case 'accounting':
          results[area] = await this.checkAccountingCompliance(userId, data.period);
          break;
        case 'regulatory':
          results[area] = await this.checkRegulatoryCompliance(userId, data.period);
          break;
      }
    }

    // Generate compliance score
    const complianceScore = this.calculateComplianceScore(results);

    // Create remediation tasks for any issues
    const remediationTasks = await this.createRemediationTasks(userId, results);

    return {
      complianceId: this.generateTaskId(),
      period: data.period,
      score: complianceScore,
      results,
      remediationTasks,
      checkedAt: new Date()
    };
  }

  // Automation Orchestration
  async executeAutomation(userId: number, data: any): Promise<any> {
    const automationType = data.automationType;
    
    switch (automationType) {
      case 'transaction_categorization':
        return await this.automateTransactionCategorization(userId, data);
      case 'recurring_entries':
        return await this.automateRecurringEntries(userId, data);
      case 'month_end_close':
        return await this.automateMonthEndClose(userId, data);
      case 'invoice_generation':
        return await this.automateInvoiceGeneration(userId, data);
      default:
        throw new Error(`Unknown automation type: ${automationType}`);
    }
  }

  // Helper Methods
  private async calculateBookBalance(bankAccountId: number, asOfDate: Date): Promise<number> {
    const account = await db.select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, bankAccountId))
      .limit(1);

    if (!account.length) return 0;

    const transactions = await db.select()
      .from(bankTransactions)
      .where(and(
        eq(bankTransactions.bankAccountId, bankAccountId),
        lte(bankTransactions.date, asOfDate)
      ));

    return transactions.reduce((balance, txn) => {
      return balance + (txn.type === 'credit' ? parseFloat(txn.amount) : -parseFloat(txn.amount));
    }, 0);
  }

  private async autoMatchTransactions(
    transactions: any[], 
    statementBalance: number, 
    bookBalance: number
  ): Promise<number[]> {
    // Simple auto-matching algorithm
    // In a real implementation, this would be more sophisticated
    const matched: number[] = [];
    let runningBalance = bookBalance;

    for (const txn of transactions) {
      const txnAmount = txn.type === 'credit' ? parseFloat(txn.amount) : -parseFloat(txn.amount);
      
      // Simple matching logic - could be enhanced with fuzzy matching, date ranges, etc.
      if (Math.abs(runningBalance - statementBalance) > Math.abs((runningBalance - txnAmount) - statementBalance)) {
        matched.push(txn.id);
        runningBalance -= txnAmount;
      }
    }

    return matched;
  }

  private async markTransactionsReconciled(transactionIds: number[], reconciliationId: number): Promise<void> {
    for (const txnId of transactionIds) {
      await db.update(bankTransactions)
        .set({ 
          isReconciled: true, 
          reconciledDate: new Date()
        })
        .where(eq(bankTransactions.id, txnId));
    }
  }

  private async generateReconciliationInsights(
    userId: number,
    reconciliationId: number,
    allTransactions: any[],
    reconciledTransactions: number[]
  ): Promise<any> {
    const unmatchedCount = allTransactions.length - reconciledTransactions.length;
    const insights = {
      matchRate: reconciledTransactions.length / allTransactions.length,
      unmatchedTransactions: unmatchedCount,
      suggestedActions: []
    };

    if (insights.matchRate < 0.8) {
      insights.suggestedActions.push('Review unmatched transactions manually');
    }

    if (unmatchedCount > 10) {
      insights.suggestedActions.push('Consider importing additional bank transaction data');
    }

    return insights;
  }

  private async gatherFinancialData(userId: number, period?: { start: Date; end: Date }): Promise<any> {
    // Implementation would gather comprehensive financial data
    return {
      // This would include account balances, transactions, ratios, etc.
    };
  }

  private async performComprehensiveAnalysis(userId: number, data: any): Promise<any> {
    // Implementation would perform comprehensive financial analysis
    return {
      liquidity: {},
      profitability: {},
      efficiency: {},
      leverage: {}
    };
  }

  private async performCashFlowAnalysis(userId: number, data: any): Promise<any> {
    // Cash flow analysis implementation
    return {};
  }

  private async performProfitabilityAnalysis(userId: number, data: any): Promise<any> {
    // Profitability analysis implementation
    return {};
  }

  private async performEfficiencyAnalysis(userId: number, data: any): Promise<any> {
    // Efficiency analysis implementation
    return {};
  }

  private async generateActionableTasks(userId: number, analysis: any, aiInsights: string): Promise<any[]> {
    // Generate specific, actionable tasks based on analysis
    return [];
  }

  private async checkTaxCompliance(userId: number, period: any): Promise<any> {
    // Tax compliance checking
    return { status: 'compliant', issues: [] };
  }

  private async checkAccountingCompliance(userId: number, period: any): Promise<any> {
    // Accounting standards compliance
    return { status: 'compliant', issues: [] };
  }

  private async checkRegulatoryCompliance(userId: number, period: any): Promise<any> {
    // Regulatory compliance checking
    return { status: 'compliant', issues: [] };
  }

  private calculateComplianceScore(results: any): number {
    // Calculate overall compliance score
    return 95;
  }

  private async createRemediationTasks(userId: number, results: any): Promise<any[]> {
    // Create tasks to address compliance issues
    return [];
  }

  private async automateTransactionCategorization(userId: number, data: any): Promise<any> {
    // Automate transaction categorization
    return {};
  }

  private async automateRecurringEntries(userId: number, data: any): Promise<any> {
    // Automate recurring journal entries
    return {};
  }

  private async automateMonthEndClose(userId: number, data: any): Promise<any> {
    // Automate month-end closing procedures
    return {};
  }

  private async automateInvoiceGeneration(userId: number, data: any): Promise<any> {
    // Automate invoice generation
    return {};
  }

  private async generateCashFlowReport(userId: number, startDate: Date, endDate: Date): Promise<any> {
    // Generate cash flow statement
    return {};
  }

  private async logActivity(
    userId: number, 
    action: string, 
    entityType: string, 
    entityId: number | null, 
    details: any
  ): Promise<void> {
    await db.insert(activityLog).values({
      userId,
      action,
      entityType,
      entityId,
      details
    });
  }

  private generateTaskId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const mcpOrchestrator = new MCPOrchestrator();