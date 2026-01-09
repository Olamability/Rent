// Backend Integration Test Page
// This page provides a UI to test backend integration and fallback mechanisms

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { shouldUseBackend } from '@/lib/apiClient';
import { testAPI, propertiesAPI, userAPI } from '@/services/backendApi';
import { fetchPublicMarketplaceListings } from '@/services/propertyServiceAdapter';

type TestResult = {
  name: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  duration?: number;
};

export function BackendIntegrationTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Backend Connection', status: 'idle' },
    { name: 'Properties API', status: 'idle' },
    { name: 'Marketplace Listings (Adapter)', status: 'idle' },
    { name: 'User API', status: 'idle' },
  ]);

  const isBackendEnabled = shouldUseBackend();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => (i === index ? { ...test, ...updates } : test)));
  };

  const runTest = async (index: number, testFn: () => Promise<unknown>) => {
    updateTest(index, { status: 'loading' });
    const startTime = Date.now();

    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTest(index, {
        status: 'success',
        message: 'Test passed',
        duration,
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const err = error as Error;
      updateTest(index, {
        status: 'error',
        message: err.message || 'Test failed',
        duration,
      });
    }
  };

  const testBackendConnection = async () => {
    const response = await testAPI.test();
    if (response.error) {
      throw new Error(response.error.message);
    }
  };

  const testPropertiesAPI = async () => {
    const response = await propertiesAPI.getProperties({ limit: 5 });
    if (response.error) {
      throw new Error(response.error.message);
    }
    if (!response.data) {
      throw new Error('No data returned');
    }
  };

  const testMarketplaceAdapter = async () => {
    const listings = await fetchPublicMarketplaceListings(5);
    if (!listings || !Array.isArray(listings)) {
      throw new Error('Invalid response from adapter');
    }
  };

  const testUserAPI = async () => {
    // This will fail if not authenticated, which is okay for testing
    const response = await userAPI.getUser('test-user-id');
    // We expect this to fail with "not authenticated" or similar
    if (response.status === 401 || response.status === 403) {
      // This is expected - backend is working but user not authenticated
      return;
    }
    if (response.error && !response.error.message.includes('not found')) {
      throw new Error(response.error.message);
    }
  };

  const runAllTests = async () => {
    await runTest(0, testBackendConnection);
    await runTest(1, testPropertiesAPI);
    await runTest(2, testMarketplaceAdapter);
    await runTest(3, testUserAPI);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Backend Integration Test</h1>
          <p className="text-muted-foreground">
            Test the connection and functionality of the rentflow-backend API integration
          </p>
        </div>

        {/* Configuration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Current backend integration settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Backend API Enabled:</span>
              <Badge variant={isBackendEnabled ? 'default' : 'secondary'}>
                {isBackendEnabled ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">API Base URL:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {apiBaseUrl || 'Not configured'}
              </code>
            </div>
            
            {!isBackendEnabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Backend API Disabled</AlertTitle>
                <AlertDescription>
                  Set <code>VITE_USE_BACKEND_API=true</code> in your environment variables to enable
                  backend integration. The app will continue using direct Supabase calls.
                </AlertDescription>
              </Alert>
            )}

            {isBackendEnabled && !apiBaseUrl && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Configuration Error</AlertTitle>
                <AlertDescription>
                  Backend API is enabled but <code>VITE_API_BASE_URL</code> is not set. Please
                  configure it in your environment variables.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Test Suite</CardTitle>
                <CardDescription>Run tests to verify backend functionality</CardDescription>
              </div>
              <Button onClick={runAllTests} disabled={!isBackendEnabled}>
                Run All Tests
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div
                  key={test.name}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test.status)}
                    <div>
                      <p className="font-medium">{test.name}</p>
                      {test.message && (
                        <p className="text-sm text-muted-foreground">{test.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {test.duration !== undefined && (
                      <span className="text-sm text-muted-foreground">{test.duration}ms</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        switch (index) {
                          case 0:
                            runTest(index, testBackendConnection);
                            break;
                          case 1:
                            runTest(index, testPropertiesAPI);
                            break;
                          case 2:
                            runTest(index, testMarketplaceAdapter);
                            break;
                          case 3:
                            runTest(index, testUserAPI);
                            break;
                        }
                      }}
                      disabled={!isBackendEnabled || test.status === 'loading'}
                    >
                      {test.status === 'loading' ? 'Testing...' : 'Run'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>How to enable backend integration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">1. Configure Environment Variables</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Add these to your <code>.env.development</code>:
              </p>
              <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
                {`VITE_USE_BACKEND_API=true
VITE_API_BASE_URL=http://localhost:3000/api`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium mb-2">2. Start the Backend</h3>
              <p className="text-sm text-muted-foreground mb-2">Clone and run the backend:</p>
              <pre className="bg-muted p-3 rounded-lg text-sm overflow-x-auto">
                {`git clone https://github.com/Olamability/rentflow-backend.git
cd rentflow-backend
npm install
npm run dev`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium mb-2">3. Restart Frontend</h3>
              <p className="text-sm text-muted-foreground">
                Restart the development server to load new environment variables.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">4. Run Tests</h3>
              <p className="text-sm text-muted-foreground">
                Return to this page and click "Run All Tests" to verify the integration.
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Need Help?</AlertTitle>
              <AlertDescription>
                See the{' '}
                <a
                  href="/docs/BACKEND_INTEGRATION.md"
                  className="underline hover:text-primary"
                  target="_blank"
                >
                  Backend Integration Guide
                </a>{' '}
                for detailed instructions and troubleshooting.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default BackendIntegrationTest;
