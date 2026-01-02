import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUp, ListChecks } from "lucide-react";
import { SyncManager } from "@/components/data-management/sync-manager";
import { Separator } from "@/components/ui/separator";

const dataTypes = [
  "Leagues",
  "Teams",
  "Matches",
  "Betting Odds",
  "Injuries",
];

const validationRules = [
    "ID format: Positive integer",
    "Date format: YYYY-MM-DD",
    "Score: 0-20 integer",
    "Odds: 1.01-100.00 decimal",
    "Required field checks",
    "Foreign key validation",
];

export default function DataManagementPage() {
  return (
    <div className="container mx-auto px-4 md:px-6">
      <PageHeader
        title="Data Management"
        description="Manage and synchronize your football data from Google Sheets."
      />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <FileUp /> Google Sheets Integration
            </CardTitle>
            <CardDescription>
              Load data for leagues, teams, matches, odds, and injuries directly
              from your Google Sheet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4 text-muted-foreground">
              Click the button to start the synchronization process. The system will automatically fetch and validate the data.
            </p>
            <SyncManager />
            <Separator className="my-6" />
            <h4 className="text-sm font-semibold mb-2">Sync Status</h4>
            <div className="flex justify-between text-sm text-muted-foreground">
                <span>Last Sync:</span>
                <span className="font-mono">2024-05-23 02:00:15</span>
            </div>
             <div className="flex justify-between text-sm text-muted-foreground mt-1">
                <span>Next Scheduled Sync:</span>
                <span className="font-mono">2024-05-24 02:00:00</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <ListChecks /> Data Validation
            </CardTitle>
            <CardDescription>
              The system performs automatic checks to ensure data integrity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Sheet Format</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {dataTypes.map((type) => (
                  <li key={type}>{type}</li>
                ))}
              </ul>
            </div>
             <div>
              <h4 className="font-semibold text-sm mb-2">Validation Rules</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {validationRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
