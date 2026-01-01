import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { UpcomingMatches } from "@/components/dashboard/upcoming-matches";
import { PageHeader } from "@/components/shared/page-header";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <PageHeader
        title="Welcome to BetWise Pro"
        description="Your AI-powered football betting analysis dashboard."
      />
      <div className="space-y-8">
        <PortfolioSummary />
        <UpcomingMatches />
      </div>
    </div>
  );
}
