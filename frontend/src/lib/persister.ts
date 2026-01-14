import { get, set, del } from "idb-keyval";
import {
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";

export function createIDBPersister(
  idbValidKey: IDBValidKey = "reactQueryClient"
): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(idbValidKey, client);
      } catch (error) {
        console.error("Error persisting client to IndexedDB:", error);
      }
    },
    restoreClient: async () => {
      try {
        return await get<PersistedClient>(idbValidKey);
      } catch (error) {
        console.error("Error restoring client from IndexedDB:", error);
        return undefined;
      }
    },
    removeClient: async () => {
      await del(idbValidKey);
    },
  };
}
