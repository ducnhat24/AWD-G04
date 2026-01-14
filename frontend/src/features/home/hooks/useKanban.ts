import { toast } from "sonner";
import { useUpdateKanbanListMutation } from "../services/kanban.mutation";
import { useGetKanbanConfigQuery } from "../services/kanban.query";
import { handleErrorUi } from "@/services/global-exception";
import { useMemo } from "react";
import type { KanbanColumnConfig } from "../types/kanban.type";
import { SNOOZED_COLUMN_CONFIG } from "../constants/kanban";

export function useKanbanConfig() {
  //   const [columns, setColumns] = useState<KanbanColumnConfig[]>([]);
  //   const [loading, setLoading] = useState(true);

  //   // Load config khi component mount
  //   useEffect(() => {
  //     loadConfig();
  //   }, []);

  //   const loadConfig = async () => {
  //     try {
  //       const data = await kanbanService.getConfig();
  //       setColumns(data.sort((a, b) => a.order - b.order));
  //     } catch (error) {
  //       console.error(error);
  //       toast.error("Không tải được cấu hình bảng");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   // Hàm save có optimistic update (cập nhật UI trước khi gọi API)
  //   const updateColumns = async (newColumns: KanbanColumnConfig[]) => {
  //     const oldColumns = [...columns];
  //     setColumns(newColumns); // Cập nhật UI ngay lập tức

  //     try {
  //       await kanbanService.updateConfig(newColumns);
  //       toast.success("Đã lưu cấu hình bảng");
  //     } catch (error) {
  //       setColumns(oldColumns); // Revert nếu lỗi
  //       toast.error("Lưu thất bại");
  //     }
  //   };

  const {
    data: apiColumns, // Đổi tên biến này thành apiColumns để tránh nhầm lẫn
    isLoading: isKanbanConfigLoading,
    refetch: refetchKanbanConfig,
    isRefetching: isKanbanConfigRefetching,
  } = useGetKanbanConfigQuery();

  // --- LOGIC FIX Ở ĐÂY ---
  const columns = useMemo(() => {
    if (!apiColumns) return [];

    // Clone mảng để không mutate trực tiếp
    const mergedColumns: KanbanColumnConfig[] = [...apiColumns];

    // Kiểm tra xem backend đã trả về snoozed chưa (đề phòng backend update sau này)
    const hasSnoozed = mergedColumns.some(
      (col) => col.id === "snoozed" || col.title === "Snoozed"
    );

    if (!hasSnoozed) {
      // Nếu chưa có, chèn cột Snoozed vào.
      // Ví dụ: Muốn chèn vào vị trí số 3 (index 2) hoặc cuối cùng
      mergedColumns.push(SNOOZED_COLUMN_CONFIG as any);

      // Hoặc nếu muốn sort lại theo order:
      // mergedColumns.sort((a, b) => a.order - b.order);
    }

    return mergedColumns;
  }, [apiColumns]);

  const { mutateAsync: updateColumns, isPending: isUpdatingKanbanConfig } =
    useUpdateKanbanListMutation();

  const onUpdateColumns = async (newColumns: typeof columns) => {
    try {
      await updateColumns({ columns: newColumns! });
      toast.success("Đã lưu cấu hình bảng");
    } catch (error) {
      console.error("Failed to update columns", error);
      handleErrorUi(error, toast.error);
    }
  };

  return {
    columns,
    isKanbanConfigLoading,
    refetchKanbanConfig,
    isKanbanConfigRefetching,
    isUpdatingKanbanConfig,
    handlers: {
      onUpdateColumns,
    },
  };
}
