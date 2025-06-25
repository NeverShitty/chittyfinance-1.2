import { Router } from 'express';
import { requireAuth } from '@clerk/express';
import { db } from '../db';
import { users, entities, userEntityRoles, approvalRequests, governanceActions } from '../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { multiEntityGovernanceService } from '../services/multi-entity-governance';

const router = Router();

// Entity Management Routes
router.post('/entities', requireAuth(), async (req, res) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    const entityData = req.body;
    
    // Validate required fields
    if (!entityData.name || !entityData.legalName || !entityData.entityType || 
        !entityData.stateOfIncorporation || !entityData.fiscalYearEnd) {
      return res.status(400).json({ error: 'Missing required entity fields' });
    }

    const entityId = await multiEntityGovernanceService.createEntity(entityData, user[0].id);

    // Grant creator full access to the new entity
    await multiEntityGovernanceService.grantEntityAccess(
      user[0].id,
      entityId,
      'owner',
      ['*'], // All permissions
      'full',
      user[0].id
    );

    res.status(201).json({ 
      success: true, 
      entityId,
      message: 'Entity created successfully'
    });
  } catch (error) {
    console.error('Entity creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create entity' });
  }
});

router.get('/entities', requireAuth(), async (req, res) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    const userEntities = await multiEntityGovernanceService.getUserEntitiesWithRoles(user[0].id);

    res.json({
      success: true,
      entities: userEntities
    });
  } catch (error) {
    console.error('Get entities error:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

router.get('/entities/:entityId/hierarchy', requireAuth(), async (req, res) => {
  try {
    const { entityId } = req.params;
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check access to entity
    const hasAccess = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      parseInt(entityId), 
      'view_hierarchy'
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to entity hierarchy' });
    }

    const hierarchy = await multiEntityGovernanceService.getEntityHierarchy(parseInt(entityId));

    res.json({
      success: true,
      hierarchy
    });
  } catch (error) {
    console.error('Get entity hierarchy error:', error);
    res.status(500).json({ error: 'Failed to fetch entity hierarchy' });
  }
});

// User Access Management Routes
router.post('/entities/:entityId/users', requireAuth(), async (req, res) => {
  try {
    const { entityId } = req.params;
    const { userEmail, role, permissions, accessLevel } = req.body;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check if current user can grant access
    const canGrantAccess = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      parseInt(entityId), 
      'manage_users'
    );

    if (!canGrantAccess) {
      return res.status(403).json({ error: 'Access denied to manage users' });
    }

    // Find target user
    const targetUser = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (!targetUser.length) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    await multiEntityGovernanceService.grantEntityAccess(
      targetUser[0].id,
      parseInt(entityId),
      role,
      permissions,
      accessLevel,
      user[0].id
    );

    res.json({
      success: true,
      message: 'User access granted successfully'
    });
  } catch (error) {
    console.error('Grant access error:', error);
    res.status(500).json({ error: 'Failed to grant user access' });
  }
});

router.get('/entities/:entityId/users', requireAuth(), async (req, res) => {
  try {
    const { entityId } = req.params;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check access
    const hasAccess = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      parseInt(entityId), 
      'view_users'
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to view users' });
    }

    const entityUsers = await db.select({
      userId: userEntityRoles.userId,
      userEmail: users.email,
      userName: users.firstName,
      role: userEntityRoles.role,
      permissions: userEntityRoles.permissions,
      accessLevel: userEntityRoles.accessLevel,
      isActive: userEntityRoles.isActive,
      effectiveDate: userEntityRoles.effectiveDate,
      expirationDate: userEntityRoles.expirationDate,
    })
    .from(userEntityRoles)
    .innerJoin(users, eq(userEntityRoles.userId, users.id))
    .where(and(
      eq(userEntityRoles.entityId, parseInt(entityId)),
      eq(userEntityRoles.isActive, true)
    ));

    res.json({
      success: true,
      users: entityUsers
    });
  } catch (error) {
    console.error('Get entity users error:', error);
    res.status(500).json({ error: 'Failed to fetch entity users' });
  }
});

// Governance Rules Routes
router.post('/entities/:entityId/governance-rules', requireAuth(), async (req, res) => {
  try {
    const { entityId } = req.params;
    const ruleData = req.body;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check permissions
    const canManageRules = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      parseInt(entityId), 
      'manage_governance'
    );

    if (!canManageRules) {
      return res.status(403).json({ error: 'Access denied to manage governance rules' });
    }

    const ruleId = await multiEntityGovernanceService.createGovernanceRule({
      entityId: parseInt(entityId),
      ...ruleData
    }, user[0].id);

    res.status(201).json({
      success: true,
      ruleId,
      message: 'Governance rule created successfully'
    });
  } catch (error) {
    console.error('Create governance rule error:', error);
    res.status(500).json({ error: 'Failed to create governance rule' });
  }
});

// Approval Workflow Routes
router.post('/entities/:entityId/approval-requests', requireAuth(), async (req, res) => {
  try {
    const { entityId } = req.params;
    const { requestType, referenceId, title, description, requestData } = req.body;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check if user can create approval requests
    const canCreateRequests = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      parseInt(entityId), 
      'create_requests'
    );

    if (!canCreateRequests) {
      return res.status(403).json({ error: 'Access denied to create approval requests' });
    }

    const approvalRequestId = await multiEntityGovernanceService.requestApproval(
      parseInt(entityId),
      requestType,
      referenceId,
      title,
      description,
      requestData,
      user[0].id
    );

    res.status(201).json({
      success: true,
      approvalRequestId,
      message: 'Approval request created successfully'
    });
  } catch (error) {
    console.error('Create approval request error:', error);
    res.status(500).json({ error: error.message || 'Failed to create approval request' });
  }
});

router.get('/entities/:entityId/approval-requests', requireAuth(), async (req, res) => {
  try {
    const { entityId } = req.params;
    const { status, assignedTo } = req.query;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check access
    const hasAccess = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      parseInt(entityId), 
      'view_requests'
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to view approval requests' });
    }

    let whereConditions = [eq(approvalRequests.entityId, parseInt(entityId))];
    
    if (status) {
      whereConditions.push(eq(approvalRequests.status, status as string));
    }

    const requests = await db.select({
      id: approvalRequests.id,
      requestType: approvalRequests.requestType,
      title: approvalRequests.title,
      description: approvalRequests.description,
      status: approvalRequests.status,
      currentApprovalStep: approvalRequests.currentApprovalStep,
      totalApprovalSteps: approvalRequests.totalApprovalSteps,
      dueDate: approvalRequests.dueDate,
      requestedBy: users.firstName,
      requestedByEmail: users.email,
      createdAt: approvalRequests.createdAt,
    })
    .from(approvalRequests)
    .innerJoin(users, eq(approvalRequests.requestedBy, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(approvalRequests.createdAt));

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Get approval requests error:', error);
    res.status(500).json({ error: 'Failed to fetch approval requests' });
  }
});

router.post('/approval-requests/:requestId/actions', requireAuth(), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { actionType, comments, attachments } = req.body;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    if (!['approve', 'reject', 'delegate', 'request_info'].includes(actionType)) {
      return res.status(400).json({ error: 'Invalid action type' });
    }

    const result = await multiEntityGovernanceService.processApproval(
      parseInt(requestId),
      actionType,
      user[0].id,
      comments,
      attachments
    );

    res.json({
      success: true,
      completed: result.completed,
      nextStep: result.nextStep,
      message: `Approval ${actionType} processed successfully`
    });
  } catch (error) {
    console.error('Process approval error:', error);
    res.status(500).json({ error: error.message || 'Failed to process approval' });
  }
});

// Compliance Monitoring Routes
router.post('/entities/:entityId/compliance/initialize', requireAuth(), async (req, res) => {
  try {
    const { entityId } = req.params;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check permissions
    const canManageCompliance = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      parseInt(entityId), 
      'manage_compliance'
    );

    if (!canManageCompliance) {
      return res.status(403).json({ error: 'Access denied to manage compliance' });
    }

    await multiEntityGovernanceService.initializeJurisdictionCompliance(parseInt(entityId));

    res.json({
      success: true,
      message: 'Jurisdiction compliance initialized successfully'
    });
  } catch (error) {
    console.error('Initialize compliance error:', error);
    res.status(500).json({ error: 'Failed to initialize compliance monitoring' });
  }
});

router.post('/entities/:entityId/compliance/check', requireAuth(), async (req, res) => {
  try {
    const { entityId } = req.params;
    const { jurisdictionId } = req.body;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check permissions
    const canRunCompliance = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      parseInt(entityId), 
      'run_compliance'
    );

    if (!canRunCompliance) {
      return res.status(403).json({ error: 'Access denied to run compliance checks' });
    }

    const result = await multiEntityGovernanceService.runComplianceCheck(
      parseInt(entityId), 
      jurisdictionId ? parseInt(jurisdictionId) : undefined
    );

    res.json({
      success: true,
      complianceResult: result
    });
  } catch (error) {
    console.error('Run compliance check error:', error);
    res.status(500).json({ error: 'Failed to run compliance check' });
  }
});

// Inter-Entity Transaction Routes
router.post('/inter-entity-transactions', requireAuth(), async (req, res) => {
  try {
    const { 
      fromEntityId, 
      toEntityId, 
      transactionType, 
      amount, 
      description, 
      effectiveDate,
      contractReference 
    } = req.body;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check permissions for both entities
    const canCreateFromEntity = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      fromEntityId, 
      'create_inter_entity_transactions'
    );

    const canCreateToEntity = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      toEntityId, 
      'receive_inter_entity_transactions'
    );

    if (!canCreateFromEntity || !canCreateToEntity) {
      return res.status(403).json({ error: 'Access denied to create inter-entity transaction' });
    }

    const transactionId = await multiEntityGovernanceService.createInterEntityTransaction(
      fromEntityId,
      toEntityId,
      transactionType,
      amount,
      description,
      new Date(effectiveDate),
      user[0].id,
      contractReference
    );

    res.status(201).json({
      success: true,
      transactionId,
      message: 'Inter-entity transaction created successfully'
    });
  } catch (error) {
    console.error('Create inter-entity transaction error:', error);
    res.status(500).json({ error: 'Failed to create inter-entity transaction' });
  }
});

// Consolidated Reporting Routes
router.post('/entities/:parentEntityId/consolidated-reports', requireAuth(), async (req, res) => {
  try {
    const { parentEntityId } = req.params;
    const { reportType, periodStart, periodEnd, includedEntityIds } = req.body;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check permissions for consolidated reporting
    const canCreateReports = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      parseInt(parentEntityId), 
      'create_consolidated_reports'
    );

    if (!canCreateReports) {
      return res.status(403).json({ error: 'Access denied to create consolidated reports' });
    }

    // Verify access to all included entities
    for (const entityId of includedEntityIds) {
      const hasEntityAccess = await multiEntityGovernanceService.checkUserEntityAccess(
        user[0].id, 
        entityId, 
        'include_in_consolidation'
      );
      if (!hasEntityAccess) {
        return res.status(403).json({ 
          error: `Access denied to include entity ${entityId} in consolidation` 
        });
      }
    }

    const reportId = await multiEntityGovernanceService.generateConsolidatedReport(
      parseInt(parentEntityId),
      reportType,
      new Date(periodStart),
      new Date(periodEnd),
      includedEntityIds,
      user[0].id
    );

    res.status(201).json({
      success: true,
      reportId,
      message: 'Consolidated report generated successfully'
    });
  } catch (error) {
    console.error('Generate consolidated report error:', error);
    res.status(500).json({ error: 'Failed to generate consolidated report' });
  }
});

// Audit Trail Routes
router.get('/entities/:entityId/audit-trail', requireAuth(), async (req, res) => {
  try {
    const { entityId } = req.params;
    const { startDate, endDate, action, tableAffected, limit = 100 } = req.query;
    const userId = (req as any).auth?.userId;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    // Check permissions to view audit trail
    const canViewAudit = await multiEntityGovernanceService.checkUserEntityAccess(
      user[0].id, 
      parseInt(entityId), 
      'view_audit_trail'
    );

    if (!canViewAudit) {
      return res.status(403).json({ error: 'Access denied to view audit trail' });
    }

    // Build query conditions
    let whereConditions = [eq(approvalRequests.entityId, parseInt(entityId))];
    
    // Add additional filters as needed
    
    // For now, return a mock response
    const auditEntries = [
      {
        id: 1,
        timestamp: new Date(),
        action: 'create',
        table: 'entities',
        recordId: entityId,
        userId: user[0].id,
        userEmail: user[0].email,
        changes: ['name', 'entityType'],
        businessJustification: 'Entity creation'
      }
    ];

    res.json({
      success: true,
      auditEntries,
      totalCount: auditEntries.length
    });
  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

export default router;