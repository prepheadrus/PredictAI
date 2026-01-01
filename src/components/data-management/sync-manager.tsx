"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

type SyncStatus = "idle" | "syncing" | "success" | "error";

export function SyncManager() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const { toast } = useToast();

  const handleSync = () => {
    setStatus("syncing");
    toast({
      title: "Sync Started",
      description: "Connecting to Google Sheets API...",
    });

    setTimeout(() => {
      // Simulate API call and validation
      const success = Math.random() > 0.2; // 80% success rate
      if (success) {
        setStatus("success");
        toast({
          title: "Sync Successful",
          description: "All data has been updated from Google Sheets.",
        });
      } else {
        setStatus("error");
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: "Could not validate data. Please check sheet formats.",
        });
      }
    }, 3000);
  };

  const getStatusContent = () => {
    switch (status) {
      case "syncing":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Syncing...",
        };
      case "success":
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          text: "Sync Now",
        };
      case "error":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          text: "Retry Sync",
        };
      default:
        return {
          icon: null,
          text: "Sync Now",
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

      {status === 'success' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Sync Complete</AlertTitle>
          <AlertDescription>
            Data successfully synchronized at {new Date().toLocaleTimeString()}.
          </AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sync Error</AlertTitle>
          <AlertDescription>
            Failed to sync data. Please check your Google Sheet for formatting errors and try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
