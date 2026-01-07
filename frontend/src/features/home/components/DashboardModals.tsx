// src/components/dashboard/DashboardModals.tsx
import { ComposeEmail } from "@/components/common/ComposeEmail";
import { SnoozeDialog } from "@/components/common/SnoozeDialog";
import type { Email } from "@/features/emails/types/email.type";
import { EmailDetailDialog } from "@/features/emails/components/EmailDetailDialog";

interface DashboardModalsProps {
  // Compose Modal
  isComposeOpen: boolean;
  composeMode: "compose" | "reply" | "forward";
  composeOriginalEmail: Email | null;
  onCloseCompose: () => void;

  // Snooze Dialog
  isSnoozeOpen: boolean;
  onCloseSnooze: () => void;
  onSnooze: (date: Date) => void;

  // Email Detail Dialog (Kanban)
  isKanbanDetailOpen: boolean;
  onCloseKanbanDetail: () => void;
  selectedEmail: Email | null;
  isLoadingDetail: boolean;
  onEmailAction: (
    action: "toggleRead" | "delete" | "star" | "reply" | "forward"
  ) => void;
}

export function DashboardModals({
  isComposeOpen,
  composeMode,
  composeOriginalEmail,
  onCloseCompose,
  isSnoozeOpen,
  onCloseSnooze,
  onSnooze,
  isKanbanDetailOpen,
  onCloseKanbanDetail,
  selectedEmail,
  isLoadingDetail,
  onEmailAction,
}: DashboardModalsProps) {
  return (
    <>
      {/* Compose Email Modal */}
      {isComposeOpen && (
        <ComposeEmail
          onClose={onCloseCompose}
          mode={composeMode}
          originalEmail={composeOriginalEmail}
        />
      )}

      {/* Snooze Dialog */}
      <SnoozeDialog
        isOpen={isSnoozeOpen}
        onClose={onCloseSnooze}
        onSnooze={onSnooze}
      />

      {/* Kanban Email Detail Modal */}
      <EmailDetailDialog
        isOpen={isKanbanDetailOpen}
        onClose={onCloseKanbanDetail}
        email={selectedEmail}
        isLoading={isLoadingDetail}
        onAction={onEmailAction}
      />
    </>
  );
}
