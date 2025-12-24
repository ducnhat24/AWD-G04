import { useForm } from "react-hook-form";
import * as z from "zod";
import { useUpdateKanbanConfigMutation } from "../services/kanban.mutation";
import { toast } from "sonner";
import { handleErrorUi } from "@/services/global-exception";
import { zodResolver } from "@hookform/resolvers/zod";
import type { KanbanColumnConfig } from "../types/kanban.type";
import { useEffect } from "react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  gmailLabelId: z.string().min(1, "Gmail Label is required"),
  color: z.string().min(1, "Color is required"),
  order: z.coerce.number().min(0, "Order must be a positive number"),
});

export const useKanbanUpdate = (config?: KanbanColumnConfig) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    mode: "onChange",
    defaultValues: {
      title: config?.title,
      gmailLabelId: config?.gmailLabelId,
      color: config?.color,
      order: config?.order,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        title: config.title,
        gmailLabelId: config.gmailLabelId,
        color: config.color,
        order: config.order,
      });
    }
  }, [config]);

  const { mutateAsync: updateColumn, isPending: isUpdatingKanbanColumn } =
    useUpdateKanbanConfigMutation();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!config) return;
    try {
      await updateColumn({
        data: {
          id: config.id,
          title: values.title,
          gmailLabelId: values.gmailLabelId,
          color: values.color,
          order: values.order,
        },
      });
      toast.success("Column updated successfully");
      form.reset();
    } catch (error) {
      handleErrorUi(error, toast.error);
    }
  };

  return {
    form,
    isUpdatingKanbanColumn,
    handlers: {
      onSubmit,
    },
  };
};
