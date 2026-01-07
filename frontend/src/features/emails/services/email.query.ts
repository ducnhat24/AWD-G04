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
export const useEmailListQuery = (
  selectedFolder: string,
  searchQuery: string,
  isEnabled: boolean // Biến cờ để bật/tắt (VD: chỉ fetch khi ở List View)
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
    refetchOnWindowFocus: false,
    enabled: isEnabled,
    refetchInterval: 60000,
  });
};

// 2. Hook lấy danh sách Mailboxes (Folders)
export const useMailboxesQuery = () => {
  return useQuery({
    queryKey: EMAIL_KEYS.FOLDERS,
    queryFn: fetchMailboxes,
    refetchOnWindowFocus: false,
  });
};

// 3. Hook lấy chi tiết Email
export const useEmailDetailQuery = (emailId: string | null) => {
  return useQuery({
    queryKey: [...EMAIL_KEYS.DETAIL, emailId],
    queryFn: () => fetchEmailDetail(emailId!),
    enabled: !!emailId,
    refetchOnWindowFocus: false,
  });
};

// 4. Hook tìm kiếm Global
export const useSearchEmailsQuery = (searchQuery: string) => {
  return useQuery({
    queryKey: [...EMAIL_KEYS.SEARCH, searchQuery],
    queryFn: () => searchEmails(searchQuery),
    enabled: !!searchQuery,
    refetchOnWindowFocus: false,
  });
};
