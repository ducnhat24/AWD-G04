import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchEmails,
  fetchMailboxes,
  fetchEmailDetail,
  searchEmails,
} from "@/features/emails/services/email.api";

export const EMAIL_KEYS = {
  LIST: ["emails"] as const,
  FOLDERS: ["mailboxes"] as const,
  DETAIL: ["email"] as const,
  SEARCH: ["search"] as const,
};

// 1. Hook lấy danh sách Email (Infinite Scroll)
// email.query.ts
export const useEmailListQuery = (
  selectedFolder: string,
  searchQuery: string,
  isEnabled: boolean
) => {
  const limit = 10;
  return useInfiniteQuery({
    queryKey: [...EMAIL_KEYS.LIST, selectedFolder, searchQuery],
    queryFn: ({ pageParam = 1 }) =>
      fetchEmails(
        selectedFolder,
        pageParam as string | number,
        limit,
        searchQuery
      ),
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    initialPageParam: 1 as string | number,

    enabled: isEnabled,

    // QUAN TRỌNG: Đổi từ "offlineFirst" sang "online"
    networkMode: "online", // Chỉ fetch khi có mạng

    // Tăng retry để đảm bảo không clear cache khi lỗi network
    retry: (failureCount, error: any) => {
      // Không retry nếu lỗi network
      if (
        error?.message?.includes("fetch") ||
        error?.message?.includes("network")
      ) {
        return false;
      }
      return failureCount < 3;
    },

    // Refetch settings
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Đổi thành false để dùng cache trước
    refetchOnReconnect: true, // Giữ true để refetch khi online lại

    // Cache settings
    staleTime: 1000 * 60 * 5, // 5 phút
    gcTime: 1000 * 60 * 60 * 24, // 24 giờ - không xóa cache nhanh
  });
};

export const useMailboxesQuery = () => {
  return useQuery({
    queryKey: EMAIL_KEYS.FOLDERS,
    queryFn: fetchMailboxes,

    networkMode: "online", // Đổi sang online
    retry: false, // Không retry khi offline

    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,

    staleTime: 1000 * 60 * 60 * 24, // 24 giờ
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 ngày
  });
};

export const useEmailDetailQuery = (emailId: string | null) => {
  return useQuery({
    queryKey: [...EMAIL_KEYS.DETAIL, emailId],
    queryFn: () => fetchEmailDetail(emailId!),

    enabled: !!emailId,
    networkMode: "online", // Đổi sang online
    retry: false,

    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,

    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });
};

export const useSearchEmailsQuery = (searchQuery: string) => {
  return useQuery({
    queryKey: [...EMAIL_KEYS.SEARCH, searchQuery],
    queryFn: () => searchEmails(searchQuery),

    enabled: !!searchQuery,
    networkMode: "online",
    retry: false,

    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,

    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });
};
