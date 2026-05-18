/**
 * Storage implementation contract for the Operations Assistant.
 *
 * Current implementation: JsonStore in src/store.js.
 * Next implementation target: SQLite-backed store.
 *
 * Required async methods:
 * - read()
 * - readWorkspace(workspaceId)
 * - write(state)
 * - saveProfile(workspaceId, profile)
 * - saveOutput(workspaceId, output)
 * - updateOutputReview(workspaceId, outputId, reviewStatus)
 * - createRecord(workspaceId, collection, record)
 * - updateRecord(workspaceId, collection, recordId, record)
 * - deleteRecord(workspaceId, collection, recordId)
 *
 * Store methods must enforce workspace scoping, validate collection names,
 * preserve audit logging, and return plain JSON-serializable objects.
 */
export const STORAGE_CONTRACT_VERSION = '1.0.0';
