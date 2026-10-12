import { FeedbackManagement } from "@/components/feedback-management";

export default function FeedbackAdminPage() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Feedback Management</h1>
          <p className="text-muted-foreground">
            View and manage user feedback submissions
          </p>
        </div>
        <FeedbackManagement />
      </div>
    </div>
  );
}
