import React, { useState, useEffect } from 'react';
import { useAPIClient } from '@/lib/api';
// Temporarily disable charts to fix build
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   PieChart,
//   Pie,
//   Cell
// } from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  // Users,
  CreditCard,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Zap,
  Brain,
  BarChart3,
  Settings,
  RefreshCw,
  Building2,
  Shield,
  Network,
  ChevronDown
} from 'lucide-react';

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashFlow: number;
  recurringRevenue: number;
  accountsReceivable: number;
  accountsPayable: number;
  bankBalance: number;
}

interface Entity {
  entityId: number;
  entityName: string;
  entityType: string;
  role: string;
  accessLevel: string;
  stateOfIncorporation: string;
  complianceLevel: string;
}

interface ComplianceStatus {
  entityId: number;
  compliant: number;
  nonCompliant: number;
  warnings: number;
  totalChecks: number;
}

interface DashboardCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Dashboard() {
  const apiClient = useAPIClient();
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [_mcpStatus, setMCPStatus] = useState<any>(null);
  const [userEntities, setUserEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [_complianceStatus, _setComplianceStatus] = useState<ComplianceStatus[]>([]);
  const [showEntitySelector, setShowEntitySelector] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user entities and multi-entity data
      const [_analysisResponse, mcpFeaturesResponse, entitiesResponse] = await Promise.all([
        Promise.resolve(null), // Disabled for now
        Promise.resolve(null), // Disabled for now
        apiClient.makeAuthenticatedRequest((token) =>
          fetch('/api/governance/entities', {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(res => res.json())
        ).catch(() => ({ entities: [] }))
      ]);

      // Set user entities and select first entity if available
      if (entitiesResponse?.entities?.length > 0) {
        setUserEntities(entitiesResponse.entities);
        if (!selectedEntity) {
          setSelectedEntity(entitiesResponse.entities[0]);
        }
      }

      // Mock data for demo purposes - replace with real API data
      setMetrics({
        totalRevenue: 85420.50,
        totalExpenses: 42380.25,
        netIncome: 43040.25,
        cashFlow: 38950.75,
        recurringRevenue: 15240.00,
        accountsReceivable: 12850.00,
        accountsPayable: 8430.00,
        bankBalance: 156420.50
      });

      setRecentActivity([
        { id: 1, type: 'reconciliation', description: 'Bank reconciliation completed', status: 'completed', timestamp: '2 hours ago' },
        { id: 2, type: 'report', description: 'Monthly P&L generated', status: 'completed', timestamp: '4 hours ago' },
        { id: 3, type: 'automation', description: 'Transaction categorization running', status: 'in_progress', timestamp: '6 hours ago' },
        { id: 4, type: 'compliance', description: 'Tax compliance check passed', status: 'completed', timestamp: '1 day ago' },
      ]);

      setMCPStatus(mcpFeaturesResponse);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardCards: DashboardCard[] = metrics ? [
    {
      title: 'Total Revenue',
      value: `$${metrics.totalRevenue.toLocaleString()}`,
      change: '+12.5%',
      trend: 'up',
      icon: <DollarSign className="h-6 w-6" />,
      color: 'text-green-600'
    },
    {
      title: 'Net Income',
      value: `$${metrics.netIncome.toLocaleString()}`,
      change: '+8.2%',
      trend: 'up',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'text-green-600'
    },
    {
      title: 'Cash Flow',
      value: `$${metrics.cashFlow.toLocaleString()}`,
      change: '+15.3%',
      trend: 'up',
      icon: <Activity className="h-6 w-6" />,
      color: 'text-blue-600'
    },
    {
      title: 'Bank Balance',
      value: `$${metrics.bankBalance.toLocaleString()}`,
      change: '+5.7%',
      trend: 'up',
      icon: <CreditCard className="h-6 w-6" />,
      color: 'text-purple-600'
    }
  ] : [];

  const revenueData = [
    { month: 'Jan', revenue: 65000, expenses: 35000 },
    { month: 'Feb', revenue: 72000, expenses: 38000 },
    { month: 'Mar', revenue: 68000, expenses: 36000 },
    { month: 'Apr', revenue: 81000, expenses: 42000 },
    { month: 'May', revenue: 85000, expenses: 41000 },
    { month: 'Jun', revenue: 85420, expenses: 42380 },
  ];

  const expenseBreakdown = [
    { name: 'Software & SaaS', value: 15420, color: '#0088FE' },
    { name: 'Payroll', value: 12680, color: '#00C49F' },
    { name: 'Marketing', value: 8940, color: '#FFBB28' },
    { name: 'Office & Operations', value: 5340, color: '#FF8042' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">ChittyFinance</h1>
              <span className="ml-2 text-sm text-gray-500">v1.2</span>
              
              {/* Entity Selector */}
              {userEntities.length > 0 && (
                <div className="ml-8 relative">
                  <button
                    onClick={() => setShowEntitySelector(!showEntitySelector)}
                    className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    {selectedEntity ? selectedEntity.entityName : 'Select Entity'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </button>
                  
                  {showEntitySelector && (
                    <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="p-2">
                        {userEntities.map((entity) => (
                          <button
                            key={entity.entityId}
                            onClick={() => {
                              setSelectedEntity(entity);
                              setShowEntitySelector(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                              selectedEntity?.entityId === entity.entityId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{entity.entityName}</div>
                                <div className="text-xs text-gray-500">
                                  {entity.entityType} • {entity.stateOfIncorporation} • {entity.role}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  entity.complianceLevel === 'sox' ? 'bg-red-100 text-red-700' :
                                  entity.complianceLevel === 'enhanced' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {entity.complianceLevel}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {/* Multi-Entity Status */}
              {userEntities.length > 1 && (
                <div className="flex items-center text-sm text-gray-600">
                  <Network className="h-4 w-4 mr-1 text-blue-500" />
                  {userEntities.length} Entities
                </div>
              )}
              
              {/* Compliance Status */}
              {selectedEntity && (
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className={`h-4 w-4 mr-1 ${
                    selectedEntity.complianceLevel === 'sox' ? 'text-red-500' :
                    selectedEntity.complianceLevel === 'enhanced' ? 'text-yellow-500' :
                    'text-green-500'
                  }`} />
                  {selectedEntity.complianceLevel.toUpperCase()}
                </div>
              )}
              
              <div className="flex items-center text-sm text-gray-600">
                <Zap className="h-4 w-4 mr-1 text-yellow-500" />
                MCP Active
              </div>
              <button
                onClick={loadDashboardData}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardCards.map((card, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className={`text-sm mt-1 flex items-center ${
                    card.trend === 'up' ? 'text-green-600' : 
                    card.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {card.trend === 'up' ? <TrendingUp className="h-4 w-4 mr-1" /> : 
                     card.trend === 'down' ? <TrendingDown className="h-4 w-4 mr-1" /> : null}
                    {card.change} from last month
                  </p>
                </div>
                <div className={`${card.color}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Entity Overview Section */}
        {selectedEntity && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Entity Overview</h3>
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Entity Information</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-500">Legal Name:</span> {selectedEntity.entityName}</div>
                    <div><span className="text-gray-500">Type:</span> {selectedEntity.entityType}</div>
                    <div><span className="text-gray-500">State:</span> {selectedEntity.stateOfIncorporation}</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Your Access</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-500">Role:</span> {selectedEntity.role}</div>
                    <div><span className="text-gray-500">Access Level:</span> {selectedEntity.accessLevel}</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Compliance</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-500">Level:</span> {selectedEntity.complianceLevel}</div>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">Status:</span>
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">Compliant</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue vs Expenses Chart - Temporarily simplified */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses</h3>
            <div className="space-y-4">
              {revenueData.map((item) => (
                <div key={item.month} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{item.month}</span>
                  <div className="flex space-x-4">
                    <span className="text-blue-600">Revenue: ${item.revenue.toLocaleString()}</span>
                    <span className="text-red-600">Expenses: ${item.expenses.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Breakdown Chart - Temporarily simplified */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
            <div className="space-y-3">
              {expenseBreakdown.map((item) => (
                <div key={item.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-700">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Multi-Entity Features and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Multi-Entity Governance */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Governance</h3>
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium">Entity Management</span>
                </div>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">{userEntities.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium">Approval Workflows</span>
                </div>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <Network className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium">Inter-Entity Tracking</span>
                </div>
                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Ready</span>
              </div>
            </div>
          </div>

          {/* Compliance Monitoring */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Compliance</h3>
              <Shield className="h-5 w-5 text-green-500" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium">Multi-State Monitoring</span>
                </div>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Current</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium">Regulatory Filings</span>
                </div>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Scheduled</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 text-purple-600 mr-2" />
                  <span className="text-sm font-medium">Consolidated Reports</span>
                </div>
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">Ready</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {activity.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600 mr-3" />}
                    {activity.status === 'in_progress' && <Clock className="h-4 w-4 text-yellow-600 mr-3" />}
                    {activity.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600 mr-3" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.timestamp}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    activity.status === 'completed' ? 'bg-green-100 text-green-600' :
                    activity.status === 'in_progress' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MCP Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MCP Orchestration Status */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">MCP Orchestration</h3>
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium">Reconciliation Engine</span>
                </div>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium">Reporting Automation</span>
                </div>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Running</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium">Compliance Monitor</span>
                </div>
                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Scheduled</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <Brain className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium">AI CFO Assistant</span>
                </div>
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">Ready</span>
              </div>
            </div>
          </div>

          {/* Entity Selector Modal Click Outside Handler */}
          {showEntitySelector && (
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowEntitySelector(false)}
            />
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <button className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-blue-900">Generate Report</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-green-900">Start Reconciliation</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <Brain className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-purple-900">AI Assistant</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
              <Settings className="h-8 w-8 text-yellow-600 mb-2" />
              <span className="text-sm font-medium text-yellow-900">MCP Settings</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
              <Building2 className="h-8 w-8 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-indigo-900">Manage Entities</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
              <Shield className="h-8 w-8 text-red-600 mb-2" />
              <span className="text-sm font-medium text-red-900">Compliance Check</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}