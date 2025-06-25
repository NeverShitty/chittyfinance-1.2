import { pgTable, serial, text, timestamp, decimal, boolean, integer, json, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  isDemo: boolean('is_demo').default(false),
  preferences: json('preferences'), // UI preferences, settings
  globalRole: text('global_role').default('user'), // super_admin, admin, user
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  mfaEnabled: boolean('mfa_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Multi-Entity Management
export const entities = pgTable('entities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  legalName: text('legal_name').notNull(),
  entityType: text('entity_type').notNull(), // llc, corporation, partnership, sole_proprietorship
  subType: text('sub_type'), // c_corp, s_corp, llp, lllp, etc.
  ein: text('ein'), // Federal Tax ID
  stateOfIncorporation: text('state_of_incorporation').notNull(),
  stateOfOperation: json('states_of_operation').notNull(), // Array of states
  businessAddress: json('business_address').notNull(),
  mailingAddress: json('mailing_address'),
  parentEntityId: integer('parent_entity_id').references(() => entities.id),
  isActive: boolean('is_active').default(true),
  incorporationDate: timestamp('incorporation_date'),
  fiscalYearEnd: text('fiscal_year_end').notNull(), // MM-DD format
  industryCode: text('industry_code'), // NAICS code
  complianceLevel: text('compliance_level').default('standard'), // basic, standard, enhanced, sox
  regulatoryRequirements: json('regulatory_requirements'), // Array of applicable regulations
  governanceStructure: json('governance_structure'), // Board, committees, etc.
  operatingAgreement: json('operating_agreement'), // Key terms and provisions
  capitalStructure: json('capital_structure'), // Ownership, classes, etc.
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  nameIdx: index('entities_name_idx').on(table.name),
  typeIdx: index('entities_type_idx').on(table.entityType),
  stateIdx: index('entities_state_idx').on(table.stateOfIncorporation),
  parentIdx: index('entities_parent_idx').on(table.parentEntityId),
}));

// User-Entity Relationships with Roles
export const userEntityRoles = pgTable('user_entity_roles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  role: text('role').notNull(), // owner, manager, member, accountant, auditor, viewer
  permissions: json('permissions').notNull(), // Granular permissions array
  accessLevel: text('access_level').notNull(), // full, financial_only, reports_only, limited
  isActive: boolean('is_active').default(true),
  effectiveDate: timestamp('effective_date').defaultNow(),
  expirationDate: timestamp('expiration_date'),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userEntityIdx: index('user_entity_roles_user_entity_idx').on(table.userId, table.entityId),
  roleIdx: index('user_entity_roles_role_idx').on(table.role),
}));

// Multi-State Compliance Framework
export const jurisdictions = pgTable('jurisdictions', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // federal, state, local
  code: text('code').notNull(), // US, CA, NY, etc.
  name: text('name').notNull(),
  parentJurisdictionId: integer('parent_jurisdiction_id').references(() => jurisdictions.id),
  timezone: text('timezone'),
  filingRequirements: json('filing_requirements'), // Required filings and deadlines
  taxRates: json('tax_rates'), // Various tax rates
  complianceRules: json('compliance_rules'), // Regulatory requirements
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  typeCodeIdx: index('jurisdictions_type_code_idx').on(table.type, table.code),
}));

// Entity Jurisdiction Compliance
export const entityJurisdictions = pgTable('entity_jurisdictions', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  jurisdictionId: integer('jurisdiction_id').references(() => jurisdictions.id).notNull(),
  relationshipType: text('relationship_type').notNull(), // incorporation, registration, tax_filing, operation
  registrationNumber: text('registration_number'),
  effectiveDate: timestamp('effective_date').notNull(),
  expirationDate: timestamp('expiration_date'),
  status: text('status').default('active'), // active, suspended, revoked, pending
  complianceStatus: text('compliance_status').default('compliant'), // compliant, non_compliant, pending_review
  lastComplianceCheck: timestamp('last_compliance_check'),
  nextFilingDue: timestamp('next_filing_due'),
  filingHistory: json('filing_history'), // Historical filings
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityJurisdictionIdx: index('entity_jurisdictions_entity_jurisdiction_idx').on(table.entityId, table.jurisdictionId),
  statusIdx: index('entity_jurisdictions_status_idx').on(table.status),
  complianceIdx: index('entity_jurisdictions_compliance_idx').on(table.complianceStatus),
}));

// Governance and Approval Workflows
export const governanceRules = pgTable('governance_rules', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  ruleType: text('rule_type').notNull(), // transaction_approval, document_signing, financial_reporting
  name: text('name').notNull(),
  description: text('description'),
  conditions: json('conditions').notNull(), // Trigger conditions
  approvalWorkflow: json('approval_workflow').notNull(), // Required approvers and process
  thresholds: json('thresholds'), // Amount thresholds, etc.
  requiredRoles: json('required_roles'), // Roles that must approve
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(100),
  effectiveDate: timestamp('effective_date').defaultNow(),
  expirationDate: timestamp('expiration_date'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityTypeIdx: index('governance_rules_entity_type_idx').on(table.entityId, table.ruleType),
}));

// Approval Requests and Workflows
export const approvalRequests = pgTable('approval_requests', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  requestType: text('request_type').notNull(), // transaction, journal_entry, report, document
  referenceId: text('reference_id'), // ID of the item being approved
  requestedBy: integer('requested_by').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  requestData: json('request_data').notNull(), // The actual request content
  governanceRuleId: integer('governance_rule_id').references(() => governanceRules.id),
  status: text('status').default('pending'), // pending, approved, rejected, cancelled
  currentApprovalStep: integer('current_approval_step').default(1),
  totalApprovalSteps: integer('total_approval_steps').notNull(),
  approvalHistory: json('approval_history'), // History of approvals/rejections
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityStatusIdx: index('approval_requests_entity_status_idx').on(table.entityId, table.status),
  typeIdx: index('approval_requests_type_idx').on(table.requestType),
}));

// Governance Actions and Decisions
export const governanceActions = pgTable('governance_actions', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  approvalRequestId: integer('approval_request_id').references(() => approvalRequests.id),
  actionType: text('action_type').notNull(), // approve, reject, delegate, request_info
  performedBy: integer('performed_by').references(() => users.id).notNull(),
  onBehalfOf: integer('on_behalf_of').references(() => users.id), // If acting on behalf
  comments: text('comments'),
  attachments: json('attachments'), // Supporting documents
  digitalSignature: text('digital_signature'), // Cryptographic signature
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow(),
  isRevoked: boolean('is_revoked').default(false),
  revokedBy: integer('revoked_by').references(() => users.id),
  revokedAt: timestamp('revoked_at'),
  revokedReason: text('revoked_reason'),
}, (table) => ({
  entityIdx: index('governance_actions_entity_idx').on(table.entityId),
  requestIdx: index('governance_actions_request_idx').on(table.approvalRequestId),
  userIdx: index('governance_actions_user_idx').on(table.performedBy),
  timestampIdx: index('governance_actions_timestamp_idx').on(table.timestamp),
}));

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  githubRepo: text('github_repo'),
  status: text('status').default('active'), // active, completed, paused
  budget: decimal('budget', { precision: 12, scale: 2 }),
  spent: decimal('spent', { precision: 12, scale: 2 }).default('0'),
  currency: text('currency').default('USD'),
  requiresApproval: boolean('requires_approval').default(false),
  approvalThreshold: decimal('approval_threshold', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityIdIdx: index('projects_entity_id_idx').on(table.entityId),
  userIdIdx: index('projects_user_id_idx').on(table.userId),
}));

export const financialSummaries = pgTable('financial_summaries', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  projectId: integer('project_id').references(() => projects.id),
  jurisdictionId: integer('jurisdiction_id').references(() => jurisdictions.id),
  totalRevenue: decimal('total_revenue', { precision: 12, scale: 2 }).default('0'),
  totalExpenses: decimal('total_expenses', { precision: 12, scale: 2 }).default('0'),
  netIncome: decimal('net_income', { precision: 12, scale: 2 }).default('0'),
  cashFlow: decimal('cash_flow', { precision: 12, scale: 2 }).default('0'),
  recurringRevenue: decimal('recurring_revenue', { precision: 12, scale: 2 }).default('0'),
  recurringExpenses: decimal('recurring_expenses', { precision: 12, scale: 2 }).default('0'),
  period: text('period').notNull(), // 'monthly', 'quarterly', 'yearly', 'all-time'
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  metrics: json('metrics'), // Additional KPIs and calculated metrics
  consolidationLevel: text('consolidation_level').default('entity'), // entity, consolidated, jurisdiction
  isConsolidated: boolean('is_consolidated').default(false),
  parentSummaryId: integer('parent_summary_id').references(() => financialSummaries.id),
  complianceFlags: json('compliance_flags'), // Regulatory compliance indicators
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityIdIdx: index('financial_summaries_entity_id_idx').on(table.entityId),
  userIdIdx: index('financial_summaries_user_id_idx').on(table.userId),
  periodIdx: index('financial_summaries_period_idx').on(table.period),
  jurisdictionIdx: index('financial_summaries_jurisdiction_idx').on(table.jurisdictionId),
}));

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  projectId: integer('project_id').references(() => projects.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description').notNull(),
  category: text('category'),
  subcategory: text('subcategory'),
  type: text('type').notNull(), // 'income', 'expense'
  source: text('source'), // 'stripe', 'github', 'manual', 'mercury', 'wav'
  externalId: text('external_id'),
  currency: text('currency').default('USD'),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }).default('1'),
  tags: json('tags'), // Array of tags for categorization
  metadata: json('metadata'), // Additional transaction data
  isRecurring: boolean('is_recurring').default(false),
  recurringId: text('recurring_id'), // Links to recurring charge
  date: timestamp('date').notNull(),
  processedAt: timestamp('processed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('transactions_user_id_idx').on(table.userId),
  dateIdx: index('transactions_date_idx').on(table.date),
  typeIdx: index('transactions_type_idx').on(table.type),
  sourceIdx: index('transactions_source_idx').on(table.source),
}));

export const recurringCharges = pgTable('recurring_charges', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  projectId: integer('project_id').references(() => projects.id),
  name: text('name').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').default('USD'),
  frequency: text('frequency').notNull(), // monthly, quarterly, yearly
  category: text('category'),
  vendor: text('vendor'),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  nextDueDate: timestamp('next_due_date'),
  lastChargedDate: timestamp('last_charged_date'),
  source: text('source'), // stripe, manual, detected
  externalId: text('external_id'),
  autoOptimization: json('auto_optimization'), // AI suggestions for optimization
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('recurring_charges_user_id_idx').on(table.userId),
  nextDueDateIdx: index('recurring_charges_next_due_date_idx').on(table.nextDueDate),
}));

export const integrations = pgTable('integrations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  service: text('service').notNull(), // 'stripe', 'github', 'mercury', 'wav', 'doorloop'
  isActive: boolean('is_active').default(false),
  isConnected: boolean('is_connected').default(false),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  externalUserId: text('external_user_id'),
  settings: json('settings'), // Service-specific configuration
  syncSettings: json('sync_settings'), // What data to sync and how often
  lastSync: timestamp('last_sync'),
  lastSyncStatus: text('last_sync_status'), // success, error, partial
  lastSyncError: text('last_sync_error'),
  syncCount: integer('sync_count').default(0),
  dataPoints: json('data_points'), // Summary of synced data
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('integrations_user_id_idx').on(table.userId),
  serviceIdx: index('integrations_service_idx').on(table.service),
}));

export const aiMessages = pgTable('ai_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  threadId: text('thread_id').notNull(),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  context: json('context'), // Financial data context used for the response
  tokens: integer('tokens'), // Token usage tracking
  model: text('model'), // AI model used
  promptType: text('prompt_type'), // advice, analysis, categorization, etc.
  confidence: decimal('confidence', { precision: 3, scale: 2 }), // AI confidence score
  feedback: text('feedback'), // User feedback on the response
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('ai_messages_user_id_idx').on(table.userId),
  threadIdIdx: index('ai_messages_thread_id_idx').on(table.threadId),
  createdAtIdx: index('ai_messages_created_at_idx').on(table.createdAt),
}));

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  projectId: integer('project_id').references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(), // financial_review, cost_optimization, revenue_opportunity
  priority: text('priority').default('medium'), // low, medium, high, urgent
  status: text('status').default('pending'), // pending, in_progress, completed, dismissed
  assignedBy: text('assigned_by').default('ai'), // ai, user, system
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  estimatedImpact: decimal('estimated_impact', { precision: 12, scale: 2 }),
  actualImpact: decimal('actual_impact', { precision: 12, scale: 2 }),
  actionItems: json('action_items'), // List of specific actions to take
  relatedTransactionIds: json('related_transaction_ids'), // Related transactions
  aiContext: json('ai_context'), // AI reasoning and context
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('tasks_user_id_idx').on(table.userId),
  statusIdx: index('tasks_status_idx').on(table.status),
  dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
}));

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripePriceId: text('stripe_price_id'),
  status: text('status').notNull(), // 'active', 'canceled', 'past_due', etc.
  planName: text('plan_name'), // 'starter', 'pro', 'enterprise'
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  usage: json('usage'), // Track feature usage
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Core Bookkeeping Foundation
export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  code: text('code').notNull(), // Account number/code (e.g., 1000, 2000, etc.)
  name: text('name').notNull(), // Account name
  type: text('type').notNull(), // asset, liability, equity, revenue, expense
  subtype: text('subtype'), // current_asset, fixed_asset, current_liability, etc.
  category: text('category'), // cash, accounts_receivable, inventory, etc.
  description: text('description'),
  isActive: boolean('is_active').default(true),
  parentAccountId: integer('parent_account_id').references(() => chartOfAccounts.id),
  level: integer('level').default(0), // Account hierarchy level
  balance: decimal('balance', { precision: 15, scale: 2 }).default('0'),
  normalBalance: text('normal_balance').notNull(), // debit, credit
  isSystem: boolean('is_system').default(false), // System-created accounts
  taxCode: text('tax_code'), // For tax reporting
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('chart_of_accounts_user_id_idx').on(table.userId),
  codeIdx: index('chart_of_accounts_code_idx').on(table.code),
  typeIdx: index('chart_of_accounts_type_idx').on(table.type),
}));

export const journalEntries = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  projectId: integer('project_id').references(() => projects.id),
  entryNumber: text('entry_number').notNull(), // JE-001, JE-002, etc.
  date: timestamp('date').notNull(),
  reference: text('reference'), // Invoice number, check number, etc.
  description: text('description').notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  source: text('source'), // manual, auto, integration
  sourceId: text('source_id'), // Reference to source transaction/integration
  status: text('status').default('posted'), // draft, posted, reversed
  reversedBy: integer('reversed_by').references(() => journalEntries.id),
  reversalReason: text('reversal_reason'),
  attachments: json('attachments'), // File attachments
  metadata: json('metadata'),
  createdBy: text('created_by'), // user_id or system
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('journal_entries_user_id_idx').on(table.userId),
  dateIdx: index('journal_entries_date_idx').on(table.date),
  entryNumberIdx: index('journal_entries_entry_number_idx').on(table.entryNumber),
  statusIdx: index('journal_entries_status_idx').on(table.status),
}));

export const journalEntryLines = pgTable('journal_entry_lines', {
  id: serial('id').primaryKey(),
  journalEntryId: integer('journal_entry_id').references(() => journalEntries.id).notNull(),
  accountId: integer('account_id').references(() => chartOfAccounts.id).notNull(),
  description: text('description'),
  debitAmount: decimal('debit_amount', { precision: 15, scale: 2 }).default('0'),
  creditAmount: decimal('credit_amount', { precision: 15, scale: 2 }).default('0'),
  lineNumber: integer('line_number').notNull(),
  reference: text('reference'), // Additional reference for this line
  projectId: integer('project_id').references(() => projects.id),
  tags: json('tags'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  journalEntryIdIdx: index('journal_entry_lines_journal_entry_id_idx').on(table.journalEntryId),
  accountIdIdx: index('journal_entry_lines_account_id_idx').on(table.accountId),
}));

export const bankAccounts = pgTable('bank_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  accountId: integer('account_id').references(() => chartOfAccounts.id), // Links to chart of accounts
  name: text('name').notNull(),
  bankName: text('bank_name'),
  accountNumber: text('account_number'), // Encrypted/masked
  routingNumber: text('routing_number'),
  accountType: text('account_type'), // checking, savings, credit, etc.
  currency: text('currency').default('USD'),
  currentBalance: decimal('current_balance', { precision: 15, scale: 2 }).default('0'),
  availableBalance: decimal('available_balance', { precision: 15, scale: 2 }).default('0'),
  lastReconciledDate: timestamp('last_reconciled_date'),
  lastReconciledBalance: decimal('last_reconciled_balance', { precision: 15, scale: 2 }),
  isActive: boolean('is_active').default(true),
  integrationId: integer('integration_id').references(() => integrations.id),
  externalAccountId: text('external_account_id'),
  syncEnabled: boolean('sync_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('bank_accounts_user_id_idx').on(table.userId),
}));

export const bankTransactions = pgTable('bank_transactions', {
  id: serial('id').primaryKey(),
  bankAccountId: integer('bank_account_id').references(() => bankAccounts.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  transactionId: text('transaction_id'), // Bank's transaction ID
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  type: text('type').notNull(), // debit, credit
  category: text('category'), // ATM, transfer, deposit, etc.
  balance: decimal('balance', { precision: 15, scale: 2 }),
  status: text('status').default('posted'), // pending, posted, cancelled
  isReconciled: boolean('is_reconciled').default(false),
  reconciledDate: timestamp('reconciled_date'),
  journalEntryId: integer('journal_entry_id').references(() => journalEntries.id),
  matchedTransactionId: integer('matched_transaction_id').references(() => transactions.id),
  autoCategorizationConfidence: decimal('auto_categorization_confidence', { precision: 3, scale: 2 }),
  memo: text('memo'),
  checkNumber: text('check_number'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  bankAccountIdIdx: index('bank_transactions_bank_account_id_idx').on(table.bankAccountId),
  userIdIdx: index('bank_transactions_user_id_idx').on(table.userId),
  dateIdx: index('bank_transactions_date_idx').on(table.date),
  reconciledIdx: index('bank_transactions_reconciled_idx').on(table.isReconciled),
}));

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  projectId: integer('project_id').references(() => projects.id),
  invoiceNumber: text('invoice_number').notNull(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email'),
  clientAddress: json('client_address'),
  status: text('status').default('draft'), // draft, sent, paid, overdue, cancelled
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0'),
  currency: text('currency').default('USD'),
  notes: text('notes'),
  terms: text('terms'),
  lineItems: json('line_items'), // Array of invoice line items
  paymentTerms: text('payment_terms'),
  stripeInvoiceId: text('stripe_invoice_id'),
  journalEntryId: integer('journal_entry_id').references(() => journalEntries.id),
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('invoices_user_id_idx').on(table.userId),
  statusIdx: index('invoices_status_idx').on(table.status),
  dueDateIdx: index('invoices_due_date_idx').on(table.dueDate),
  invoiceNumberIdx: index('invoices_invoice_number_idx').on(table.invoiceNumber),
}));

export const bills = pgTable('bills', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  projectId: integer('project_id').references(() => projects.id),
  vendorName: text('vendor_name').notNull(),
  vendorEmail: text('vendor_email'),
  billNumber: text('bill_number'),
  referenceNumber: text('reference_number'),
  status: text('status').default('pending'), // pending, approved, paid, overdue
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0'),
  currency: text('currency').default('USD'),
  description: text('description'),
  lineItems: json('line_items'), // Array of bill line items
  attachments: json('attachments'), // File attachments
  journalEntryId: integer('journal_entry_id').references(() => journalEntries.id),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at'),
  paidAt: timestamp('paid_at'),
  paymentMethod: text('payment_method'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('bills_user_id_idx').on(table.userId),
  statusIdx: index('bills_status_idx').on(table.status),
  dueDateIdx: index('bills_due_date_idx').on(table.dueDate),
  vendorNameIdx: index('bills_vendor_name_idx').on(table.vendorName),
}));

export const taxSettings = pgTable('tax_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  taxYear: integer('tax_year').notNull(),
  businessType: text('business_type'), // sole_proprietorship, llc, corporation, etc.
  federalTaxId: text('federal_tax_id'), // EIN
  stateTaxId: text('state_tax_id'),
  fiscalYearEnd: text('fiscal_year_end'), // MM-DD format
  taxJurisdictions: json('tax_jurisdictions'), // Federal, state, local tax info
  settings: json('settings'), // Tax-specific configurations
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('tax_settings_user_id_idx').on(table.userId),
  taxYearIdx: index('tax_settings_tax_year_idx').on(table.taxYear),
}));

export const reconciliations = pgTable('reconciliations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  bankAccountId: integer('bank_account_id').references(() => bankAccounts.id).notNull(),
  statementDate: timestamp('statement_date').notNull(),
  statementBalance: decimal('statement_balance', { precision: 15, scale: 2 }).notNull(),
  bookBalance: decimal('book_balance', { precision: 15, scale: 2 }).notNull(),
  adjustedBalance: decimal('adjusted_balance', { precision: 15, scale: 2 }).notNull(),
  status: text('status').default('in_progress'), // in_progress, completed, needs_review
  reconciledTransactions: json('reconciled_transactions'), // Array of reconciled transaction IDs
  outstandingDeposits: json('outstanding_deposits'),
  outstandingChecks: json('outstanding_checks'),
  adjustments: json('adjustments'),
  notes: text('notes'),
  completedBy: text('completed_by'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('reconciliations_user_id_idx').on(table.userId),
  bankAccountIdIdx: index('reconciliations_bank_account_id_idx').on(table.bankAccountId),
  statementDateIdx: index('reconciliations_statement_date_idx').on(table.statementDate),
}));

export const reportDefinitions = pgTable('report_definitions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // balance_sheet, income_statement, cash_flow, custom
  description: text('description'),
  filters: json('filters'), // Date ranges, account filters, etc.
  columns: json('columns'), // Report column definitions
  formatting: json('formatting'), // Display formatting options
  schedule: json('schedule'), // Automated report schedule
  isTemplate: boolean('is_template').default(false),
  isPublic: boolean('is_public').default(false),
  lastGenerated: timestamp('last_generated'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('report_definitions_user_id_idx').on(table.userId),
  typeIdx: index('report_definitions_type_idx').on(table.type),
}));

// Compliance Monitoring and Alerts
export const complianceMonitoring = pgTable('compliance_monitoring', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  jurisdictionId: integer('jurisdiction_id').references(() => jurisdictions.id).notNull(),
  complianceType: text('compliance_type').notNull(), // tax, regulatory, corporate, employment
  ruleName: text('rule_name').notNull(),
  description: text('description'),
  frequency: text('frequency').notNull(), // daily, weekly, monthly, quarterly, annually
  lastCheckDate: timestamp('last_check_date'),
  nextCheckDate: timestamp('next_check_date').notNull(),
  status: text('status').default('pending'), // compliant, non_compliant, warning, pending, error
  findings: json('findings'), // Compliance issues found
  riskLevel: text('risk_level').default('medium'), // low, medium, high, critical
  assignedTo: integer('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date'),
  completedDate: timestamp('completed_date'),
  evidence: json('evidence'), // Supporting documentation
  remediation: json('remediation'), // Remediation actions taken/required
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityJurisdictionIdx: index('compliance_monitoring_entity_jurisdiction_idx').on(table.entityId, table.jurisdictionId),
  statusIdx: index('compliance_monitoring_status_idx').on(table.status),
  nextCheckIdx: index('compliance_monitoring_next_check_idx').on(table.nextCheckDate),
  riskIdx: index('compliance_monitoring_risk_idx').on(table.riskLevel),
}));

// Regulatory Filings and Submissions
export const regulatoryFilings = pgTable('regulatory_filings', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  jurisdictionId: integer('jurisdiction_id').references(() => jurisdictions.id).notNull(),
  filingType: text('filing_type').notNull(), // tax_return, annual_report, registration_renewal
  formNumber: text('form_number'), // 1120, 1065, 990, etc.
  filingPeriod: text('filing_period').notNull(), // 2024-Q1, 2024-annual, etc.
  dueDate: timestamp('due_date').notNull(),
  extensionDate: timestamp('extension_date'),
  status: text('status').default('pending'), // pending, in_progress, filed, overdue, rejected
  preparedBy: integer('prepared_by').references(() => users.id),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  filedDate: timestamp('filed_date'),
  confirmationNumber: text('confirmation_number'),
  filingData: json('filing_data'), // The actual filing content
  attachments: json('attachments'), // Supporting documents
  feeAmount: decimal('fee_amount', { precision: 10, scale: 2 }),
  feePaid: boolean('fee_paid').default(false),
  isAmended: boolean('is_amended').default(false),
  originalFilingId: integer('original_filing_id').references(() => regulatoryFilings.id),
  penalties: json('penalties'), // Late filing penalties
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityJurisdictionIdx: index('regulatory_filings_entity_jurisdiction_idx').on(table.entityId, table.jurisdictionId),
  statusIdx: index('regulatory_filings_status_idx').on(table.status),
  dueDateIdx: index('regulatory_filings_due_date_idx').on(table.dueDate),
  typeIdx: index('regulatory_filings_type_idx').on(table.filingType),
}));

// Multi-Jurisdiction Reporting
export const consolidatedReports = pgTable('consolidated_reports', {
  id: serial('id').primaryKey(),
  parentEntityId: integer('parent_entity_id').references(() => entities.id).notNull(),
  reportType: text('report_type').notNull(), // consolidated_financial, tax_consolidated, regulatory
  reportName: text('report_name').notNull(),
  reportingPeriod: text('reporting_period').notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  includedEntities: json('included_entities').notNull(), // Array of entity IDs
  eliminationEntries: json('elimination_entries'), // Inter-company eliminations
  reportData: json('report_data').notNull(), // Consolidated financial data
  methodology: text('methodology'), // Consolidation method used
  currency: text('currency').default('USD'),
  exchangeRates: json('exchange_rates'), // Currency conversion rates
  status: text('status').default('draft'), // draft, final, filed, archived
  preparedBy: integer('prepared_by').references(() => users.id),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  approvalDate: timestamp('approval_date'),
  generatedAt: timestamp('generated_at').defaultNow(),
  version: integer('version').default(1),
  previousVersionId: integer('previous_version_id').references(() => consolidatedReports.id),
  auditTrail: json('audit_trail'), // Changes and approvals
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  parentEntityIdx: index('consolidated_reports_parent_entity_idx').on(table.parentEntityId),
  typeIdx: index('consolidated_reports_type_idx').on(table.reportType),
  periodIdx: index('consolidated_reports_period_idx').on(table.reportingPeriod),
  statusIdx: index('consolidated_reports_status_idx').on(table.status),
}));

// Inter-Entity Transactions
export const interEntityTransactions = pgTable('inter_entity_transactions', {
  id: serial('id').primaryKey(),
  fromEntityId: integer('from_entity_id').references(() => entities.id).notNull(),
  toEntityId: integer('to_entity_id').references(() => entities.id).notNull(),
  transactionType: text('transaction_type').notNull(), // loan, service, royalty, management_fee, distribution
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: text('currency').default('USD'),
  description: text('description').notNull(),
  contractReference: text('contract_reference'), // Reference to underlying agreement
  transferPricingMethod: text('transfer_pricing_method'), // arms_length, cost_plus, market_based
  fromJournalEntryId: integer('from_journal_entry_id').references(() => journalEntries.id),
  toJournalEntryId: integer('to_journal_entry_id').references(() => journalEntries.id),
  eliminationEntryId: integer('elimination_entry_id').references(() => journalEntries.id),
  approvalRequestId: integer('approval_request_id').references(() => approvalRequests.id),
  status: text('status').default('pending'), // pending, approved, posted, eliminated
  effectiveDate: timestamp('effective_date').notNull(),
  taxImplications: json('tax_implications'), // Tax considerations
  complianceFlags: json('compliance_flags'), // Regulatory considerations
  documentationRequired: boolean('documentation_required').default(true),
  documentationComplete: boolean('documentation_complete').default(false),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  fromEntityIdx: index('inter_entity_transactions_from_entity_idx').on(table.fromEntityId),
  toEntityIdx: index('inter_entity_transactions_to_entity_idx').on(table.toEntityId),
  typeIdx: index('inter_entity_transactions_type_idx').on(table.transactionType),
  statusIdx: index('inter_entity_transactions_status_idx').on(table.status),
  effectiveDateIdx: index('inter_entity_transactions_effective_date_idx').on(table.effectiveDate),
}));

// Audit Trails and SOX Controls
export const auditTrails = pgTable('audit_trails', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  tableAffected: text('table_affected').notNull(),
  recordId: text('record_id').notNull(),
  action: text('action').notNull(), // create, update, delete, approve, reject
  oldValues: json('old_values'), // Previous values
  newValues: json('new_values'), // New values
  changedFields: json('changed_fields'), // List of fields changed
  userId: integer('user_id').references(() => users.id).notNull(),
  userRole: text('user_role').notNull(),
  sessionId: text('session_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  businessJustification: text('business_justification'),
  controlFramework: text('control_framework'), // sox, pcaob, internal
  riskAssessment: text('risk_assessment'), // low, medium, high
  requiresReview: boolean('requires_review').default(false),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewComments: text('review_comments'),
  retentionDate: timestamp('retention_date').notNull(),
  isArchived: boolean('is_archived').default(false),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  entityIdx: index('audit_trails_entity_idx').on(table.entityId),
  tableRecordIdx: index('audit_trails_table_record_idx').on(table.tableAffected, table.recordId),
  userIdx: index('audit_trails_user_idx').on(table.userId),
  actionIdx: index('audit_trails_action_idx').on(table.action),
  createdAtIdx: index('audit_trails_created_at_idx').on(table.createdAt),
  requiresReviewIdx: index('audit_trails_requires_review_idx').on(table.requiresReview),
}));

// Document Management and Governance
export const governanceDocuments = pgTable('governance_documents', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id).notNull(),
  documentType: text('document_type').notNull(), // operating_agreement, bylaws, board_resolution, policy
  title: text('title').notNull(),
  description: text('description'),
  version: text('version').notNull(),
  status: text('status').default('draft'), // draft, active, superseded, archived
  effectiveDate: timestamp('effective_date'),
  expirationDate: timestamp('expiration_date'),
  documentContent: text('document_content'), // Actual document text or reference
  fileLocation: text('file_location'), // File storage location
  digitalSignatures: json('digital_signatures'), // Array of signatures
  requiredSignatures: json('required_signatures'), // Required signatories
  isExecuted: boolean('is_executed').default(false),
  executionDate: timestamp('execution_date'),
  notarization: json('notarization'), // Notarization details
  legalReview: json('legal_review'), // Legal review details
  complianceReview: json('compliance_review'), // Compliance review
  accessLevel: text('access_level').default('entity'), // public, entity, restricted, confidential
  retentionPeriod: integer('retention_period'), // Years to retain
  tags: json('tags'), // Document tags for organization
  createdBy: integer('created_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityTypeIdx: index('governance_documents_entity_type_idx').on(table.entityId, table.documentType),
  statusIdx: index('governance_documents_status_idx').on(table.status),
  effectiveDateIdx: index('governance_documents_effective_date_idx').on(table.effectiveDate),
}));

export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => entities.id),
  userId: integer('user_id').references(() => users.id).notNull(),
  action: text('action').notNull(), // login, transaction_added, integration_connected, etc.
  entityType: text('entity_type'), // transaction, project, integration, journal_entry, etc.
  recordId: text('record_id'),
  details: json('details'), // Additional context about the action
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  complianceLevel: text('compliance_level'), // Track compliance-relevant actions
  riskLevel: text('risk_level'), // Track risk level of actions
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  entityIdIdx: index('activity_log_entity_id_idx').on(table.entityId),
  userIdIdx: index('activity_log_user_id_idx').on(table.userId),
  actionIdx: index('activity_log_action_idx').on(table.action),
  createdAtIdx: index('activity_log_created_at_idx').on(table.createdAt),
  complianceIdx: index('activity_log_compliance_idx').on(table.complianceLevel),
}));