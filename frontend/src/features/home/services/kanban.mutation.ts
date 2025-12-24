import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createKanbanColumn,
  deleteKanbanColumn,
  updateKanbanConfig,
} from "./kanban.api";
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

export const useCreateKanbanColumnMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createKanbanColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KANBAN_KEYS.CONFIG] });
    },
  });
};

export const useDeleteKanbanColumnMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteKanbanColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KANBAN_KEYS.CONFIG] });
    },
  });
};
