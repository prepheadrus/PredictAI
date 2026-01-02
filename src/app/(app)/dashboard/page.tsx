'use client';
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { UpcomingMatches } from "@/components/dashboard/upcoming-matches";
import { PageHeader } from "@/components/shared/page-header";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null;
  }
  
  return (
    <div className="container mx-auto px-4 md:px-6">
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
