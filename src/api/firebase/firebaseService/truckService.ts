// --- Truck Service Functions ---

import { Truck } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError } from "../firebaseVerify";
import { truckDatabase } from "../firestoreDatabase";

/**
 * Handles the business logic for adding a new truck to an organization.
 * It verifies the user's permissions and ensures the truck does not already exist.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization to add the truck to.
 * @param truckData The data for the new truck.
 * @returns A promise that resolves when the truck is successfully created.
 * @throws {FirebaseVerifyError} If the user is not authorized or the truck ID already exists.
 */
export async function addTruckToOrg(token: string, organizationId: string, truckData: Truck): Promise<void> {
  try {
    // Make sure user can WRITE to trucks
    const resourcePath = `organizations/${organizationId}/trucks`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Check if truck already exists
    if (await truckDatabase.exists(organizationId, truckData.truckId)) {
      throw new FirebaseVerifyError(
        `Truck with ID "${truckData.truckId}" already exists in this organization.`,
        409 // Conflict
      );
    }

    // Add truck to database
    await truckDatabase.add(organizationId, truckData.truckId, truckData);

    console.log("addTruckToOrg CONSOLE LOG added truck to database");

  } catch (e) {
    console.error("Error in addTruckToOrg service:", e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}

/**
 * Fetches a single truck by its ID from an organization after verifying user access.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the truck resides.
 * @param truckId The ID of the truck to fetch.
 * @returns A promise that resolves to the Truck object if found.
 * @throws {FirebaseVerifyError} If the user is not authorized or the truck does not exist.
 */
export async function getTruckFromOrg(token: string, organizationId: string, truckId: string): Promise<Truck> {
  try {
    // Verify user has permission to READ the specific truck document.
    const resourcePath = `organizations/${organizationId}/trucks/${truckId}`;
    await canUserAccessData(token, resourcePath, AccessType.READ);

    // If permissions are valid, call the database repository to get the data.
    // The repository's 'get' function will throw a 404 error if not found.
    return await truckDatabase.get(organizationId, truckId);

  } catch (e) {
    console.error(`Error fetching truck "${truckId}":`, e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}

/**
 * Handles the business logic for updating a truck in an organization.
 * It verifies the user's permissions and ensures the truck exists before updating.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the truck resides.
 * @param truckId The ID of the truck to update.
 * @param truckData The full new data for the truck.
 * @returns A promise that resolves when the truck is successfully updated.
 * @throws {FirebaseVerifyError} If the user is not authorized, the truck does not exist, or IDs mismatch.
 */
export async function updateTruckInOrg(token: string, organizationId: string, truckId: string, truckData: Truck): Promise<void> {
  try {
    // Verify user has permission to WRITE to the specific truck document.
    const resourcePath = `organizations/${organizationId}/trucks/${truckId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);
    
    // Check if id of truck to update is the same as the updated truckId
    if (truckId !== truckData.truckId) {
      throw new FirebaseVerifyError(
        "Truck ID in URL does not match truck ID in request body.", 
        400 // Bad request
      );
    }

    // Check if truck exists to update
    if (!(await truckDatabase.exists(organizationId, truckId))) {
      throw new FirebaseVerifyError(
        `Truck with ID "${truckId}" not found in this organization.`, 
        404 // Not found
      );
    }

    // Update in database
    await truckDatabase.update(organizationId, truckId, truckData);

  } catch (e) {
    console.error("Error in updateTruckInOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for deleting a truck from an organization.
 * It verifies the user's permissions and ensures the truck exists before deleting.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the truck resides.
 * @param truckId The ID of the truck to delete.
 * @returns A promise that resolves when the truck is successfully deleted.
 * @throws {FirebaseVerifyError} If the user is not authorized or the truck does not exist.
 */
export async function deleteTruckFromOrg(token: string, organizationId: string, truckId: string): Promise<void> {
  try {
    // Verify user has permission to WRITE to the specific truck document.
    // DELETE included within write for now
    const resourcePath = `organizations/${organizationId}/trucks/${truckId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);
    
    // Check if truck to delete exists
    if (!(await truckDatabase.exists(organizationId, truckId))) {
      throw new FirebaseVerifyError(
        `Truck with ID "${truckId}" not found in this organization.`, 
        404 // Not Found
      );
    }

    // Remove truck from database
    await truckDatabase.remove(organizationId, truckId);

  } catch (e) {
    console.error("Error in deleteTruckFromOrg service:", e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}