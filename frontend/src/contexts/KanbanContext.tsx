// src/contexts/KanbanContext.tsx
import { createContext, useContext, type ReactNode } from "react";

interface KanbanContextType {
    onMoveEmail: (emailId: string, sourceFolder: string, destinationFolder: string) => void;
    onSnooze: (emailId: string, date: Date, sourceFolder?: string) => void;
    onOpenMail: (emailId: string) => void;
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

interface KanbanProviderProps {
    children: ReactNode;
    onMoveEmail: (emailId: string, sourceFolder: string, destinationFolder: string) => void;
    onSnooze: (emailId: string, date: Date, sourceFolder?: string) => void;
    onOpenMail: (emailId: string) => void;
}

export function KanbanProvider({ children, onMoveEmail, onSnooze, onOpenMail }: KanbanProviderProps) {
    return (
        <KanbanContext.Provider value={{ onMoveEmail, onSnooze, onOpenMail }}>
            {children}
        </KanbanContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKanban() {
    const context = useContext(KanbanContext);
    if (context === undefined) {
        throw new Error("useKanban must be used within a KanbanProvider");
    }
    return context;
}
