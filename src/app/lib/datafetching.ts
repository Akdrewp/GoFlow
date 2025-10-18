import { Assignment, CalibrationChart, Employee, Loadout, Product, Truck } from "@/api/database/database";
import { getDataForResource } from "@/api/firebase/firebaseVerify";

// Simple getter function for calibration charts
export const getCalibrationChartsForOrg = async (token: string, organizationId: string): Promise<CalibrationChart[]> => {
  try {
    const calibrationChartsCollectionId = `organizations/${organizationId}/calibrationCharts`;
    const calibrationCharts = await getDataForResource(token, calibrationChartsCollectionId);

    return calibrationCharts as CalibrationChart[];
  } catch (e) {
    console.error("Error fetching calibration charts: ", e);
    throw(e);
  }
}; 

// Simple getter function for products
export const getProductsForOrg = async (token: string, organizationId: string): Promise<Product[]> => {
  try {
    const productsCollectionId = `organizations/${organizationId}/products`;
    const products = await getDataForResource(token, productsCollectionId);

    return products as Product[];
  } catch (e) {
    console.error("Error fetching calibration charts: ", e);
    throw(e);
  }
};

// Simple getter function for loadouts
export const getLoadoutsForOrg = async (token: string, organizationId: string): Promise<Loadout[]> => {
  try {
    const loadoutsCollectionId = `organizations/${organizationId}/loadouts`;
    const loadouts = await getDataForResource(token, loadoutsCollectionId);

    return loadouts as Loadout[];
  } catch (e) {
    console.error("Error fetching calibration charts: ", e);
    throw(e);
  }
};

// Simple getter function for Trucks
export const getTrucksForOrg = async (token: string, organizationId: string): Promise<Truck[]> => {
  try {
    const trucksCollectionId = `organizations/${organizationId}/trucks`;
    const trucks = await getDataForResource(token, trucksCollectionId);

    return trucks as Truck[];
  } catch (e) {
    console.error("Error fetching trucks: ", e);
    throw(e);
  }
};

// Simple getter function for Trucks
export const getRolesForOrg = async (token: string, organizationId: string): Promise<Truck[]> => {
  try {
    const trucksCollectionId = `organizations/${organizationId}/trucks`;
    const trucks = await getDataForResource(token, trucksCollectionId);

    return trucks as Truck[];
  } catch (e) {
    console.error("Error fetching trucks: ", e);
    throw(e);
  }
};

// Simple getter function for active Assignments
export const getActiveAssignmentsForOrg = async (token: string, organizationId: string): Promise<Assignment[]> => {
  try {

    // Get assignments
    const assignmentsCollectionId = `organizations/${organizationId}/assignments`;
    const assignmentsData = await getDataForResource(token, assignmentsCollectionId);


    // Get only active assignments by filtering assignments where
    // unassignedAt is null
    const activeAssignments = assignmentsData.filter((assignment: Assignment) => {
      return assignment.unassignedAt === null;
    });

    /**
     * @todo Change getDataForResource to return proper type rather than Documents
     * Maybe make it generic
     */
    // Hopeful casting
    return activeAssignments as Assignment[];

  } catch (e) {
    console.error("Error fetching user's assignment: ", e);
    // Re-throw the error or return null depending on desired behavior for the caller
    throw e; 
  }
};

export const getEmployeesForOrg = async (token: string, organizationId: string): Promise<Employee[]> => {
    try {
        const employeesCollectionId = `organizations/${organizationId}/employees`;
        const employees = await getDataForResource(token, employeesCollectionId);

        // Hopeful casting
        return employees as Employee[];
    } catch (e) {
        console.error("Error fetching employees:", e);
        throw(e);
    }
};