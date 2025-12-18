// src/layouts/DashboardLayout.tsx
import { type ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { cn } from "@/lib/utils";
import { LogOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
    children: ReactNode;
    folders: { id: string; label: string; icon: string }[];
    selectedFolder: string;
    onSelectFolder: (id: string) => void;
    onCompose: () => void;
    viewMode: "list" | "kanban";
    onViewModeChange: (mode: "list" | "kanban") => void;
    searchInput: string;
    onSearchInputChange: (value: string) => void;
    onSearch: () => void;
}

export function DashboardLayout({
    children,
    folders,
    selectedFolder,
    onSelectFolder,
    onCompose,
    viewMode,
    onViewModeChange,
    searchInput,
    onSearchInputChange,
    onSearch,
}: DashboardLayoutProps) {
    const { logout } = useAuth();

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* SIDEBAR */}
            <aside
                className={cn(
                    "hidden md:flex w-64 flex-col shrink-0 border-r transition-all duration-300 ease-in-out",
                    viewMode === "kanban" && "hidden md:hidden"
                )}
            >
                <Sidebar
                    folders={folders}
                    selectedFolder={selectedFolder}
                    onSelectFolder={onSelectFolder}
                    onCompose={onCompose}
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

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar */}
                <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0 gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <h2 className="font-semibold text-lg shrink-0">
                            {viewMode === "list" ? "Search" : "Kanban Board"}
                        </h2>
                        <div className="flex items-center gap-2 max-w-md w-full">
                            <Input
                                placeholder="Search emails..."
                                value={searchInput}
                                onChange={(e) => onSearchInputChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") onSearch();
                                }}
                                className="h-9"
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9"
                                onClick={onSearch}
                            >
                                <Search className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                                onClick={logout}
                                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {children}
                </div>
            </div>
        </div>
    );
}
