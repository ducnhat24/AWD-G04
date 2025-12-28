import { toast } from "sonner";
import { useDeleteKanbanColumnMutation } from "../services/kanban.mutation";
import { handleErrorUi } from "@/services/global-exception";

export const useKanbanDelete = () => {
  const { mutateAsync: deleteColumn, isPending: isDeletingColumn } =
    useDeleteKanbanColumnMutation();

  const onDeleteColumn = async (columnId: string) => {
    try {
      await deleteColumn({ columnId });
      toast.success("Column deleted successfully");
    } catch (error) {
      handleErrorUi(error, toast.error);
    }
  };

  return {
    isDeletingColumn,
    handlers: {
      onDeleteColumn,
    },
  };
};
