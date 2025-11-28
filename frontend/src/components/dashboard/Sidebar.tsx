import { cn } from "@/lib/utils";
import { Inbox, Send, File, Star, Trash2, Archive } from "lucide-react";

interface SidebarProps {
  folders: { id: string; label: string; icon: string }[]; // Thêm dòng này
  selectedFolder: string;
  onSelectFolder: (folderId: string) => void;
}

// Map string icon names to Lucide components
const iconMap: Record<string, any> = {
  inbox: Inbox,
  send: Send,
  file: File,
  star: Star,
  trash: Trash2,
  archive: Archive,
};

interface SidebarProps {
  selectedFolder: string;
  onSelectFolder: (folderId: string) => void;
}

export function Sidebar({ folders, selectedFolder, onSelectFolder }: SidebarProps) {
  return (
    <div className="w-full h-full flex flex-col py-4 gap-2 border-r bg-muted/20">
      <div className="px-4 mb-4">
        <h2 className="text-xl font-bold tracking-tight">Mail App</h2>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {folders.map((folder) => {
          const Icon = iconMap[folder.icon] || Inbox;
          const isSelected = selectedFolder === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {folder.label}
              {folder.id === "inbox" && (
                <span className="ml-auto text-xs font-bold">2</span> // Mock count
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}