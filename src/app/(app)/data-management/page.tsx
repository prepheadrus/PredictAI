'use client';
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUp, ListChecks, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { SyncManager } from "@/components/data-management/sync-manager";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface TestResult {
    success: boolean;
    status?: number;
    hasMatches?: boolean;
    matchCount?: number;
    error?: string;
}

export default function DataManagementPage() {
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    
    const runTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const response = await fetch('/api/test-football-api');
            const data = await response.json();
            setTestResult(data);
        } catch (error: any) {
            setTestResult({ success: false, error: error.message });
        } finally {
            setIsTesting(false);
        }
    };

    useEffect(() => {
        // Run test on initial load
        runTest();
    }, []);

  return (
    <div className="container mx-auto px-4 md:px-6">
      <PageHeader
        title="Data Management"
        description="Manage and synchronize your football data from the external API."
      />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <FileUp /> API Data Ingestion
            </CardTitle>
            <CardDescription>
              Fetch and analyze match data for all tracked leagues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4 text-muted-foreground">
              Click the button to start the synchronization process. The system will fetch and analyze the data.
            </p>
            <SyncManager />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <ListChecks /> API Connection Test
            </CardTitle>
            <CardDescription>
              Diagnose the connection to the football-data.org API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runTest} disabled={isTesting}>
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run Test Again
            </Button>
            {isTesting && (
                <div className="flex items-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Testing API connection...</span>
                </div>
            )}
            {testResult && (
                <div className="space-y-2 text-sm">
                    {testResult.success ? (
                        <div className="flex items-center text-green-600">
                           <CheckCircle className="mr-2 h-4 w-4" />
                           <span>API Test Successful! (Status: {testResult.status})</span>
                        </div>
                    ) : (
                         <div className="flex items-center text-destructive">
                           <AlertTriangle className="mr-2 h-4 w-4" />
                           <span>API Test Failed! (Status: {testResult.status})</span>
                        </div>
                    )}
                    
                    <div>
                        <span className="font-semibold">Match Count: </span>
                        <span>{testResult.matchCount ?? 'N/A'}</span>
                    </div>

                    {testResult.error && (
                        <div>
                            <span className="font-semibold">Error Message: </span>
                            <span className="font-mono text-destructive">{testResult.error}</span>
                        </div>
                    )}
                </div>
            )}
            <p className="text-xs text-muted-foreground pt-2">
                If the test fails, please ensure your `FOOTBALL_DATA_API_KEY` in the `.env` file is correct and valid. You may need to restart the application after changing it.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
