// --- CalibrationChart Service Functions ---

import { CalibrationChart } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError } from "../firebaseVerify";
import { chartDatabase } from "../firestoreDatabase";

/**
 * Handles the business logic for adding a new calibration chart to an organization.
 * It verifies the user's permissions and ensures the chart ID does not already exist.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization to add the chart to.
 * @param chartData The data for the new calibration chart.
 * @returns A promise that resolves when the chart is successfully created.
 * @throws {FirebaseVerifyError} If the user is not authorized or the chart ID already exists.
 */
export async function addChartToOrg(token: string, organizationId: string, chartData: CalibrationChart): Promise<void> {
  try {
    // Verify user has permission to WRITE to the calibrationCharts collection.
    const resourcePath = `organizations/${organizationId}/calibrationCharts`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Check if a chart with this ID already exists.
    if (await chartDatabase.exists(organizationId, chartData.chartId)) {
      throw new FirebaseVerifyError(
        `Chart with ID "${chartData.chartId}" already exists in this organization.`,
        409 // Conflict
      );
    }

    // Add to database
    await chartDatabase.add(organizationId, chartData.chartId, chartData);

  } catch (e) {
    console.error("Error in addChartToOrg service:", e);
    // Re-throw the error to be handled by the API route's catch block.
    throw e;
  }
}

/**
 * Handles the business logic for updating an existing calibration chart.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the chart resides.
 * @param chartId The ID of the chart to update.
 * @param chartData The full new data for the calibration chart.
 * @returns A promise that resolves when the chart is successfully updated.
 * @throws {FirebaseVerifyError} If the user is not authorized, the chart does not exist, or IDs mismatch.
 */
export async function updateChartInOrg(token: string, organizationId: string, chartId: string, chartData: CalibrationChart): Promise<void> {
  try {
    // Verify user has permission to WRITE to the specific chart document.
    const resourcePath = `organizations/${organizationId}/calibrationCharts/${chartId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);
    
    // Validate that the chartId in the URL matches the one in the body.
    if (chartId !== chartData.chartId) {
      throw new FirebaseVerifyError(
        "Chart ID in URL does not match chart ID in request body.", 
        400 // Bad Request
      );
    }

    // Ensure the chart actually exists before trying to update it.
    if (!(await chartDatabase.exists(organizationId, chartId))) {
      throw new FirebaseVerifyError(
        `Chart with ID "${chartId}" not found in this organization.`, 
        404 // Not Found
      );
    }

    // Update in database
    await chartDatabase.update(organizationId, chartId, chartData);

  } catch (e) {
    console.error("Error in updateChartInOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for deleting a calibration chart from an organization.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization where the chart resides.
 * @param chartId The ID of the chart to delete.
 * @returns A promise that resolves when the chart is successfully deleted.
 * @throws {FirebaseVerifyError} If the user is not authorized, the chart does not exist, or the chart is in use.
 */
export async function deleteChartFromOrg(token: string, organizationId: string, chartId: string): Promise<void> {
  try {
    // Make sure user can WRITE to calibrationsCharts
    const resourcePath = `organizations/${organizationId}/calibrationCharts/${chartId}`;
    await canUserAccessData(token, resourcePath, AccessType.WRITE);
    
    // Ensure the chart exists before trying to delete it.
    if (!(await chartDatabase.exists(organizationId, chartId))) {
      throw new FirebaseVerifyError(
        `Chart with ID "${chartId}" not found in this organization.`, 
        404 // Not Found
      );
    }

    /**
     * @todo Not sure whether I want to check for this
     */
    // Check if any trucks use this chart
    // if (await truckDatabase.isChartInUse(organizationId, chartId)) {
    //   throw new FirebaseVerifyError(
    //     `Cannot delete chart "${chartId}" because it is currently assigned to one or more trucks.`,
    //     409 // Conflict
    //   );
    // }

    // Delete in database
    await chartDatabase.remove(organizationId, chartId);

  } catch (e) {
    console.error("Error in deleteChartFromOrg service:", e);
    throw e;
  }
}