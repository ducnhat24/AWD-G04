import { catchGlobalAxiosError } from "@/services/global-exception";
import type {
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
