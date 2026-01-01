
import { PageHeader } from "@/components/shared/page-header";
import { MatchList } from "@/components/match-center/match-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListCollapse } from "lucide-react";


export default function MatchCenterPage() {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <PageHeader
                title="Match Center"
                description="View all ingested matches and refresh data."
            />
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <ListCollapse />
                        Match History
                    </CardTitle>
                    <CardDescription>
                        A log of all ingested matches from the API.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <MatchList />
                </CardContent>
            </Card>
        </div>
    );
}
