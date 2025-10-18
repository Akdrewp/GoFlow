import { CalibrationChart, CalibrationReport, createCalibrationReportSchema, MeasurementType } from "@/api/database/database";
import { AccessType, canUserAccessData, FirebaseVerifyError, isValidUserToken } from "../firebaseVerify";
import { assignmentDatabase, calibrationReportDatabase, chartDatabase, productDatabase, truckDatabase } from "../firestoreDatabase";
import { z } from "zod";

// Amount of significant decimal places
const CALIBRATION_PRECISION = 3;

/**
 * Checks if the user associated with the token is the creator of the specified calibration report.
 * @param token The user's Firebase ID token.
 * @param organizationId The ID of the organization.
 * @param reportId The ID of the report to check.
 * @returns A promise that resolves to true if the user is the creator, false otherwise.
 */
async function userCanAccessCalibrationReport(token: string, organizationId: string, reportId: string): Promise<boolean> {
  try {
    // Get user and assignment
    const decodedToken = await isValidUserToken(token);
    const report = await calibrationReportDatabase.get(organizationId, reportId);

    if (!report) {
      throw new FirebaseVerifyError(
        "Calibration report not found.", 
        404
      );
    }

    // User can access if they created the report
    return decodedToken.uid === report.createdBy;
  } catch (e) {
    console.error("Error in userCanAccessCalibrationReport:", e);
    throw e;
  }
}

const getVolumeFromMeasurement = (chart: CalibrationChart, measurement: number): number => {
  // Find the current volume for the given measurement rounded to the closest
  const closestMeasurement = chart.productTable.reduce(
    (prev, curr) => {
      return Math.abs(curr.measurement - measurement) < Math.abs(prev.measurement - measurement) ? curr : prev;
    }
  );
  const productEntry = chart.productTable.find(entry => entry.measurement === closestMeasurement.measurement);
  if (!productEntry) {
    throw new FirebaseVerifyError(
      "Product measurement does not correspond to any calibration measurements",
      400, // Bad Request
    );
  }

  return productEntry.volume;
};

// Helper function to calulate the product used
const calculateProduct = (
    chart: CalibrationChart, 
    productType: MeasurementType, 
    newMeasurement: number, 
    initialMeasurement: number, 
    areaCompleted: number
  ) => {
  // Get product used depending on product type
  let newProductUsed;
  if (productType == MeasurementType.CALIBRATED) {
    // Get new product used
    const initialVolume = getVolumeFromMeasurement(chart, initialMeasurement);
    const newCurrentVolume = getVolumeFromMeasurement(chart, newMeasurement);

    newProductUsed = initialVolume - newCurrentVolume;
  } else {
    newProductUsed = initialMeasurement - newMeasurement;
  }

  // If the initial measurement was greater than the new measurement
  // resulting in a negative productUsed
  if (newProductUsed < 0) {
    throw new FirebaseVerifyError(
      "Product measurement cannot be greater than the initial measurement",
      400 // Bad Request
    );
  }

  // Get calibration rate
  const calibration = newProductUsed / areaCompleted;
  const actualCalibrationRate = Number(calibration.toPrecision(CALIBRATION_PRECISION));

  return [
    newProductUsed,
    actualCalibrationRate
  ];

};

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


    // Check if making a report on a truck user is assigned to
    const decodedUserToken = await isValidUserToken(token);
    const userAssignment = await assignmentDatabase.get(organizationId, reportData.assignmentId);
    const selfReport = userAssignment?.userId == decodedUserToken.uid;

    // If making a report for another user check permissions 
    if (!selfReport) {
      // Make sure user can WRITE to calibrationReports
      const resourcePath = `organizations/${organizationId}/calibrationReports`;
      await canUserAccessData(token, resourcePath, AccessType.WRITE);
    }

    // Check assignment exists
    if (!userAssignment) {
      console.log("addCalibrationReportToOrg CONSOLE LOG NO ACTIVE ASSIGNMENT");
      throw new FirebaseVerifyError(
        "No active assignment found",
        400, // Bad Request
      );
    }

    // Get past reports for this product
    const assignmentReports = await calibrationReportDatabase.getFromAssignment(organizationId, userAssignment.assignmentId, reportData.productId);

    // Check if this is first report
    const isInitialReport = assignmentReports.length == 0;
    if (isInitialReport) {
      // First report is just to input the first starting measurement

      // areaCompleted should be 0
      if (reportData.areaCompleted != 0) {
        throw new FirebaseVerifyError(
          "Area Completed must be 0 for the first report",
          400, // Bad Request
        );
      }

      // First report product used and calibration is 0
      const initialReport = {
        ...reportData,
        organizationId: organizationId,
        createdBy: decodedUserToken.uid,
        createdAt: new Date(),
        productUsed: 0,
        actualCalibrationRate: 0,
      };

      // Add to database and return
      return await calibrationReportDatabase.add(organizationId, initialReport);

    } else { // This is a subsequent report

      // Get truck and calibrationChart for the truck
      const truck = await truckDatabase.get(organizationId, reportData.truckId);
      const chart = await chartDatabase.get(organizationId, truck.chartId);

      // Get product used
      const product = await productDatabase.get(organizationId, reportData.productId);

      // Initial measurement from the first report
      const initialReport = assignmentReports.at(-1);
      if(!initialReport) {
        throw new FirebaseVerifyError(
          "Past reports not found", 
          500
        );
      }
      const initialMeasurement = initialReport.productMeasurement;
      console.log("initialMeasurement", initialMeasurement);
      console.log("reportData.productMeasurement", reportData.productMeasurement);

      const [calculatedProductUsed, actualCalibrationRate] = calculateProduct(chart, 
        product.measurementType, 
        reportData.productMeasurement, 
        initialMeasurement,
        reportData.areaCompleted
      );

      const initialReportData: Omit<CalibrationReport, "reportId"> = {
        ...reportData,
        organizationId: organizationId,
        createdBy: decodedUserToken.uid,
        createdAt: new Date(),
        productUsed: calculatedProductUsed,
        productId: reportData.productId,
        actualCalibrationRate: actualCalibrationRate,
      };

      // Add to database and return
      return await calibrationReportDatabase.add(organizationId, initialReportData);
      
    }

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

    // Get decodedIdToken for uid
    const userDecodedIdToken = await isValidUserToken(token);
    
    // Check if the report exists before trying to update it.
    if (!(await calibrationReportDatabase.exists(organizationId, reportId))) {
      throw new FirebaseVerifyError(
        `Calibration report with ID "${reportId}" not found.`, 
        404 // Not Found
      );
    }

    // If updating product measurement OR area completed
    // Must update productUsed and actualCalibrationRate
    if (reportData.productMeasurement || reportData.areaCompleted) {

      // Get current assignment and full report
      const userAssignment = await assignmentDatabase.getFromUser(organizationId, userDecodedIdToken.uid);
      const userReport = await calibrationReportDatabase.get(organizationId, reportId);
      if (!userAssignment) {
        throw new FirebaseVerifyError(
          "Assignment does not exists or is not active",
          400, // Bad Request
        );
      }

      // If either has changed use the new value
      // Otherwise use old value
      const newAreaCompleted = reportData.areaCompleted ? reportData.areaCompleted : userReport.areaCompleted;
      const newProductMeasurement = reportData.productMeasurement ? reportData.productMeasurement : userReport.productMeasurement;

      // Get initial report
      const assignmentReports = await calibrationReportDatabase.getFromAssignment(organizationId, userAssignment.assignmentId, userReport.productId,);
      const initialReport = assignmentReports[assignmentReports.length - 1];

      // Get truck and calibrationChart for the truck
      const truck = await truckDatabase.get(organizationId, userAssignment.truckId);
      const chart = await chartDatabase.get(organizationId, truck.chartId);

      // Get product used
      const product = await productDatabase.get(organizationId, userReport.productId);

      // Initial measurement from the first report
      const initialMeasurement = initialReport.productMeasurement;

      // If the first reports productMeasurement is being changed
      // Then all subsequent reports must be racalculated
      const isChangingInitialMeasurement = initialReport.reportId == reportId && reportData.productMeasurement;
      if (isChangingInitialMeasurement) {
        // All reports except the first made one
        const reportsToUpdate = assignmentReports.slice(0, -1);

        // New initial measurement is the first reports updated measurement
        const newInitialMeasurement = newProductMeasurement;

        // Update initial report in database
        await calibrationReportDatabase.update(organizationId, reportId, {
          productMeasurement: reportData.productMeasurement
        });

        // Update subsequent reports
        for (const report of reportsToUpdate) {
          // Get new product used and calibration
          const [newProductUsed, newActualCalibrationRate] = calculateProduct(
            chart, 
            product.measurementType, 
            report.productMeasurement, 
            newInitialMeasurement,
            report.areaCompleted
          );
          
          console.log("report.productMeasurement newInitialMeasurement", report.productMeasurement , newInitialMeasurement);

          // Update calibration and product used in database
          await calibrationReportDatabase.update(organizationId, report.reportId, {
            productUsed: newProductUsed,
            actualCalibrationRate: newActualCalibrationRate
          });

        }

      } else { // Updating areaChanged and/or product used of subsequent report
        // Just need to update specific report
        const [newProductUsed, newActualCalibrationRate] = calculateProduct(chart, 
          product.measurementType, 
          newProductMeasurement, 
          initialMeasurement,
          newAreaCompleted
        );

        // Update calibration, product used, and product measurement in database
        await calibrationReportDatabase.update(organizationId, reportId, {
          productMeasurement: reportData.productMeasurement,
          productUsed: newProductUsed,
          actualCalibrationRate: newActualCalibrationRate
        });
      }

    } else { // If not updating productMeasurement OR areaCompleted safe to just update report
      await calibrationReportDatabase.update(organizationId, reportId, reportData);
    }

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
        throw new FirebaseVerifyError(
          `Calibration report with ID "${reportId}" not found.`, 
          404 // Not Found
        );
    }

    // Check if trying to delete the initial measurement report
    const report = await calibrationReportDatabase.get(organizationId, reportId);
    const reportAssignment = await assignmentDatabase.get(organizationId, report.assignmentId);

    // Get Initial measurement report is last
    const assignReports = await calibrationReportDatabase.getFromAssignment(organizationId, reportAssignment.assignmentId, report.productId);
    const initialReport = assignReports[assignReports.length - 1];

    // Check if deleting initial report
    if (initialReport.reportId == reportId) {
      throw new FirebaseVerifyError(
        `The initial report of an assignment cannot be deleted`, 
        403 // Forbidden
      );
    }

    // Remove from database
    await calibrationReportDatabase.remove(organizationId, reportId);
  } catch (e) {
    console.error("Error in deleteCalibrationReportFromOrg service:", e);
    throw e;
  }
}

/**
 * Fetches all calibration reports for a specific product within a specific assignment.
 * @param token The user's Firebase ID token for authentication.
 * @param organizationId The ID of the organization.
 * @param assignmentId The ID of the assignment.
 * @param productId The ID of the product.
 * @returns A promise resolving to an array of CalibrationReport objects.
 */
export async function getReportsForAssignment(
  token: string,
  organizationId: string,
  assignmentId: string,
  productId: string
): Promise<CalibrationReport[]> {
  try {
    // Verify user has READ permission on the collection. This is a general guard.
    const resourcePath = `organizations/${organizationId}/calibrationReports`;
    await canUserAccessData(token, resourcePath, AccessType.READ);

    // Fetch the specific reports from the database.
    return await calibrationReportDatabase.getFromAssignment(organizationId, assignmentId, productId);
  } catch(e) {
    console.error("Error in getReportsForAssignment service:", e);
    throw e;
  }
}
