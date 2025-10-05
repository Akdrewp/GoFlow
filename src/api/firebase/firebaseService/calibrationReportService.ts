import { CalibrationReport, createCalibrationReportSchema } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError, isValidUserToken } from "../firebaseVerify";
import { calibrationReportDatabase, chartDatabase, truckDatabase } from "../firestoreDatabase";
import { z } from "zod";


/**
 * Checks if the user associated with the token is the creator of the specified calibration report.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param reportId The ID of the report to check.
 * @returns A promise that resolves to true if the user is the creator, false otherwise.
 */
async function userCanAccessCalibrationReport(token: string, organizationId: string, reportId: string): Promise<boolean> {
  try {
    const decodedToken = await isValidUserToken(token);
    const report = await calibrationReportDatabase.get(organizationId, reportId);

    if (!report) {
      throw new FirebaseVerifyError(
        "Calibration report not found.", 
        404
      );
    }

    return decodedToken.uid === report.createdBy;
  } catch (e) {
    console.error("Error in userCanAccessCalibrationReport:", e);
    throw e;
  }
}

/**
 * Handles the business logic for creating a new calibration report.
 * It verifies permissions and calculates the product volume based on the truck's chart.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param reportData The data for the new report from the client.
 * @returns A promise that resolves with the complete, newly created CalibrationReport object.
 */
export async function addCalibrationReportToOrg(
  token: string,
  organizationId: string,
  reportData: z.infer<typeof createCalibrationReportSchema>
): Promise<CalibrationReport> {
  try {

    // Make sure user can WRITE to calibrationReports
    const resourcePath = `organizations/${organizationId}/calibrationReports`;
    const userProfile = await canUserAccessData(token, resourcePath, AccessType.WRITE);

    // Get truck and calibrationChart for the truck
    const truck = await truckDatabase.get(organizationId, reportData.truckId);
    const chart = await chartDatabase.get(organizationId, truck.chartId);

    // Find the volume for the given measurement rounded to the closest
    const closestMeasurement = chart.productTable.reduce(
      (prev, curr) => {
        return Math.abs(curr.measurement - reportData.productMeasurement) < Math.abs(prev.measurement - reportData.productMeasurement) ? curr : prev;
      }
    );
    const productEntry = chart.productTable.find(entry => entry.measurement === closestMeasurement.measurement);
    if (!productEntry) {
      throw new Error("Product measurement does not correspond to any calibration measurements");
    }
    const calculatedProductVolume = productEntry.volume;

    console.log("calculatedProductVolume ", calculatedProductVolume);
    

    const initialReportData: Omit<CalibrationReport, "reportId"> = {
      ...reportData,
      organizationId: organizationId,
      createdBy: userProfile.uid,
      createdAt: new Date(),
      calculatedProductUsed: calculatedProductVolume,
    };

    return await calibrationReportDatabase.add(organizationId, initialReportData);

  } catch (e) {
    console.error("Error in addCalibrationReportToOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for updating a calibration report.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param reportId The ID of the report to update.
 * @param reportData The partial data to update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateCalibrationReportInOrg(
  token: string,
  organizationId: string,
  reportId: string,
  reportData: Partial<CalibrationReport>
): Promise<void> {
  try {
    const isOwner = await userCanAccessCalibrationReport(token, organizationId, reportId);
    if (!isOwner) {
      // If not the owner, check for general write permissions (e.g., for an admin).
      const resourcePath = `organizations/${organizationId}/calibrationReports/${reportId}`;
      await canUserAccessData(token, resourcePath, AccessType.WRITE);
    }
    
    // Check if the report exists before trying to update it.
    if (!(await calibrationReportDatabase.exists(organizationId, reportId))) {
      throw new FirebaseVerifyError(`Calibration report with ID "${reportId}" not found.`, 404);
    }

    await calibrationReportDatabase.update(organizationId, reportId, reportData);
  } catch (e) {
    console.error("Error in updateCalibrationReportInOrg service:", e);
    throw e;
  }
}

/**
 * Handles the business logic for deleting a calibration report.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param reportId The ID of the report to delete.
 * @returns A promise that resolves when the report is successfully deleted.
 */
export async function deleteCalibrationReportFromOrg(
  token: string,
  organizationId: string,
  reportId: string
): Promise<void> {
  try {
    const isOwner = await userCanAccessCalibrationReport(token, organizationId, reportId);
    if (!isOwner) {
      // If not the owner, check for general write permissions.
      const resourcePath = `organizations/${organizationId}/calibrationReports/${reportId}`;
      await canUserAccessData(token, resourcePath, AccessType.WRITE);
    }

    // Check if the report exists before trying to delete it.
    if (!(await calibrationReportDatabase.exists(organizationId, reportId))) {
        throw new FirebaseVerifyError(`Calibration report with ID "${reportId}" not found.`, 404);
    }

    await calibrationReportDatabase.remove(organizationId, reportId);
  } catch (e) {
    console.error("Error in deleteCalibrationReportFromOrg service:", e);
    throw e;
  }
}
