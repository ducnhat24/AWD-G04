import { Loader2 } from "lucide-react";

type Props = {
  visible: boolean;
  title?: string;
  description?: string;
};

export function LoadingOverlay({ visible, title, description }: Props) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
      <div className="bg-background p-6 rounded-lg shadow-xl flex flex-col items-center gap-4 min-w-[200px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <div className="flex flex-col items-center gap-1">
          <p className="font-semibold text-lg">{title || "Đang cập nhật..."}</p>
          <p className="text-sm text-muted-foreground">
            {description || "Vui lòng chờ trong giây lát"}
          </p>
        </div>
      </div>
    </div>
  );
}
