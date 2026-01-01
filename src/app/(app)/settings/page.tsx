import { NotificationsForm } from "@/components/settings/notifications-form";
import { PageHeader } from "@/components/shared/page-header";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <PageHeader
        title="Settings"
        description="Customize your BetWise Pro experience."
      />
      <div className="max-w-3xl">
        <NotificationsForm />
      </div>
    </div>
  );
}
