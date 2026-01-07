import type { Email } from "@/features/emails/types/email.type";
import { useState } from "react";

export function useDashboardModals() {
  // Compose Modal
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<
    "compose" | "reply" | "forward"
  >("compose");
  const [composeOriginalEmail, setComposeOriginalEmail] =
    useState<Email | null>(null);

  // Kanban Detail Modal
  const [isKanbanDetailOpen, setIsKanbanDetailOpen] = useState(false);

  // Snooze Modal
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);
  const [snoozeSourceFolder, setSnoozeSourceFolder] = useState<
    string | undefined
  >(undefined);

  const openCompose = (
    mode: "compose" | "reply" | "forward" = "compose",
    email: Email | null = null
  ) => {
    setComposeMode(mode);
    setComposeOriginalEmail(email);
    setIsComposeOpen(true);
  };

  const closeCompose = () => {
    setIsComposeOpen(false);
    setComposeOriginalEmail(null);
  };

  const openSnooze = (emailId: string, sourceFolder?: string) => {
    setSnoozeTargetId(emailId);
    setSnoozeSourceFolder(sourceFolder);
    setIsSnoozeOpen(true);
  };

  const closeSnooze = () => {
    setIsSnoozeOpen(false);
    setSnoozeTargetId(null);
    setSnoozeSourceFolder(undefined);
  };

  return {
    // States
    isComposeOpen,
    composeMode,
    composeOriginalEmail,
    isKanbanDetailOpen,
    setIsKanbanDetailOpen, // Detail logic đơn giản nên expose setter
    isSnoozeOpen,
    snoozeTargetId,
    snoozeSourceFolder,

    // Actions
    openCompose,
    closeCompose,
    openSnooze,
    closeSnooze,
  };
}
