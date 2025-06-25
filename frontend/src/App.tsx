import { SignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './components/Dashboard'
import { Brain, Zap } from 'lucide-react'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <SignedOut>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="max-w-md w-full mx-4">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <Brain className="h-12 w-12 text-blue-600 mr-3" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">ChittyFinance</h1>
                    <p className="text-sm text-gray-600">v1.2 - Powered by ChittyServices</p>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  AI-Powered Financial Management
                </h2>
                <p className="text-gray-600 mb-6">
                  Complete bookkeeping, MCP orchestration, and intelligent CFO insights
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <Zap className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                    <p className="font-medium">MCP Automation</p>
                    <p className="text-gray-500 text-xs">Reconciliation & Reporting</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <Brain className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                    <p className="font-medium">AI CFO Assistant</p>
                    <p className="text-gray-500 text-xs">Smart Financial Insights</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <SignIn 
                  routing="hash" 
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none border-0 bg-transparent",
                    }
                  }}
                />
              </div>
              <div className="text-center mt-6">
                <p className="text-xs text-gray-500">
                  Features: Bookkeeping • LLC Capital Accounts • Tax Compliance • Governance
                </p>
              </div>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <Dashboard />
        </SignedIn>
      </div>
    </QueryClientProvider>
  )
}

export default App
