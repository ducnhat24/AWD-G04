import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSuggestions } from "@/services/email.service";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

export const SearchBar = ({ onSearch, initialValue = "" }: SearchBarProps) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // MOCK DATA
  const fetchSuggestions = async (q: string) => {
    // Chỉ gọi API nếu từ khóa dài hơn 1 ký tự để tiết kiệm request
    if (!q || q.trim().length < 2) return [];
    
    try {
      // Gọi API thật từ Backend thông qua service
      const results = await getSuggestions(q);
      return results;
    } catch (error) {
      console.error("Lỗi khi tải gợi ý:", error);
      return [];
    }
  };

  useEffect(() => {
    const loadSuggestions = async () => {
      if (debouncedQuery) {
        const results = await fetchSuggestions(debouncedQuery);
        setSuggestions(results);
        if (results.length > 0 && document.activeElement === wrapperRef.current?.querySelector('input')) {
          setIsOpen(true);
        }
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    };
    loadSuggestions();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hàm xử lý tìm kiếm trung tâm
  const triggerSearch = (value: string) => {
    setQuery(value); 
    setIsOpen(false);
    setSelectedIndex(-1);
    // Quan trọng: Gọi onSearch với giá trị MỚI NHẤT, không phụ thuộc state query cũ
    onSearch(value); 
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Bỏ qua nếu đang gõ tiếng Việt (IME)
    if (e.nativeEvent.isComposing) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Nếu đang chọn dropdown thì lấy giá trị dropdown, ngược lại lấy giá trị trong input
      const valToSearch = (isOpen && selectedIndex >= 0) 
        ? suggestions[selectedIndex] 
        : e.currentTarget.value; // Lấy value trực tiếp từ DOM element
      
      triggerSearch(valToSearch);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2 w-full" ref={wrapperRef}>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search emails..."
          className="h-9 pl-8"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
        />

        {isOpen && suggestions.length > 0 && (
          <ul className="absolute z-[100] w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
            {suggestions.map((item, index) => (
              <li
                key={item}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                  index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
                // QUAN TRỌNG: Dùng onMouseDown thay vì onClick để tránh bị mất focus input trước khi click ăn
                onMouseDown={(e) => {
                  e.preventDefault(); // Ngăn input bị mất focus
                  triggerSearch(item);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9 shrink-0"
        onClick={() => triggerSearch(query)}
      >
        <Search className="w-4 h-4" />
      </Button>
    </div>
  );
};