import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateKanbanColumnMutation } from "../services/kanban.mutation";
import { toast } from "sonner";
import { handleErrorUi } from "@/services/global-exception";
import { zodResolver } from "@hookform/resolvers/zod";

interface ColumnFormData {
  title: string;
  gmailLabelId: string;
  color: string;
  order: number;
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  gmailLabelId: z.string().min(1, "Gmail Label is required"),
  color: z.string().min(1, "Color is required"),
  // z.coerce.number() cho phép nhận string từ input và tự chuyển sang number
  order: z.coerce.number().min(0, "Order must be a positive number"),
});

export const useKanbanAddition = () => {
  const form = useForm<ColumnFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    mode: "onChange",
    defaultValues: {
      title: "",
      gmailLabelId: "",
      color: "bg-gray-500",
      order: 0,
    },
  });

  const { mutateAsync: createColumn, isPending: isCreatingKanbanColumn } =
    useCreateKanbanColumnMutation();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createColumn({
        title: values.title,
        gmailLabelId: values.gmailLabelId,
        color: values.color,
        order: values.order,
      });
      toast.success("Column added successfully");
      form.reset();
    } catch (error) {
      handleErrorUi(error, toast.error);
    }
  };

  return {
    form,
    isCreatingKanbanColumn,
    handlers: {
      onSubmit,
    },
  };
};
