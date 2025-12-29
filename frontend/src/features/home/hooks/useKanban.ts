import { toast } from "sonner";
import { useUpdateKanbanListMutation } from "../services/kanban.mutation";
import { useGetKanbanConfigQuery } from "../services/kanban.query";
import { handleErrorUi } from "@/services/global-exception";

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
    data: columns,
    isLoading: isKanbanConfigLoading,
    refetch: refetchKanbanConfig,
    isRefetching: isKanbanConfigRefetching,
  } = useGetKanbanConfigQuery();

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
