import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useMailboxesQuery } from "@/features/emails/services/email.query";
import { useKanbanUpdate } from "../hooks/useKanbanUpdate";
import type { KanbanColumnConfig } from "../types/kanban.type";

export const COLOR_OPTIONS = [
  { label: "Gray", value: "#6b7280" }, // gray-500
  { label: "Blue", value: "#3b82f6" }, // blue-500
  { label: "Green", value: "#22c55e" }, // green-500
  { label: "Yellow", value: "#eab308" }, // yellow-500
  { label: "Red", value: "#ef4444" }, // red-500
  { label: "Purple", value: "#a855f7" }, // purple-500
  { label: "Pink", value: "#ec4899" }, // pink-500
  { label: "Orange", value: "#f97316" }, // orange-500
];

interface UpdateColumnDialogProps {
  config?: KanbanColumnConfig;
  onOpenChange: (open: boolean) => void;
}

export function UpdateColumnDialog({
  config,
  onOpenChange,
}: UpdateColumnDialogProps) {
  const { data: mailboxesData, isLoading: isLoadingMailboxes } =
    useMailboxesQuery();

  const { form, isUpdatingKanbanColumn, handlers } = useKanbanUpdate(config);

  const onSubmit = async (values: any) => {
    await handlers.onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={!!config} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Column</DialogTitle>
          <DialogDescription>
            Update the Kanban column and map it to a Gmail Label.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* TITLE */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Column Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. In Progress" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GMAIL LABEL */}
            <FormField
              control={form.control}
              name="gmailLabelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gmail Label Mapping</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingMailboxes ? "Loading..." : "Select a label"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mailboxesData.map((box: any) => {
                        console.log("Mailbox:", box);
                        return (
                          <SelectItem key={box.id} value={box.id}>
                            {box.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* COLOR */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Column Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COLOR_OPTIONS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-full  border`}
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ORDER */}
            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingKanbanColumn}>
                {isUpdatingKanbanColumn && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Column
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
