import { PortfolioClient } from "@/components/portfolio/portfolio-client";
import { PageHeader } from "@/components/shared/page-header";

export default function PortfolioPage() {
  return (
    <div className="container mx-auto px-4 md:px-6">
      <PageHeader
        title="Portfolio Analysis"
        description="Track your betting performance, analyze ROI, and filter your prediction history."
      />
      <PortfolioClient />
    </div>
  );
}
