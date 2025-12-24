import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateKanbanConfig } from "./kanban.api";
import { KANBAN_KEYS } from "./kanban.query";

export const useUpdateKanbanConfigMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateKanbanConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KANBAN_KEYS.CONFIG] });
    },
  });
};
