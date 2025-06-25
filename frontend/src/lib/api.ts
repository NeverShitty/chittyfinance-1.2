import { useAuth } from '@clerk/clerk-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class APIClient {
  async request(endpoint: string, options: RequestInit = {}, token?: string) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Health Check
  async getHealth() {
    return this.request('/health');
  }
}

export const apiClient = new APIClient();

// Custom hook for API calls with authentication
export function useAPIClient() {
  const { getToken } = useAuth();

  const makeAuthenticatedRequest = async (
    apiCall: (token: string) => Promise<any>
  ) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token available');
      return await apiCall(token);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  return {
    makeAuthenticatedRequest,
  };
}