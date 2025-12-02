// src/pages/Home.tsx
import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { EmailList } from "@/components/dashboard/EmailList";
import { EmailDetail } from "@/components/dashboard/EmailDetail";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  fetchEmails,
  fetchMailboxes,
  fetchEmailDetail,
} from "@/services/apiService";

export default function HomePage() {
  const { logout } = useAuth();

  // Dashboard State
  const [selectedFolder, setSelectedFolder] = useState<string>("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // 1. Fetch Emails bằng React Query (Thay vì filter tĩnh)
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["emails", selectedFolder], // Key thay đổi thì fetch lại
    queryFn: () => fetchEmails(selectedFolder),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["mailboxes"],
    queryFn: fetchMailboxes,
  });

  // 2. Tìm email đang chọn trong danh sách đã fetch
  const { data: selectedEmail = null, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["email", selectedEmailId],
    queryFn: () => fetchEmailDetail(selectedEmailId!),
    enabled: !!selectedEmailId, // Chỉ gọi API khi có ID được chọn
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* COLUMN 1: SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col flex-shrink-0 border-r">
        <Sidebar
          folders={folders} // <--- Truyền data API vào đây
          selectedFolder={selectedFolder}
          onSelectFolder={(id) => {
            setSelectedFolder(id);
            setSelectedEmailId(null);
          }}
        />
        <div className="p-4 border-t bg-muted/20">
          <button
            onClick={logout}
            className="text-sm font-medium text-red-600 hover:underline cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* COLUMN 2: EMAIL LIST */}
      <div
        className={`flex-1 md:flex md:w-[400px] md:flex-none flex-col border-r bg-background
         ${selectedEmailId ? "hidden md:flex" : "flex"} 
      `}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading emails...
          </div>
        ) : (
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onSelectEmail={setSelectedEmailId}
          />
        )}
      </div>

      {/* COLUMN 3: EMAIL DETAIL */}
      <main
        className={`flex-1 flex-col bg-background
          ${!selectedEmailId ? "hidden md:flex" : "flex"}
      `}
      >
        {selectedEmailId && (
          <div className="md:hidden p-2 border-b flex items-center">
            <button
              onClick={() => setSelectedEmailId(null)}
              className="text-sm font-medium text-blue-600 px-2 py-1"
            >
              &larr; Back to list
            </button>
          </div>
        )}
        {isLoadingDetail ? (
          <div className="p-8 text-center">Loading detail...</div>
        ) : (
          <EmailDetail email={selectedEmail} />
        )}
      </main>
    </div>
  );
}
