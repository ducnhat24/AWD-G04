import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Đã kết nối lại Internet", {
        icon: <Wifi className="w-4 h-4 text-green-500" />,
        description: "Ứng dụng đang đồng bộ dữ liệu...",
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Mất kết nối Internet", {
        icon: <WifiOff className="w-4 h-4" />,
        description: "Bạn đang xem dữ liệu offline.",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Nếu đang Online thì không hiện gì cả (chỉ hiện toast lúc chuyển trạng thái thôi)
  if (isOnline) return null;

  // Nếu Offline thì hiện cái badge đỏ đỏ ở góc trái dưới
  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-[9999] flex items-center gap-2 px-4 py-2",
        "bg-red-600 text-white rounded-full shadow-lg",
        "animate-in slide-in-from-bottom-5 fade-in duration-300",
        "border border-red-400/50 backdrop-blur-sm"
      )}
    >
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span className="text-sm font-medium">Chế độ Offline</span>
    </div>
  );
}
