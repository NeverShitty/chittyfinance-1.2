import { db } from '../db';
import { 
  entities, 
  userEntityRoles,
  jurisdictions,
  entityJurisdictions,
  governanceRules,
  approvalRequests,
  governanceActions,
  complianceMonitoring,
  consolidatedReports,
  interEntityTransactions,
  auditTrails,
  activityLog
} from '../db/schema';
import { eq, and, lte, asc } from 'drizzle-orm';
// import { generateFinancialAdvice } from './openai';

export interface EntityData {
  name: string;
  legalName: string;
  entityType: 'llc' | 'corporation' | 'partnership' | 'sole_proprietorship';
  subType?: string;
  ein?: string;
  stateOfIncorporation: string;
  statesOfOperation: string[];
  businessAddress: any;
  mailingAddress?: any;
  parentEntityId?: number;
  fiscalYearEnd: string;
  industryCode?: string;
  complianceLevel: 'basic' | 'standard' | 'enhanced' | 'sox';
  regulatoryRequirements?: string[];
  governanceStructure?: any;
  operatingAgreement?: any;
  capitalStructure?: any;
}

export interface GovernanceRule {
  entityId: number;
  ruleType: string;
  name: string;
  description?: string;
  conditions: any;
  approvalWorkflow: any;
  thresholds?: any;
  requiredRoles?: string[];
  effectiveDate?: Date;
  expirationDate?: Date;
}

export interface ComplianceCheck {
  entityId: number;
  jurisdictionId: number;
  complianceType: string;
  ruleName: string;
  description?: string;
  frequency: string;
  nextCheckDate: Date;
  assignedTo?: number;
  dueDate?: Date;
}

export class MultiEntityGovernanceService {

  // Entity Management
  async createEntity(entityData: EntityData, createdBy: number): Promise<number> {
    const [entity] = await db.insert(entities).values({
      name: entityData.name,
      legalName: entityData.legalName,
      entityType: entityData.entityType,
      subType: entityData.subType,
      ein: entityData.ein,
      stateOfIncorporation: entityData.stateOfIncorporation,
      statesOfOperation: entityData.statesOfOperation,
      businessAddress: entityData.businessAddress,
      mailingAddress: entityData.mailingAddress,
      parentEntityId: entityData.parentEntityId,
      fiscalYearEnd: entityData.fiscalYearEnd,
      industryCode: entityData.industryCode,
      complianceLevel: entityData.complianceLevel,
      regulatoryRequirements: entityData.regulatoryRequirements,
      governanceStructure: entityData.governanceStructure,
      operatingAgreement: entityData.operatingAgreement,
      capitalStructure: entityData.capitalStructure,
    }).returning();

    // Create audit trail
    await this.createAuditTrail({
      entityId: entity.id,
      tableAffected: 'entities',
      recordId: entity.id.toString(),
      action: 'create',
      newValues: entityData,
      userId: createdBy,
      userRole: 'admin',
      businessJustification: 'Entity creation',
      controlFramework: entityData.complianceLevel === 'sox' ? 'sox' : 'internal',
      riskAssessment: 'medium'
    });

    // Auto-create jurisdictional relationships
    await this.createEntityJurisdictions(entity.id, entityData.stateOfIncorporation, entityData.statesOfOperation);

    // Initialize default governance rules
    await this.initializeDefaultGovernanceRules(entity.id, entityData.entityType, entityData.complianceLevel);

    return entity.id;
  }

  async getUserEntitiesWithRoles(userId: number): Promise<any[]> {
    const userRoles = await db.select({
      entityId: userEntityRoles.entityId,
      entityName: entities.name,
      entityType: entities.entityType,
      role: userEntityRoles.role,
      permissions: userEntityRoles.permissions,
      accessLevel: userEntityRoles.accessLevel,
      isActive: userEntityRoles.isActive,
      stateOfIncorporation: entities.stateOfIncorporation,
      complianceLevel: entities.complianceLevel,
    })
    .from(userEntityRoles)
    .innerJoin(entities, eq(userEntityRoles.entityId, entities.id))
    .where(and(
      eq(userEntityRoles.userId, userId),
      eq(userEntityRoles.isActive, true),
      eq(entities.isActive, true)
    ))
    .orderBy(asc(entities.name));

    return userRoles;
  }

  async getEntityHierarchy(rootEntityId: number): Promise<any> {
    // Get all child entities recursively
    const allEntities = await db.select().from(entities).where(eq(entities.isActive, true));
    
    const buildHierarchy = (parentId: number | null): any[] => {
      return allEntities
        .filter(entity => entity.parentEntityId === parentId)
        .map(entity => ({
          ...entity,
          children: buildHierarchy(entity.id)
        }));
    };

    const rootEntity = allEntities.find(e => e.id === rootEntityId);
    if (!rootEntity) return null;

    return {
      ...rootEntity,
      children: buildHierarchy(rootEntityId)
    };
  }

  // User Access Control
  async grantEntityAccess(
    userId: number, 
    entityId: number, 
    role: string, 
    permissions: string[], 
    accessLevel: string,
    approvedBy: number
  ): Promise<void> {
    await db.insert(userEntityRoles).values({
      userId,
      entityId,
      role,
      permissions,
      accessLevel,
      approvedBy,
      approvedAt: new Date(),
    });

    await this.logActivity(entityId, userId, 'access_granted', 'user_entity_roles', userId.toString(), {
      role,
      permissions,
      accessLevel,
      approvedBy
    });
  }

  async checkUserEntityAccess(userId: number, entityId: number, requiredPermission: string): Promise<boolean> {
    const userRole = await db.select()
      .from(userEntityRoles)
      .where(and(
        eq(userEntityRoles.userId, userId),
        eq(userEntityRoles.entityId, entityId),
        eq(userEntityRoles.isActive, true)
      ))
      .limit(1);

    if (!userRole.length) return false;

    const permissions = userRole[0].permissions as string[];
    return permissions.includes(requiredPermission) || permissions.includes('*');
  }

  // Governance Rules and Approvals
  async createGovernanceRule(rule: GovernanceRule, createdBy: number): Promise<number> {
    const [governanceRule] = await db.insert(governanceRules).values({
      ...rule,
      createdBy,
    }).returning();

    await this.createAuditTrail({
      entityId: rule.entityId,
      tableAffected: 'governance_rules',
      recordId: governanceRule.id.toString(),
      action: 'create',
      newValues: rule,
      userId: createdBy,
      userRole: 'admin',
      businessJustification: 'Governance rule creation',
      controlFramework: 'internal',
      riskAssessment: 'medium'
    });

    return governanceRule.id;
  }

  async requestApproval(
    entityId: number,
    requestType: string,
    referenceId: string,
    title: string,
    description: string,
    requestData: any,
    requestedBy: number
  ): Promise<number> {
    // Find applicable governance rule
    const applicableRules = await db.select()
      .from(governanceRules)
      .where(and(
        eq(governanceRules.entityId, entityId),
        eq(governanceRules.ruleType, requestType),
        eq(governanceRules.isActive, true)
      ))
      .orderBy(asc(governanceRules.priority));

    if (!applicableRules.length) {
      throw new Error(`No governance rule found for ${requestType} in entity ${entityId}`);
    }

    const rule = applicableRules[0];
    const workflow = rule.approvalWorkflow as any;

    const [approvalRequest] = await db.insert(approvalRequests).values({
      entityId,
      requestType,
      referenceId,
      requestedBy,
      title,
      description,
      requestData,
      governanceRuleId: rule.id,
      totalApprovalSteps: workflow.steps.length,
      dueDate: new Date(Date.now() + (workflow.timeoutDays || 7) * 24 * 60 * 60 * 1000),
    }).returning();

    await this.logActivity(entityId, requestedBy, 'approval_requested', 'approval_requests', approvalRequest.id.toString(), {
      requestType,
      title,
      workflow: workflow.steps.length
    });

    return approvalRequest.id;
  }

  async processApproval(
    approvalRequestId: number,
    actionType: 'approve' | 'reject' | 'delegate' | 'request_info',
    performedBy: number,
    comments?: string,
    attachments?: any[]
  ): Promise<{ completed: boolean; nextStep?: any }> {
    const request = await db.select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, approvalRequestId))
      .limit(1);

    if (!request.length) {
      throw new Error('Approval request not found');
    }

    const approvalRequest = request[0];
    
    // Verify user has authority to approve
    const hasAuthority = await this.checkUserEntityAccess(
      performedBy, 
      approvalRequest.entityId, 
      'approve_requests'
    );

    if (!hasAuthority) {
      throw new Error('User does not have authority to approve this request');
    }

    // Record the governance action
    await db.insert(governanceActions).values({
      entityId: approvalRequest.entityId,
      approvalRequestId,
      actionType,
      performedBy,
      comments,
      attachments,
      ipAddress: '', // Should be passed from request
      userAgent: '', // Should be passed from request
    });

    // Update approval history
    const currentHistory = (approvalRequest.approvalHistory as any[]) || [];
    currentHistory.push({
      step: approvalRequest.currentApprovalStep,
      action: actionType,
      performedBy,
      timestamp: new Date(),
      comments
    });

    let completed = false;
    let nextStep = (approvalRequest.currentApprovalStep || 0) + 1;

    if (actionType === 'approve') {
      if (nextStep > approvalRequest.totalApprovalSteps) {
        // Approval complete
        completed = true;
        await db.update(approvalRequests)
          .set({
            status: 'approved',
            completedAt: new Date(),
            approvalHistory: currentHistory,
          })
          .where(eq(approvalRequests.id, approvalRequestId));
      } else {
        // Move to next step
        await db.update(approvalRequests)
          .set({
            currentApprovalStep: nextStep,
            approvalHistory: currentHistory,
          })
          .where(eq(approvalRequests.id, approvalRequestId));
      }
    } else if (actionType === 'reject') {
      completed = true;
      await db.update(approvalRequests)
        .set({
          status: 'rejected',
          completedAt: new Date(),
          approvalHistory: currentHistory,
        })
        .where(eq(approvalRequests.id, approvalRequestId));
    }

    await this.logActivity(
      approvalRequest.entityId, 
      performedBy, 
      `approval_${actionType}`, 
      'approval_requests', 
      approvalRequestId.toString(),
      { actionType, comments, completed }
    );

    return { completed, nextStep: completed ? undefined : nextStep };
  }

  // Multi-State Compliance
  async initializeJurisdictionCompliance(entityId: number): Promise<void> {
    const entity = await db.select().from(entities).where(eq(entities.id, entityId)).limit(1);
    if (!entity.length) throw new Error('Entity not found');

    const entityData = entity[0];
    const allStates = [entityData.stateOfIncorporation, ...(entityData.statesOfOperation as string[])];
    const uniqueStates = [...new Set(allStates)];

    for (const stateCode of uniqueStates) {
      const jurisdiction = await this.getOrCreateJurisdiction('state', stateCode);
      
      await db.insert(entityJurisdictions).values({
        entityId,
        jurisdictionId: jurisdiction.id,
        relationshipType: stateCode === entityData.stateOfIncorporation ? 'incorporation' : 'operation',
        effectiveDate: new Date(),
        status: 'active',
        complianceStatus: 'pending_review',
      }).onConflictDoNothing();

      // Create compliance monitoring rules for this jurisdiction
      await this.createJurisdictionComplianceRules(entityId, jurisdiction.id);
    }
  }

  async runComplianceCheck(entityId: number, jurisdictionId?: number): Promise<any> {
    const checks = await db.select()
      .from(complianceMonitoring)
      .where(and(
        eq(complianceMonitoring.entityId, entityId),
        jurisdictionId ? eq(complianceMonitoring.jurisdictionId, jurisdictionId) : undefined,
        eq(complianceMonitoring.isActive, true),
        lte(complianceMonitoring.nextCheckDate, new Date())
      ));

    const results = [];

    for (const check of checks) {
      const result = await this.executeComplianceCheck(check);
      results.push(result);

      // Update next check date
      const nextDate = this.calculateNextCheckDate(check.frequency);
      await db.update(complianceMonitoring)
        .set({
          lastCheckDate: new Date(),
          nextCheckDate: nextDate,
          status: result.status,
          findings: result.findings,
        })
        .where(eq(complianceMonitoring.id, check.id));
    }

    return {
      entityId,
      jurisdictionId,
      totalChecks: results.length,
      compliant: results.filter(r => r.status === 'compliant').length,
      nonCompliant: results.filter(r => r.status === 'non_compliant').length,
      warnings: results.filter(r => r.status === 'warning').length,
      results
    };
  }

  // Multi-Jurisdiction Reporting
  async generateConsolidatedReport(
    parentEntityId: number,
    reportType: string,
    periodStart: Date,
    periodEnd: Date,
    includedEntityIds: number[],
    preparedBy: number
  ): Promise<number> {
    // Collect financial data from all included entities
    const entityData = await this.collectEntityFinancialData(includedEntityIds, periodStart, periodEnd);
    
    // Identify and calculate inter-entity eliminations
    const eliminationEntries = await this.calculateEliminationEntries(includedEntityIds, periodStart, periodEnd);
    
    // Perform consolidation
    const consolidatedData = await this.performConsolidation(entityData, eliminationEntries);

    const [report] = await db.insert(consolidatedReports).values({
      parentEntityId,
      reportType,
      reportName: `${reportType} - ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
      reportingPeriod: `${periodStart.getFullYear()}-${periodStart.getMonth() + 1}`,
      periodStart,
      periodEnd,
      includedEntities: includedEntityIds,
      eliminationEntries,
      reportData: consolidatedData,
      methodology: 'full_consolidation',
      preparedBy,
    }).returning();

    await this.createAuditTrail({
      entityId: parentEntityId,
      tableAffected: 'consolidated_reports',
      recordId: report.id.toString(),
      action: 'create',
      newValues: { reportType, periodStart, periodEnd, includedEntities: includedEntityIds },
      userId: preparedBy,
      userRole: 'financial_manager',
      businessJustification: 'Consolidated financial reporting',
      controlFramework: 'sox',
      riskAssessment: 'high'
    });

    return report.id;
  }

  // Inter-Entity Transactions
  async createInterEntityTransaction(
    fromEntityId: number,
    toEntityId: number,
    transactionType: string,
    amount: number,
    description: string,
    effectiveDate: Date,
    createdBy: number,
    contractReference?: string
  ): Promise<number> {
    // Check if approval is required based on amount thresholds
    const requiresApproval = await this.checkInterEntityApprovalRequired(fromEntityId, amount);

    const [transaction] = await db.insert(interEntityTransactions).values({
      fromEntityId,
      toEntityId,
      transactionType,
      amount: amount.toString(),
      description,
      contractReference,
      effectiveDate,
      status: requiresApproval ? 'pending' : 'approved',
      createdBy,
    }).returning();

    // Create approval request if required
    if (requiresApproval) {
      await this.requestApproval(
        fromEntityId,
        'inter_entity_transaction',
        transaction.id.toString(),
        `Inter-entity ${transactionType}: $${amount.toLocaleString()}`,
        description,
        {
          fromEntityId,
          toEntityId,
          transactionType,
          amount,
          effectiveDate
        },
        createdBy
      );
    }

    await this.logActivity(fromEntityId, createdBy, 'inter_entity_transaction_created', 'inter_entity_transactions', transaction.id.toString(), {
      toEntityId,
      transactionType,
      amount,
      requiresApproval
    });

    return transaction.id;
  }

  // Audit Trails and SOX Controls
  async createAuditTrail(auditData: {
    entityId: number;
    tableAffected: string;
    recordId: string;
    action: string;
    oldValues?: any;
    newValues?: any;
    userId: number;
    userRole: string;
    businessJustification?: string;
    controlFramework?: string;
    riskAssessment?: string;
  }): Promise<void> {
    const changedFields = this.calculateChangedFields(auditData.oldValues, auditData.newValues);
    
    await db.insert(auditTrails).values({
      ...auditData,
      changedFields,
      retentionDate: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
      requiresReview: auditData.riskAssessment === 'high' || auditData.controlFramework === 'sox',
    });
  }

  // Helper Methods
  private async createEntityJurisdictions(entityId: number, incorporationState: string, operationStates: string[]): Promise<void> {
    const incorporationJurisdiction = await this.getOrCreateJurisdiction('state', incorporationState);
    
    await db.insert(entityJurisdictions).values({
      entityId,
      jurisdictionId: incorporationJurisdiction.id,
      relationshipType: 'incorporation',
      effectiveDate: new Date(),
      status: 'active',
    });

    for (const state of operationStates) {
      if (state !== incorporationState) {
        const opJurisdiction = await this.getOrCreateJurisdiction('state', state);
        await db.insert(entityJurisdictions).values({
          entityId,
          jurisdictionId: opJurisdiction.id,
          relationshipType: 'operation',
          effectiveDate: new Date(),
          status: 'active',
        });
      }
    }
  }

  private async getOrCreateJurisdiction(type: string, code: string): Promise<any> {
    const existing = await db.select().from(jurisdictions)
      .where(and(eq(jurisdictions.type, type), eq(jurisdictions.code, code)))
      .limit(1);

    if (existing.length) return existing[0];

    const [jurisdiction] = await db.insert(jurisdictions).values({
      type,
      code,
      name: this.getJurisdictionName(type, code),
    }).returning();

    return jurisdiction;
  }

  private async initializeDefaultGovernanceRules(entityId: number, entityType: string, complianceLevel: string): Promise<void> {
    const defaultRules = this.getDefaultGovernanceRules(entityType, complianceLevel);
    
    for (const rule of defaultRules) {
      await db.insert(governanceRules).values({
        entityId,
        ...rule,
      });
    }
  }

  private async executeComplianceCheck(check: any): Promise<any> {
    // Implement specific compliance checks based on check.complianceType and check.ruleName
    // This would contain the actual compliance logic
    return {
      checkId: check.id,
      status: 'compliant',
      findings: [],
      recommendations: []
    };
  }

  private calculateNextCheckDate(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly': return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'quarterly': return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      case 'annually': return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      default: return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  private async collectEntityFinancialData(entityIds: number[], periodStart: Date, periodEnd: Date): Promise<any> {
    // Collect financial data from all entities for consolidation
    return {};
  }

  private async calculateEliminationEntries(entityIds: number[], periodStart: Date, periodEnd: Date): Promise<any> {
    // Calculate inter-entity eliminations
    return {};
  }

  private async performConsolidation(entityData: any, eliminationEntries: any): Promise<any> {
    // Perform actual consolidation calculations
    return {};
  }

  private async checkInterEntityApprovalRequired(entityId: number, amount: number): Promise<boolean> {
    const rules = await db.select().from(governanceRules)
      .where(and(
        eq(governanceRules.entityId, entityId),
        eq(governanceRules.ruleType, 'inter_entity_transaction'),
        eq(governanceRules.isActive, true)
      ));

    for (const rule of rules) {
      const thresholds = rule.thresholds as any;
      if (thresholds?.amount && amount >= thresholds.amount) {
        return true;
      }
    }

    return false;
  }

  private calculateChangedFields(oldValues: any, newValues: any): string[] {
    if (!oldValues || !newValues) return [];
    
    const changed = [];
    for (const key in newValues) {
      if (oldValues[key] !== newValues[key]) {
        changed.push(key);
      }
    }
    return changed;
  }

  private getJurisdictionName(type: string, code: string): string {
    const jurisdictionNames: { [key: string]: string } = {
      'US': 'United States',
      'CA': 'California',
      'NY': 'New York',
      'TX': 'Texas',
      'FL': 'Florida',
      'DE': 'Delaware',
      // Add more as needed
    };
    return jurisdictionNames[code] || code;
  }

  private getDefaultGovernanceRules(entityType: string, complianceLevel: string): any[] {
    const baseRules = [
      {
        ruleType: 'transaction_approval',
        name: 'Large Transaction Approval',
        description: 'Requires approval for transactions over threshold',
        conditions: { transactionType: 'expense' } as any,
        approvalWorkflow: {
          steps: [
            { role: 'manager', required: true },
            { role: 'owner', required: true, threshold: 10000 }
          ],
          timeoutDays: 7
        },
        thresholds: { amount: 5000 },
        requiredRoles: ['manager', 'owner']
      }
    ];

    if (complianceLevel === 'sox') {
      baseRules.push({
        ruleType: 'financial_reporting',
        name: 'SOX Financial Reporting Controls',
        description: 'SOX compliance controls for financial reporting',
        conditions: { reportType: 'financial_statement' } as any,
        approvalWorkflow: {
          steps: [
            { role: 'financial_manager', required: true },
            { role: 'cfo', required: true },
            { role: 'ceo', required: true }
          ],
          timeoutDays: 5
        },
        thresholds: { amount: 0 },
        requiredRoles: ['financial_manager', 'cfo', 'ceo']
      });
    }

    return baseRules;
  }

  private async createJurisdictionComplianceRules(entityId: number, jurisdictionId: number): Promise<void> {
    // Create default compliance monitoring rules based on jurisdiction
    const defaultChecks = [
      {
        complianceType: 'tax',
        ruleName: 'Annual Tax Filing',
        description: 'Annual state tax return filing requirement',
        frequency: 'annually'
      },
      {
        complianceType: 'corporate',
        ruleName: 'Annual Report Filing',
        description: 'Annual corporate report filing requirement',
        frequency: 'annually'
      }
    ];

    for (const check of defaultChecks) {
      await db.insert(complianceMonitoring).values({
        entityId,
        jurisdictionId,
        ...check,
        nextCheckDate: this.calculateNextCheckDate(check.frequency),
      });
    }
  }

  private async logActivity(
    entityId: number,
    userId: number,
    action: string,
    entityType: string,
    recordId: string,
    details: any
  ): Promise<void> {
    await db.insert(activityLog).values({
      entityId,
      userId,
      action,
      entityType,
      recordId,
      details,
      complianceLevel: 'standard',
      riskLevel: 'medium'
    });
  }
}

export const multiEntityGovernanceService = new MultiEntityGovernanceService();