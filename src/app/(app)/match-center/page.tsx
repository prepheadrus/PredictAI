
import { PageHeader } from "@/components/shared/page-header";
import { MatchList } from "@/components/match-center/match-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListCollapse } from "lucide-react";
import { getMatchesWithTeams } from "@/app/actions";
import { analyzeMatches } from "@/lib/api-football";
import { revalidatePath } from "next/cache";


export default async function MatchCenterPage() {
    // Run analysis on any matches that might be pending
    const analyzedCount = await analyzeMatches();
    if (analyzedCount > 0) {
        revalidatePath("/match-center"); // Revalidate if we just analyzed something
    }
    
    const initialMatches = await getMatchesWithTeams();

    return (
        <div className="container mx-auto px-4 md:px-6">
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
                        A log of all ingested matches from the API. {analyzedCount > 0 && `(${analyzedCount} new matches analyzed)`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <MatchList initialMatches={initialMatches} />
                </CardContent>
            </Card>
        </div>
    );
}

    