import { LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/features/home/components/SearchBar";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  viewMode: "list" | "kanban";
  onViewModeChange: (mode: "list" | "kanban") => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: (overrideValue?: string) => void;
  onAddColumn: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  viewMode,
  onViewModeChange,
  searchInput,
  onSearchInputChange,
  onSearch,
  onAddColumn,
  onLogout,
}: DashboardHeaderProps) {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0 gap-4">
      <div className="flex items-center gap-4 flex-1">
        <h2 className="font-semibold text-lg shrink-0">
          {viewMode === "list" ? "Search" : "Kanban Board"}
        </h2>

        <div className="flex items-center gap-2 max-w-md w-full">
          <SearchBar
            initialValue={searchInput}
            onSearch={(query) => {
              onSearchInputChange(query);
              onSearch(query);
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {viewMode === "kanban" && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-primary border-primary/20 hover:bg-primary/10"
            onClick={onAddColumn}
          >
            <Plus className="w-4 h-4" />
            Add Column
          </Button>
        )}

        <div className="flex items-center border rounded-lg p-1 bg-muted/20">
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "px-3 py-1 text-sm rounded-md transition-colors",
              viewMode === "list"
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            List
          </button>
          <button
            onClick={() => onViewModeChange("kanban")}
            className={cn(
              "px-3 py-1 text-sm rounded-md transition-colors",
              viewMode === "kanban"
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Kanban
          </button>
        </div>

        {viewMode === "kanban" && (
          <button
            onClick={onLogout}
            className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
}
