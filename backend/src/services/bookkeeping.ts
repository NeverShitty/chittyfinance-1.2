import { db } from '../db';
import { 
  chartOfAccounts, 
  journalEntries, 
  journalEntryLines, 
  bankAccounts, 
  bankTransactions,
  financialSummaries,
  transactions,
  users 
} from '../db/schema';
import { eq, sum, and, gte, lte, desc, asc, count } from 'drizzle-orm';
import { generateFinancialAdvice } from './openai';

export interface JournalEntryData {
  date: Date;
  description: string;
  reference?: string;
  projectId?: number;
  lines: {
    accountId: number;
    description?: string;
    debitAmount?: number;
    creditAmount?: number;
    reference?: string;
    projectId?: number;
  }[];
}

export class BookkeepingService {
  
  // Chart of Accounts Management with Governance & Compliance
  async initializeChartOfAccounts(userId: number, businessType: string = 'llc'): Promise<void> {
    const standardAccounts = [
      // Assets
      { code: '1000', name: 'Cash and Cash Equivalents', type: 'asset', subtype: 'current_asset', category: 'cash', normalBalance: 'debit', isSystem: true, taxCode: 'CASH' },
      { code: '1010', name: 'Operating Checking Account', type: 'asset', subtype: 'current_asset', category: 'cash', normalBalance: 'debit', isSystem: true, taxCode: 'CASH' },
      { code: '1020', name: 'Business Savings Account', type: 'asset', subtype: 'current_asset', category: 'cash', normalBalance: 'debit', isSystem: true, taxCode: 'CASH' },
      { code: '1030', name: 'Petty Cash', type: 'asset', subtype: 'current_asset', category: 'cash', normalBalance: 'debit', isSystem: true, taxCode: 'CASH' },
      { code: '1100', name: 'Accounts Receivable', type: 'asset', subtype: 'current_asset', category: 'accounts_receivable', normalBalance: 'debit', isSystem: true, taxCode: 'AR' },
      { code: '1110', name: 'Allowance for Doubtful Accounts', type: 'asset', subtype: 'current_asset', category: 'allowance', normalBalance: 'credit', isSystem: true, taxCode: 'AR_ALLOW' },
      { code: '1200', name: 'Inventory', type: 'asset', subtype: 'current_asset', category: 'inventory', normalBalance: 'debit', isSystem: true, taxCode: 'INV' },
      { code: '1210', name: 'Prepaid Expenses', type: 'asset', subtype: 'current_asset', category: 'prepaid', normalBalance: 'debit', isSystem: true, taxCode: 'PREPAID' },
      { code: '1220', name: 'Prepaid Insurance', type: 'asset', subtype: 'current_asset', category: 'prepaid', normalBalance: 'debit', isSystem: true, taxCode: 'PREPAID' },
      { code: '1230', name: 'Prepaid Software Licenses', type: 'asset', subtype: 'current_asset', category: 'prepaid', normalBalance: 'debit', isSystem: true, taxCode: 'PREPAID' },
      { code: '1300', name: 'Security Deposits', type: 'asset', subtype: 'current_asset', category: 'deposits', normalBalance: 'debit', isSystem: true, taxCode: 'DEPOSITS' },
      { code: '1500', name: 'Equipment', type: 'asset', subtype: 'fixed_asset', category: 'equipment', normalBalance: 'debit', isSystem: true, taxCode: 'EQUIP' },
      { code: '1510', name: 'Computer Equipment', type: 'asset', subtype: 'fixed_asset', category: 'equipment', normalBalance: 'debit', isSystem: true, taxCode: 'EQUIP' },
      { code: '1520', name: 'Office Furniture', type: 'asset', subtype: 'fixed_asset', category: 'equipment', normalBalance: 'debit', isSystem: true, taxCode: 'EQUIP' },
      { code: '1600', name: 'Accumulated Depreciation - Equipment', type: 'asset', subtype: 'fixed_asset', category: 'accumulated_depreciation', normalBalance: 'credit', isSystem: true, taxCode: 'ACCUM_DEP' },
      { code: '1610', name: 'Accumulated Depreciation - Computer Equipment', type: 'asset', subtype: 'fixed_asset', category: 'accumulated_depreciation', normalBalance: 'credit', isSystem: true, taxCode: 'ACCUM_DEP' },
      { code: '1700', name: 'Intangible Assets', type: 'asset', subtype: 'fixed_asset', category: 'intangible', normalBalance: 'debit', isSystem: true, taxCode: 'INTANG' },
      { code: '1710', name: 'Software Development Costs', type: 'asset', subtype: 'fixed_asset', category: 'intangible', normalBalance: 'debit', isSystem: true, taxCode: 'INTANG' },
      { code: '1800', name: 'Goodwill', type: 'asset', subtype: 'fixed_asset', category: 'intangible', normalBalance: 'debit', isSystem: true, taxCode: 'GOODWILL' },
      
      // Liabilities
      { code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'current_liability', category: 'accounts_payable', normalBalance: 'credit', isSystem: true, taxCode: 'AP' },
      { code: '2010', name: 'Trade Payables', type: 'liability', subtype: 'current_liability', category: 'accounts_payable', normalBalance: 'credit', isSystem: true, taxCode: 'AP' },
      { code: '2100', name: 'Credit Cards Payable', type: 'liability', subtype: 'current_liability', category: 'credit_cards', normalBalance: 'credit', isSystem: true, taxCode: 'CC' },
      { code: '2200', name: 'Accrued Expenses', type: 'liability', subtype: 'current_liability', category: 'accrued_expenses', normalBalance: 'credit', isSystem: true, taxCode: 'ACCRUED' },
      { code: '2210', name: 'Accrued Payroll', type: 'liability', subtype: 'current_liability', category: 'accrued_payroll', normalBalance: 'credit', isSystem: true, taxCode: 'PAYROLL' },
      { code: '2220', name: 'Accrued Payroll Taxes', type: 'liability', subtype: 'current_liability', category: 'payroll_taxes', normalBalance: 'credit', isSystem: true, taxCode: 'PAYROLL_TAX' },
      { code: '2230', name: 'Accrued Interest', type: 'liability', subtype: 'current_liability', category: 'accrued_interest', normalBalance: 'credit', isSystem: true, taxCode: 'INT_PAY' },
      { code: '2300', name: 'Sales Tax Payable', type: 'liability', subtype: 'current_liability', category: 'sales_tax', normalBalance: 'credit', isSystem: true, taxCode: 'SALES_TAX' },
      { code: '2310', name: 'Use Tax Payable', type: 'liability', subtype: 'current_liability', category: 'use_tax', normalBalance: 'credit', isSystem: true, taxCode: 'USE_TAX' },
      { code: '2320', name: 'Federal Income Tax Payable', type: 'liability', subtype: 'current_liability', category: 'income_tax', normalBalance: 'credit', isSystem: true, taxCode: 'FED_TAX' },
      { code: '2330', name: 'State Income Tax Payable', type: 'liability', subtype: 'current_liability', category: 'income_tax', normalBalance: 'credit', isSystem: true, taxCode: 'STATE_TAX' },
      { code: '2400', name: 'Deferred Revenue', type: 'liability', subtype: 'current_liability', category: 'deferred_revenue', normalBalance: 'credit', isSystem: true, taxCode: 'DEF_REV' },
      { code: '2410', name: 'Customer Deposits', type: 'liability', subtype: 'current_liability', category: 'customer_deposits', normalBalance: 'credit', isSystem: true, taxCode: 'DEPOSITS' },
      { code: '2500', name: 'Notes Payable - Short Term', type: 'liability', subtype: 'current_liability', category: 'notes_payable', normalBalance: 'credit', isSystem: true, taxCode: 'NOTES_PAY' },
      { code: '2600', name: 'Long-term Debt', type: 'liability', subtype: 'long_term_liability', category: 'long_term_debt', normalBalance: 'credit', isSystem: true, taxCode: 'LT_DEBT' },
      { code: '2610', name: 'Equipment Loans', type: 'liability', subtype: 'long_term_liability', category: 'equipment_loans', normalBalance: 'credit', isSystem: true, taxCode: 'EQUIP_LOAN' },
      
      // LLC Capital Accounts & Equity (Business Type Specific)
      ...(businessType === 'llc' ? [
        { code: '3000', name: 'Member Capital Accounts', type: 'equity', subtype: 'member_equity', category: 'member_capital', normalBalance: 'credit', isSystem: true, taxCode: 'MEMBER_CAP' },
        { code: '3010', name: 'Member A - Capital Account', type: 'equity', subtype: 'member_equity', category: 'member_capital', normalBalance: 'credit', isSystem: true, taxCode: 'MEMBER_CAP' },
        { code: '3020', name: 'Member B - Capital Account', type: 'equity', subtype: 'member_equity', category: 'member_capital', normalBalance: 'credit', isSystem: true, taxCode: 'MEMBER_CAP' },
        { code: '3100', name: 'Member Contributions', type: 'equity', subtype: 'member_equity', category: 'member_contributions', normalBalance: 'credit', isSystem: true, taxCode: 'CONTRIBUTIONS' },
        { code: '3110', name: 'Member A - Contributions', type: 'equity', subtype: 'member_equity', category: 'member_contributions', normalBalance: 'credit', isSystem: true, taxCode: 'CONTRIBUTIONS' },
        { code: '3120', name: 'Member B - Contributions', type: 'equity', subtype: 'member_equity', category: 'member_contributions', normalBalance: 'credit', isSystem: true, taxCode: 'CONTRIBUTIONS' },
        { code: '3200', name: 'Member Distributions', type: 'equity', subtype: 'member_equity', category: 'member_distributions', normalBalance: 'debit', isSystem: true, taxCode: 'DISTRIBUTIONS' },
        { code: '3210', name: 'Member A - Distributions', type: 'equity', subtype: 'member_equity', category: 'member_distributions', normalBalance: 'debit', isSystem: true, taxCode: 'DISTRIBUTIONS' },
        { code: '3220', name: 'Member B - Distributions', type: 'equity', subtype: 'member_equity', category: 'member_distributions', normalBalance: 'debit', isSystem: true, taxCode: 'DISTRIBUTIONS' },
        { code: '3300', name: 'Allocated Profits/Losses', type: 'equity', subtype: 'member_equity', category: 'allocated_earnings', normalBalance: 'credit', isSystem: true, taxCode: 'ALLOCATED' },
        { code: '3310', name: 'Member A - Allocated P&L', type: 'equity', subtype: 'member_equity', category: 'allocated_earnings', normalBalance: 'credit', isSystem: true, taxCode: 'ALLOCATED' },
        { code: '3320', name: 'Member B - Allocated P&L', type: 'equity', subtype: 'member_equity', category: 'allocated_earnings', normalBalance: 'credit', isSystem: true, taxCode: 'ALLOCATED' },
        { code: '3400', name: 'Guaranteed Payments', type: 'equity', subtype: 'member_equity', category: 'guaranteed_payments', normalBalance: 'debit', isSystem: true, taxCode: 'GUARANTEED_PAY' },
      ] : [
        { code: '3000', name: 'Owner\'s Equity', type: 'equity', subtype: 'owner_equity', category: 'owner_equity', normalBalance: 'credit', isSystem: true, taxCode: 'EQUITY' },
        { code: '3100', name: 'Retained Earnings', type: 'equity', subtype: 'retained_earnings', category: 'retained_earnings', normalBalance: 'credit', isSystem: true, taxCode: 'RETAINED' },
        { code: '3200', name: 'Owner Draws', type: 'equity', subtype: 'owner_draws', category: 'owner_draws', normalBalance: 'debit', isSystem: true, taxCode: 'DRAWS' },
      ]),
      
      // Revenue
      { code: '4000', name: 'Operating Revenue', type: 'revenue', subtype: 'operating_revenue', category: 'sales_revenue', normalBalance: 'credit', isSystem: true, taxCode: 'REVENUE' },
      { code: '4010', name: 'Product Sales', type: 'revenue', subtype: 'operating_revenue', category: 'product_sales', normalBalance: 'credit', isSystem: true, taxCode: 'REVENUE' },
      { code: '4020', name: 'Service Revenue', type: 'revenue', subtype: 'operating_revenue', category: 'service_revenue', normalBalance: 'credit', isSystem: true, taxCode: 'REVENUE' },
      { code: '4030', name: 'Subscription Revenue', type: 'revenue', subtype: 'operating_revenue', category: 'subscription_revenue', normalBalance: 'credit', isSystem: true, taxCode: 'REVENUE' },
      { code: '4040', name: 'Consulting Revenue', type: 'revenue', subtype: 'operating_revenue', category: 'consulting_revenue', normalBalance: 'credit', isSystem: true, taxCode: 'REVENUE' },
      { code: '4100', name: 'Other Operating Revenue', type: 'revenue', subtype: 'operating_revenue', category: 'other_operating', normalBalance: 'credit', isSystem: true, taxCode: 'OTHER_REV' },
      { code: '4200', name: 'Interest Income', type: 'revenue', subtype: 'non_operating_revenue', category: 'interest_income', normalBalance: 'credit', isSystem: true, taxCode: 'INT_INC' },
      { code: '4210', name: 'Dividend Income', type: 'revenue', subtype: 'non_operating_revenue', category: 'dividend_income', normalBalance: 'credit', isSystem: true, taxCode: 'DIV_INC' },
      { code: '4220', name: 'Gain on Sale of Assets', type: 'revenue', subtype: 'non_operating_revenue', category: 'asset_gains', normalBalance: 'credit', isSystem: true, taxCode: 'GAINS' },
      
      // Cost of Goods Sold
      { code: '5000', name: 'Cost of Goods Sold', type: 'expense', subtype: 'cost_of_sales', category: 'cogs', normalBalance: 'debit', isSystem: true, taxCode: 'COGS' },
      { code: '5010', name: 'Materials and Supplies', type: 'expense', subtype: 'cost_of_sales', category: 'materials', normalBalance: 'debit', isSystem: true, taxCode: 'COGS' },
      { code: '5020', name: 'Direct Labor', type: 'expense', subtype: 'cost_of_sales', category: 'direct_labor', normalBalance: 'debit', isSystem: true, taxCode: 'COGS' },
      { code: '5030', name: 'Subcontractor Costs', type: 'expense', subtype: 'cost_of_sales', category: 'subcontractors', normalBalance: 'debit', isSystem: true, taxCode: 'COGS' },
      { code: '5040', name: 'Shipping and Fulfillment', type: 'expense', subtype: 'cost_of_sales', category: 'shipping', normalBalance: 'debit', isSystem: true, taxCode: 'COGS' },
      
      // Operating Expenses
      { code: '6000', name: 'Compensation and Benefits', type: 'expense', subtype: 'operating_expense', category: 'compensation', normalBalance: 'debit', isSystem: true, taxCode: 'PAYROLL' },
      { code: '6010', name: 'Salaries and Wages', type: 'expense', subtype: 'operating_expense', category: 'payroll', normalBalance: 'debit', isSystem: true, taxCode: 'PAYROLL' },
      { code: '6020', name: 'Payroll Taxes', type: 'expense', subtype: 'operating_expense', category: 'payroll_taxes', normalBalance: 'debit', isSystem: true, taxCode: 'PAYROLL_TAX' },
      { code: '6030', name: 'Employee Benefits', type: 'expense', subtype: 'operating_expense', category: 'benefits', normalBalance: 'debit', isSystem: true, taxCode: 'BENEFITS' },
      { code: '6040', name: 'Workers Compensation Insurance', type: 'expense', subtype: 'operating_expense', category: 'insurance', normalBalance: 'debit', isSystem: true, taxCode: 'INSURANCE' },
      { code: '6050', name: 'Contract Labor', type: 'expense', subtype: 'operating_expense', category: 'contract_labor', normalBalance: 'debit', isSystem: true, taxCode: 'CONTRACT' },
      
      { code: '6100', name: 'Facilities and Operations', type: 'expense', subtype: 'operating_expense', category: 'facilities', normalBalance: 'debit', isSystem: true, taxCode: 'FACILITIES' },
      { code: '6110', name: 'Rent Expense', type: 'expense', subtype: 'operating_expense', category: 'rent', normalBalance: 'debit', isSystem: true, taxCode: 'RENT' },
      { code: '6120', name: 'Utilities', type: 'expense', subtype: 'operating_expense', category: 'utilities', normalBalance: 'debit', isSystem: true, taxCode: 'UTILITIES' },
      { code: '6130', name: 'Property Taxes', type: 'expense', subtype: 'operating_expense', category: 'property_tax', normalBalance: 'debit', isSystem: true, taxCode: 'PROP_TAX' },
      { code: '6140', name: 'Repairs and Maintenance', type: 'expense', subtype: 'operating_expense', category: 'repairs', normalBalance: 'debit', isSystem: true, taxCode: 'REPAIRS' },
      { code: '6150', name: 'Janitorial Services', type: 'expense', subtype: 'operating_expense', category: 'janitorial', normalBalance: 'debit', isSystem: true, taxCode: 'SERVICES' },
      
      { code: '6200', name: 'Technology and Software', type: 'expense', subtype: 'operating_expense', category: 'technology', normalBalance: 'debit', isSystem: true, taxCode: 'SOFTWARE' },
      { code: '6210', name: 'Software and SaaS Subscriptions', type: 'expense', subtype: 'operating_expense', category: 'software', normalBalance: 'debit', isSystem: true, taxCode: 'SOFTWARE' },
      { code: '6220', name: 'Cloud Hosting and Infrastructure', type: 'expense', subtype: 'operating_expense', category: 'hosting', normalBalance: 'debit', isSystem: true, taxCode: 'SOFTWARE' },
      { code: '6230', name: 'Internet and Communications', type: 'expense', subtype: 'operating_expense', category: 'communications', normalBalance: 'debit', isSystem: true, taxCode: 'COMM' },
      { code: '6240', name: 'Software Development Tools', type: 'expense', subtype: 'operating_expense', category: 'dev_tools', normalBalance: 'debit', isSystem: true, taxCode: 'SOFTWARE' },
      
      { code: '6300', name: 'Marketing and Sales', type: 'expense', subtype: 'operating_expense', category: 'marketing', normalBalance: 'debit', isSystem: true, taxCode: 'MARKETING' },
      { code: '6310', name: 'Advertising', type: 'expense', subtype: 'operating_expense', category: 'advertising', normalBalance: 'debit', isSystem: true, taxCode: 'MARKETING' },
      { code: '6320', name: 'Digital Marketing', type: 'expense', subtype: 'operating_expense', category: 'digital_marketing', normalBalance: 'debit', isSystem: true, taxCode: 'MARKETING' },
      { code: '6330', name: 'Trade Shows and Events', type: 'expense', subtype: 'operating_expense', category: 'events', normalBalance: 'debit', isSystem: true, taxCode: 'MARKETING' },
      { code: '6340', name: 'Sales Commissions', type: 'expense', subtype: 'operating_expense', category: 'commissions', normalBalance: 'debit', isSystem: true, taxCode: 'COMMISSIONS' },
      
      { code: '6400', name: 'Professional Services', type: 'expense', subtype: 'operating_expense', category: 'professional_services', normalBalance: 'debit', isSystem: true, taxCode: 'PROF_SERVICES' },
      { code: '6410', name: 'Legal Fees', type: 'expense', subtype: 'operating_expense', category: 'legal', normalBalance: 'debit', isSystem: true, taxCode: 'LEGAL' },
      { code: '6420', name: 'Accounting and Bookkeeping', type: 'expense', subtype: 'operating_expense', category: 'accounting', normalBalance: 'debit', isSystem: true, taxCode: 'ACCOUNTING' },
      { code: '6430', name: 'Consulting Fees', type: 'expense', subtype: 'operating_expense', category: 'consulting', normalBalance: 'debit', isSystem: true, taxCode: 'CONSULTING' },
      { code: '6440', name: 'Audit and Tax Preparation', type: 'expense', subtype: 'operating_expense', category: 'audit_tax', normalBalance: 'debit', isSystem: true, taxCode: 'TAX_PREP' },
      
      { code: '6500', name: 'Administrative Expenses', type: 'expense', subtype: 'operating_expense', category: 'administrative', normalBalance: 'debit', isSystem: true, taxCode: 'ADMIN' },
      { code: '6510', name: 'Office Supplies', type: 'expense', subtype: 'operating_expense', category: 'office_supplies', normalBalance: 'debit', isSystem: true, taxCode: 'SUPPLIES' },
      { code: '6520', name: 'Business Registration and Licenses', type: 'expense', subtype: 'operating_expense', category: 'licenses', normalBalance: 'debit', isSystem: true, taxCode: 'LICENSES' },
      { code: '6530', name: 'Insurance - General Liability', type: 'expense', subtype: 'operating_expense', category: 'insurance', normalBalance: 'debit', isSystem: true, taxCode: 'INSURANCE' },
      { code: '6540', name: 'Insurance - Professional Liability', type: 'expense', subtype: 'operating_expense', category: 'insurance', normalBalance: 'debit', isSystem: true, taxCode: 'INSURANCE' },
      { code: '6550', name: 'Bank Fees and Charges', type: 'expense', subtype: 'operating_expense', category: 'bank_fees', normalBalance: 'debit', isSystem: true, taxCode: 'BANK_FEES' },
      { code: '6560', name: 'Credit Card Processing Fees', type: 'expense', subtype: 'operating_expense', category: 'processing_fees', normalBalance: 'debit', isSystem: true, taxCode: 'PROC_FEES' },
      
      { code: '6600', name: 'Travel and Entertainment', type: 'expense', subtype: 'operating_expense', category: 'travel', normalBalance: 'debit', isSystem: true, taxCode: 'TRAVEL' },
      { code: '6610', name: 'Travel - Airfare', type: 'expense', subtype: 'operating_expense', category: 'travel', normalBalance: 'debit', isSystem: true, taxCode: 'TRAVEL' },
      { code: '6620', name: 'Travel - Lodging', type: 'expense', subtype: 'operating_expense', category: 'travel', normalBalance: 'debit', isSystem: true, taxCode: 'TRAVEL' },
      { code: '6630', name: 'Travel - Meals (50% Deductible)', type: 'expense', subtype: 'operating_expense', category: 'meals_50', normalBalance: 'debit', isSystem: true, taxCode: 'MEALS_50' },
      { code: '6640', name: 'Business Meals (100% Deductible)', type: 'expense', subtype: 'operating_expense', category: 'meals_100', normalBalance: 'debit', isSystem: true, taxCode: 'MEALS_100' },
      { code: '6650', name: 'Vehicle and Transportation', type: 'expense', subtype: 'operating_expense', category: 'transportation', normalBalance: 'debit', isSystem: true, taxCode: 'TRANSPORT' },
      
      { code: '6700', name: 'Depreciation and Amortization', type: 'expense', subtype: 'operating_expense', category: 'depreciation', normalBalance: 'debit', isSystem: true, taxCode: 'DEPRECIATION' },
      { code: '6710', name: 'Depreciation - Equipment', type: 'expense', subtype: 'operating_expense', category: 'depreciation', normalBalance: 'debit', isSystem: true, taxCode: 'DEPRECIATION' },
      { code: '6720', name: 'Amortization - Software', type: 'expense', subtype: 'operating_expense', category: 'amortization', normalBalance: 'debit', isSystem: true, taxCode: 'AMORTIZATION' },
      
      // Non-Operating Expenses
      { code: '7000', name: 'Interest Expense', type: 'expense', subtype: 'non_operating_expense', category: 'interest_expense', normalBalance: 'debit', isSystem: true, taxCode: 'INT_EXP' },
      { code: '7010', name: 'Loss on Sale of Assets', type: 'expense', subtype: 'non_operating_expense', category: 'asset_losses', normalBalance: 'debit', isSystem: true, taxCode: 'LOSSES' },
      { code: '7020', name: 'Bad Debt Expense', type: 'expense', subtype: 'non_operating_expense', category: 'bad_debt', normalBalance: 'debit', isSystem: true, taxCode: 'BAD_DEBT' },
      { code: '7100', name: 'Income Tax Expense', type: 'expense', subtype: 'tax_expense', category: 'income_tax', normalBalance: 'debit', isSystem: true, taxCode: 'TAX_EXP' },
      { code: '7110', name: 'Federal Income Tax', type: 'expense', subtype: 'tax_expense', category: 'federal_tax', normalBalance: 'debit', isSystem: true, taxCode: 'FED_TAX_EXP' },
      { code: '7120', name: 'State Income Tax', type: 'expense', subtype: 'tax_expense', category: 'state_tax', normalBalance: 'debit', isSystem: true, taxCode: 'STATE_TAX_EXP' },
      { code: '7130', name: 'Franchise Tax', type: 'expense', subtype: 'tax_expense', category: 'franchise_tax', normalBalance: 'debit', isSystem: true, taxCode: 'FRANCHISE_TAX' },
    ];

    for (const account of standardAccounts) {
      await db.insert(chartOfAccounts).values({
        userId,
        ...account,
      }).onConflictDoNothing();
    }
  }

  // Journal Entry Creation and Management
  async createJournalEntry(userId: number, entryData: JournalEntryData): Promise<number> {
    // Validate that debits equal credits
    const totalDebits = entryData.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredits = entryData.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Journal entry debits must equal credits');
    }

    // Generate entry number
    const entryCount = await db.select({ count: count() })
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId));
    
    const entryNumber = `JE-${String(entryCount[0].count + 1).padStart(6, '0')}`;

    // Create the journal entry
    const [journalEntry] = await db.insert(journalEntries).values({
      userId,
      projectId: entryData.projectId,
      entryNumber,
      date: entryData.date,
      reference: entryData.reference,
      description: entryData.description,
      totalAmount: totalDebits,
      source: 'manual',
      createdBy: userId.toString(),
    }).returning();

    // Create journal entry lines
    for (let i = 0; i < entryData.lines.length; i++) {
      const line = entryData.lines[i];
      await db.insert(journalEntryLines).values({
        journalEntryId: journalEntry.id,
        accountId: line.accountId,
        description: line.description,
        debitAmount: line.debitAmount?.toString() || '0',
        creditAmount: line.creditAmount?.toString() || '0',
        lineNumber: i + 1,
        reference: line.reference,
        projectId: line.projectId,
      });
    }

    // Update account balances
    await this.updateAccountBalances(userId, entryData.lines);

    return journalEntry.id;
  }

  // Account Balance Management
  async updateAccountBalances(userId: number, lines: JournalEntryData['lines']): Promise<void> {
    for (const line of lines) {
      const account = await db.select()
        .from(chartOfAccounts)
        .where(and(
          eq(chartOfAccounts.id, line.accountId),
          eq(chartOfAccounts.userId, userId)
        ))
        .limit(1);

      if (account.length > 0) {
        const currentBalance = parseFloat(account[0].balance || '0');
        const debitAmount = line.debitAmount || 0;
        const creditAmount = line.creditAmount || 0;
        
        let newBalance = currentBalance;
        
        // Apply normal balance rules
        if (account[0].normalBalance === 'debit') {
          newBalance += debitAmount - creditAmount;
        } else {
          newBalance += creditAmount - debitAmount;
        }

        await db.update(chartOfAccounts)
          .set({ 
            balance: newBalance.toString(),
            updatedAt: new Date()
          })
          .where(eq(chartOfAccounts.id, line.accountId));
      }
    }
  }

  // Financial Report Generation
  async generateTrialBalance(userId: number, asOfDate: Date): Promise<any[]> {
    const accounts = await db.select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.userId, userId),
        eq(chartOfAccounts.isActive, true)
      ))
      .orderBy(asc(chartOfAccounts.code));

    return accounts.map(account => ({
      code: account.code,
      name: account.name,
      type: account.type,
      debitBalance: account.normalBalance === 'debit' && parseFloat(account.balance || '0') > 0 
        ? parseFloat(account.balance || '0') : 0,
      creditBalance: account.normalBalance === 'credit' && parseFloat(account.balance || '0') > 0 
        ? parseFloat(account.balance || '0') : 0,
    }));
  }

  async generateIncomeStatement(userId: number, startDate: Date, endDate: Date): Promise<any> {
    // Get revenue accounts
    const revenueAccounts = await db.select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.userId, userId),
        eq(chartOfAccounts.type, 'revenue'),
        eq(chartOfAccounts.isActive, true)
      ));

    // Get expense accounts
    const expenseAccounts = await db.select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.userId, userId),
        eq(chartOfAccounts.type, 'expense'),
        eq(chartOfAccounts.isActive, true)
      ));

    const totalRevenue = revenueAccounts.reduce((sum, account) => 
      sum + parseFloat(account.balance || '0'), 0);
    
    const totalExpenses = expenseAccounts.reduce((sum, account) => 
      sum + parseFloat(account.balance || '0'), 0);

    return {
      period: { startDate, endDate },
      revenue: {
        accounts: revenueAccounts.map(acc => ({
          name: acc.name,
          amount: parseFloat(acc.balance || '0')
        })),
        total: totalRevenue
      },
      expenses: {
        accounts: expenseAccounts.map(acc => ({
          name: acc.name,
          amount: parseFloat(acc.balance || '0')
        })),
        total: totalExpenses
      },
      netIncome: totalRevenue - totalExpenses
    };
  }

  async generateBalanceSheet(userId: number, asOfDate: Date): Promise<any> {
    const assets = await db.select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.userId, userId),
        eq(chartOfAccounts.type, 'asset'),
        eq(chartOfAccounts.isActive, true)
      ));

    const liabilities = await db.select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.userId, userId),
        eq(chartOfAccounts.type, 'liability'),
        eq(chartOfAccounts.isActive, true)
      ));

    const equity = await db.select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.userId, userId),
        eq(chartOfAccounts.type, 'equity'),
        eq(chartOfAccounts.isActive, true)
      ));

    const totalAssets = assets.reduce((sum, account) => 
      sum + parseFloat(account.balance || '0'), 0);
    
    const totalLiabilities = liabilities.reduce((sum, account) => 
      sum + parseFloat(account.balance || '0'), 0);
    
    const totalEquity = equity.reduce((sum, account) => 
      sum + parseFloat(account.balance || '0'), 0);

    return {
      asOfDate,
      assets: {
        accounts: assets.map(acc => ({
          name: acc.name,
          amount: parseFloat(acc.balance || '0')
        })),
        total: totalAssets
      },
      liabilities: {
        accounts: liabilities.map(acc => ({
          name: acc.name,
          amount: parseFloat(acc.balance || '0')
        })),
        total: totalLiabilities
      },
      equity: {
        accounts: equity.map(acc => ({
          name: acc.name,
          amount: parseFloat(acc.balance || '0')
        })),
        total: totalEquity
      }
    };
  }

  // Transaction Auto-Categorization
  async categorizeTransaction(userId: number, description: string, amount: number): Promise<{
    accountId: number;
    confidence: number;
    reasoning: string;
  }> {
    // Get user's chart of accounts
    const accounts = await db.select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.userId, userId),
        eq(chartOfAccounts.isActive, true)
      ));

    // Use AI to analyze and categorize
    const analysisResult = await this.analyzeTransactionForCategorization(description, amount, accounts);
    
    return analysisResult;
  }

  private async analyzeTransactionForCategorization(
    description: string, 
    amount: number, 
    accounts: any[]
  ): Promise<any> {
    // Simple rule-based categorization with AI fallback
    const desc = description.toLowerCase();
    
    // Common patterns
    if (desc.includes('stripe') || desc.includes('payment received')) {
      const revenueAccount = accounts.find(acc => acc.category === 'sales_revenue');
      if (revenueAccount) {
        return {
          accountId: revenueAccount.id,
          confidence: 0.9,
          reasoning: 'Payment received - categorized as revenue'
        };
      }
    }
    
    if (desc.includes('aws') || desc.includes('github') || desc.includes('vercel')) {
      const softwareAccount = accounts.find(acc => acc.category === 'software');
      if (softwareAccount) {
        return {
          accountId: softwareAccount.id,
          confidence: 0.85,
          reasoning: 'Software/SaaS expense detected'
        };
      }
    }

    // Default to general expense account
    const expenseAccount = accounts.find(acc => acc.category === 'operating_expenses');
    return {
      accountId: expenseAccount?.id || accounts[0]?.id,
      confidence: 0.5,
      reasoning: 'Default categorization - requires review'
    };
  }
}

export const bookkeepingService = new BookkeepingService();