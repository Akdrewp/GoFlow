import { Loadout } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError } from "@/api/firebase/firebaseVerify";
import { loadoutDatabase, productDatabase } from "../firestoreDatabase";

/**
 * Handles the business logic for adding a new loadout to an organization.
 * Verifies user permissions, checks for duplicates, and validates that all products exist.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param loadoutData The data for the new loadout.
 * @returns A promise that resolves when the loadout is created.
 */
export async function addLoadoutToOrg(token: string, organizationId: string, loadoutData: Loadout): Promise<void> {
  try {
    const resourcePath = `organizations/${organizationId}/loadouts`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    console.log("addLoadoutToOrg CONSOLE LOG loadoutData.loadoutId: ", loadoutData.loadoutId);

    // Check if a loadout with this id already exists
    if (await loadoutDatabase.exists(organizationId, loadoutData.loadoutId)) {
      throw new FirebaseVerifyError(
        `Loadout with ID "${loadoutData.loadoutId}" already exists.`, 
        409 // Conflict
      );
    }

    // Verify that every product in the loadout actually exists.
    for (const productId of loadoutData.productIds) {
      if (!(await productDatabase.exists(organizationId, productId))) {
        throw new FirebaseVerifyError(
          `Product with ID "${productId}" not found in this organization.`, 
          400 // Bad request
        );
      }
    }

    await loadoutDatabase.add(organizationId, loadoutData.loadoutId, loadoutData);
  } catch (e) {
    console.error("Error in addLoadoutToOrg service:", e);
    throw e;
  }
}

/**
 * Fetches a specific loadout by its ID from an organization.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the loadout resides.
 * @param loadoutId The ID of the loadout to fetch.
 * @returns A promise that resolves to the Loadout object if found.
 * @throws {FirebaseVerifyError} If the user is not authorized or the loadout does not exist.
 */
export async function getLoadoutFromOrg(token: string, organizationId: string, loadoutId: string): Promise<Loadout> {
  try {
    // Verify the user has permission to READ the specific loadout document.
    const resourcePath = `organizations/${organizationId}/loadouts/${loadoutId}`;
    await canUserAccessData(token, resourcePath, AccessType.READ);

    // Get loadout from database
    return await loadoutDatabase.get(organizationId, loadoutId);

  } catch (e) {
    console.error(`Error fetching loadout "${loadoutId}":`, e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}

/**
 * Handles the business logic for updating an existing loadout.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param loadoutId The ID of the loadout to update.
 * @param loadoutData The new data for the loadout.
 */
export async function updateLoadoutInOrg(token: string, organizationId: string, loadoutId: string, loadoutData: Partial<Loadout>): Promise<void> {
  try {
    const resourcePath = `organizations/${organizationId}/loadouts/${loadoutId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    if (loadoutData.loadoutId && loadoutId !== loadoutData.loadoutId) {
      throw new FirebaseVerifyError("Loadout ID in URL does not match loadout ID in request body.", 400);
    }

    // If the product list is being updated, verify all new products exist.
    if (loadoutData.productIds) {
      for (const productId of loadoutData.productIds) {
        if (!(await productDatabase.exists(organizationId, productId))) {
          throw new FirebaseVerifyError(
            `Product with ID "${productId}" not found in this organization.`, 
            400 // Bad request
          );
        }
      }
    }

    await loadoutDatabase.update(organizationId, loadoutId, loadoutData);
  } catch (e) {
    console.error("Error in updateLoadoutInOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for deleting a loadout from an organization.
 * It prevents deletion if the loadout is currently in use by any trucks.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param loadoutId The ID of the loadout to delete.
 */
export async function deleteLoadoutFromOrg(token: string, organizationId: string, loadoutId: string): Promise<void> {
  try {
    const resourcePath = `organizations/${organizationId}/loadouts/${loadoutId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Check if the loadout is assigned to any trucks before deleting.
    if (await loadoutDatabase.isLoadoutInUse(organizationId, loadoutId)) {
      throw new FirebaseVerifyError(
        `Cannot delete loadout "${loadoutId}" because it is currently assigned to one or more trucks.`,
        409 // Conflict
      );
    }

    await loadoutDatabase.remove(organizationId, loadoutId);
  } catch (e) {
    console.error("Error in deleteLoadoutFromOrg service:", e);
    throw e;
  }
}
