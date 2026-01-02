"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Loader2, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

type SyncStatus = "idle" | "syncing" | "success" | "error";

export function SyncManager() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [processedCount, setProcessedCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    setStatus("syncing");
    setProcessedCount(null);
    setErrorMessage(null);
    toast({
      title: "Ingestion Started",
      description: "Fetching latest data from API-Football...",
    });

    try {
      const response = await fetch('/api/ingest');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ingestion failed');
      }
      
      setProcessedCount(result.processed);
      setStatus("success");
      toast({
        title: "Ingestion Successful",
        description: `${result.processed} matches have been processed and saved to the database.`,
      });

    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message);
      toast({
        variant: "destructive",
        title: "Ingestion Failed",
        description: error.message || "Could not fetch or validate data.",
      });
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case "syncing":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Ingesting...",
        };
      case "success":
        return {
          icon: <RefreshCw className="h-4 w-4" />,
          text: "Ingest Again",
        };
      case "error":
        return {
          icon: <RefreshCw className="h-4 w-4" />,
          text: "Retry Ingestion",
        };
      default:
        return {
          icon: <RefreshCw className="h-4 w-4" />,
          text: "Start Ingestion",
        };
    }
  };

  const { icon, text } = getStatusContent();

  return (
    <div className="space-y-4">
      <Button
        onClick={handleSync}
        disabled={status === "syncing"}
        className="w-full md:w-auto"
      >
        {icon}
        <span>{text}</span>
      </Button>

      {status === 'success' && processedCount !== null && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Ingestion Complete</AlertTitle>
          <AlertDescription>
            Successfully processed and saved {processedCount} matches at {new Date().toLocaleTimeString()}.
          </AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ingestion Error</AlertTitle>
          <AlertDescription>
            {errorMessage || 'An unknown error occurred. Check the server logs.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
