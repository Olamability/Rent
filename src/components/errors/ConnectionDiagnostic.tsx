import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Wifi, 
  WifiOff,
  Server,
  Database,
  Info
} from 'lucide-react';
import { validateSupabaseConnection, isNetworkError } from '@/lib/connectionValidator';
import { supabase } from '@/lib/supabase';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export const ConnectionDiagnostic = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: Basic connectivity
    try {
      const connectionStatus = await validateSupabaseConnection();
      if (connectionStatus.isConnected) {
        diagnosticResults.push({
          name: 'Supabase Connection',
          status: 'success',
          message: `Connected successfully (${connectionStatus.latency}ms)`,
          details: 'Authentication endpoint is reachable'
        });
      } else {
        diagnosticResults.push({
          name: 'Supabase Connection',
          status: 'error',
          message: 'Cannot connect to Supabase',
          details: connectionStatus.error || 'Network request failed'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      diagnosticResults.push({
        name: 'Supabase Connection',
        status: 'error',
        message: 'Connection test failed',
        details: errorMessage
      });
    }

    // Test 2: Database access
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          diagnosticResults.push({
            name: 'Database Schema',
            status: 'error',
            message: 'Database tables not found',
            details: 'The database schema has not been deployed. Please run schema.sql in your Supabase project.'
          });
        } else {
          diagnosticResults.push({
            name: 'Database Access',
            status: 'error',
            message: 'Cannot query database',
            details: error.message
          });
        }
      } else {
        diagnosticResults.push({
          name: 'Database Schema',
          status: 'success',
          message: 'Database tables accessible',
          details: 'Schema is properly deployed'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      // Check if this is a network connectivity error from the custom fetch wrapper
      if (isNetworkError(errorMessage)) {
        diagnosticResults.push({
          name: 'Database Access',
          status: 'error',
          message: 'Cannot query database',
          details: errorMessage
        });
      } else {
        diagnosticResults.push({
          name: 'Database Access',
          status: 'error',
          message: 'Database query failed',
          details: errorMessage
        });
      }
    }

    // Test 3: Public property listings view
    try {
      const { data, error } = await supabase
        .from('public_property_listings')
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          diagnosticResults.push({
            name: 'Property Listings View',
            status: 'error',
            message: 'View not found',
            details: 'The public_property_listings view does not exist. Please run schema.sql in your Supabase project.'
          });
        } else {
          diagnosticResults.push({
            name: 'Property Listings View',
            status: 'warning',
            message: 'View query failed',
            details: error.message
          });
        }
      } else {
        if (data && data.length > 0) {
          diagnosticResults.push({
            name: 'Property Listings View',
            status: 'success',
            message: `Found ${data.length} property listing(s)`,
            details: 'View is working correctly'
          });
        } else {
          diagnosticResults.push({
            name: 'Property Listings View',
            status: 'warning',
            message: 'No properties available',
            details: 'The view exists but contains no data. Add some properties and units, or run seed.sql'
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      diagnosticResults.push({
        name: 'Property Listings View',
        status: 'error',
        message: 'View query failed',
        details: errorMessage
      });
    }

    // Test 4: Environment configuration
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      diagnosticResults.push({
        name: 'Environment Configuration',
        status: 'error',
        message: 'Missing configuration',
        details: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in environment variables'
      });
    } else if (supabaseKey.length < 20) {
      // Basic validation: JWT tokens are typically much longer than 20 chars
      diagnosticResults.push({
        name: 'Environment Configuration',
        status: 'warning',
        message: 'Suspicious API key format',
        details: 'VITE_SUPABASE_ANON_KEY appears to be too short for a valid JWT token'
      });
    } else {
      try {
        new URL(supabaseUrl);
        diagnosticResults.push({
          name: 'Environment Configuration',
          status: 'success',
          message: 'Configuration valid',
          details: `Using Supabase project: ${new URL(supabaseUrl).hostname}`
        });
      } catch {
        diagnosticResults.push({
          name: 'Environment Configuration',
          status: 'error',
          message: 'Invalid Supabase URL',
          details: 'VITE_SUPABASE_URL is not a valid URL'
        });
      }
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-600">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-600 text-white">Warning</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const hasErrors = results.some(r => r.status === 'error');
  const hasWarnings = results.some(r => r.status === 'warning');

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Connection Diagnostics
            </CardTitle>
            <CardDescription>
              Run diagnostics to identify connection issues with Supabase
            </CardDescription>
          </div>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Diagnostics
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {results.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Ready to diagnose</AlertTitle>
            <AlertDescription>
              Click "Run Diagnostics" to check your connection to Supabase and identify any issues.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
              {hasErrors ? (
                <>
                  <WifiOff className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-600">Connection Issues Detected</span>
                </>
              ) : hasWarnings ? (
                <>
                  <Wifi className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-600">Minor Issues Found</span>
                </>
              ) : (
                <>
                  <Wifi className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-600">All Systems Operational</span>
                </>
              )}
            </div>

            {/* Test Results */}
            <div className="space-y-3">
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.name}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {hasErrors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>To fix these issues:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Verify your Supabase project is active at <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="underline">app.supabase.com</a></li>
                    <li>Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct in your .env file</li>
                    <li>Ensure you have run the schema.sql file in your Supabase SQL Editor</li>
                    <li>Check your internet connection and firewall settings</li>
                    <li>Try running the diagnostics again after making changes</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>

      <CardFooter className="border-t pt-6">
        <div className="w-full space-y-2">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Database className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Need help?</p>
              <p>See the <code className="bg-muted px-1 py-0.5 rounded text-xs">docs/SETUP_WALKTHROUGH.md</code> file for detailed setup instructions.</p>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
