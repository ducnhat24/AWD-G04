import { catchGlobalAxiosError } from "@/services/global-exception";
import type {
  CreateKanbanConfigRequestDto,
  DeleteKanbanConfigRequestDto,
  GetKanbanConfigResponseDto,
  UpdateKanbanConfigRequestDto,
  UpdateKanbanListRequestDto,
} from "./kanban.dto";
// import { INITIAL_KANBAN_CONFIG } from "@/data/mockData";
import { http } from "@/services/http.client";

export const getKanbanConfig =
  async (): Promise<GetKanbanConfigResponseDto> => {
    try {
      const res = await http.get("/kanban/config");
      // return {
      //   columns: INITIAL_KANBAN_CONFIG,
      // };
      console.log("Fetched Kanban Config:", res.data);
      return {
        columns: res.data.columns,
      };
    } catch (error) {
      throw catchGlobalAxiosError(error);
    }
  };

export const updateKanbanConfig = async (
  newConfig: UpdateKanbanConfigRequestDto
): Promise<void> => {
  console.log("Updating Kanban Config:", newConfig);
  try {
    await http.patch("/kanban/config/column/" + newConfig.data.id, {
      title: newConfig.data.title,
      gmailLabelId: newConfig.data.gmailLabelId,
      color: newConfig.data.color,
      order: newConfig.data.order,
    });
  } catch (error) {
    throw catchGlobalAxiosError(error);
  }
};

export const updateKanbanList = async (
  payload: UpdateKanbanListRequestDto
): Promise<void> => {
  console.log("Updating Kanban List:", payload.columns);
  try {
    // Cách 1: Nếu Backend hỗ trợ update list (KHUYÊN DÙNG nếu có)
    // await http.patch("/kanban/config", { columns: payload.columns });

    // Cách 2: Nếu Backend chỉ cho update từng cái (Dùng Promise.all như đã bàn)
    const updateRequests = payload.columns.map((col) =>
      http.patch("/kanban/config/column/" + col.id, {
        title: col.title,
        gmailLabelId: col.gmailLabelId,
        color: col.color,
        order: col.order,
      })
    );
    await Promise.all(updateRequests);
    
  } catch (error) {
    throw catchGlobalAxiosError(error);
  }
};

export const createKanbanColumn = async (
  values: CreateKanbanConfigRequestDto
): Promise<void> => {
  console.log("Creating Kanban Column:", values);
  try {
    await http.post("/kanban/config", {
      columns: [values],
    });
  } catch (error) {
    throw catchGlobalAxiosError(error);
  }
};

export const deleteKanbanColumn = async (
  params: DeleteKanbanConfigRequestDto
): Promise<void> => {
  console.log("Deleting Kanban Column ID:", params.columnId);
  try {
    await http.delete("/kanban/config/column/" + params.columnId);
  } catch (error) {
    throw catchGlobalAxiosError(error);
  }
};
