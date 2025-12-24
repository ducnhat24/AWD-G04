import { catchGlobalAxiosError } from "@/services/global-exception";
import type {
  CreateKanbanConfigRequestDto,
  DeleteKanbanConfigRequestDto,
  GetKanbanConfigResponseDto,
  UpdateKanbanConfigRequestDto,
} from "./kanban.dto";
import { INITIAL_KANBAN_CONFIG } from "@/data/mockData";

export const getKanbanConfig =
  async (): Promise<GetKanbanConfigResponseDto> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        columns: INITIAL_KANBAN_CONFIG,
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    throw catchGlobalAxiosError(error);
  }
};

export const createKanbanColumn = async (
  values: CreateKanbanConfigRequestDto
): Promise<void> => {
  console.log("Creating Kanban Column:", values);
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    throw catchGlobalAxiosError(error);
  }
};

export const deleteKanbanColumn = async (
  params: DeleteKanbanConfigRequestDto
): Promise<void> => {
  console.log("Deleting Kanban Column ID:", params.columnId);
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    throw catchGlobalAxiosError(error);
  }
};
