import { useState } from "react";
import { X, Minus, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendEmail } from "@/services/apiService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ComposeEmailProps {
  onClose: () => void;
}

export function ComposeEmail({ onClose }: ComposeEmailProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to) {
      toast.error("Please specify a recipient.");
      return;
    }
    
    setIsSending(true);
    try {
      await sendEmail(to, subject, body);
      toast.success("Email sent successfully!");
      onClose();
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-20 w-64 bg-white border border-gray-300 rounded-t-lg shadow-lg z-50 flex justify-between items-center p-3 cursor-pointer" onClick={() => setIsMinimized(false)}>
        <span className="font-medium truncate text-sm">New Message</span>
        <div className="flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} className="hover:bg-gray-100 p-1 rounded"><Minus size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="hover:bg-gray-100 p-1 rounded"><X size={14} /></button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isMaximized && (
        <div 
          className="fixed inset-0 bg-black/50 z-40" 
          onClick={() => setIsMaximized(false)}
        />
      )}
      <div 
        className={cn(
          "bg-white flex flex-col font-sans transition-all duration-200 ease-in-out z-50 shadow-xl overflow-hidden",
          isMaximized 
            ? "fixed inset-10 rounded-lg border border-gray-200" 
            : "fixed bottom-0 right-20 w-[500px] h-[500px] border border-gray-300 rounded-t-lg"
        )}
      >
        {/* Header */}
        <div 
          className="flex justify-between items-center px-4 py-2 bg-[#f2f6fc] border-b border-gray-200 cursor-pointer shrink-0" 
          onClick={() => !isMaximized && setIsMinimized(true)}
        >
          <span className="font-medium text-sm text-gray-700">New Message</span>
          <div className="flex gap-2 text-gray-600">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} 
              className="hover:bg-gray-200 p-1 rounded"
            >
              <Minus size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }} 
              className="hover:bg-gray-200 p-1 rounded"
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }} 
              className="hover:bg-gray-200 p-1 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden">
          <div className="border-b border-gray-200 shrink-0">
              <Input 
                  placeholder="To" 
                  value={to} 
                  onChange={(e) => setTo(e.target.value)} 
                  className="border-none shadow-none focus-visible:ring-0 px-4 py-3 text-sm rounded-none"
              />
          </div>
          <div className="border-b border-gray-200 shrink-0">
              <Input 
                  placeholder="Subject" 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  className="border-none shadow-none focus-visible:ring-0 px-4 py-3 text-sm rounded-none"
              />
          </div>
          <textarea
            className="flex-1 w-full resize-none border-none p-4 text-sm focus:outline-none"
            placeholder=""
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          {/* Footer */}
          <div className="flex justify-between items-center p-3 border-t border-gray-100 mt-auto shrink-0">
            <div className="flex gap-2 items-center">
              <Button 
                  type="submit" 
                  disabled={isSending}
                  className="bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white rounded-full px-6 h-9 font-medium text-sm"
              >
                {isSending ? "Sending..." : "Send"}
              </Button>
              {/* Formatting options placeholders */}
              <div className="flex items-center gap-1 text-gray-500 ml-2">
                  <span className="p-2 hover:bg-gray-100 rounded cursor-pointer font-bold text-gray-600">A</span>
                  <span className="p-2 hover:bg-gray-100 rounded cursor-pointer">📎</span>
              </div>
            </div>
            <div className="text-gray-500">
              <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
                  <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
