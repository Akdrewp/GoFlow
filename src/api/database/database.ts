import { z } from "zod";

// --- INTERFACES ---

// A base interface for properties shared by all user profiles
interface BaseUserProfile {
  name: string;
  email: string;
  uid: string;
  createdAt: Date;
}

// Interface for an individual user not associated with an organization
export interface IndividualUserProfile extends BaseUserProfile {
  type: 'individual';
}

// Interface for a user who is part of an organization
export interface OrganizationUserProfile extends BaseUserProfile {
  type: 'organization';
  organizationId: string;
  employeeId: string;
}

// The UserProfile is a discriminated union of the two specific types
export type UserProfile = IndividualUserProfile | OrganizationUserProfile;

export interface Organization {
  name: string;
  email: string;
  createdAt: Date;
  organizationId: string;
  createdBy: string;
}

// Organization
export const organizationSchema = z.object({
  name: z.string(),
  email: z.string(),
  createdAt: z.coerce.date(),
  organizationId: z.string(),
  createdBy: z.string()
});

// IndividualUserProfile
const individualUserProfileSchema = z.object({
  type: z.literal('individual'),
  name: z.string(),
  email: z.string().email(),
  uid: z.string(),
  createdAt: z.coerce.date(),
});

// OrganizationUserProfile
const organizationUserProfileSchema = z.object({
  type: z.literal('organization'),
  name: z.string(),
  email: z.string().email(),
  uid: z.string(),
  createdAt: z.coerce.date(),
  organizationId: z.string(),
  employeeId: z.string(),
});

// UserProfile discriminated union of
// organizationUserProfileSchema
// AND
// individualUserProfileSchema
export const userProfileSchema = z.discriminatedUnion("type", [
  individualUserProfileSchema,
  organizationUserProfileSchema,
]);

// All the resources used in the app
export const ORGANIZATION_RESOURCES = ["organizations", "employees", "roles", "trucks", "calibrationCharts", "assignments", "calibrationReports", "products"];

// A permission set for a resource
// Just read and write for now
export interface PermissionSet {
  read: boolean;
  write: boolean;
}

// The main interface for a Role document
export interface Role {
  // Unique idnetifier for a role
  roleId: string;

  // Name that will show on UI
  name: string;

  // The authorization level of the role
  // Heiarchy based access where only users with higher roles
  // can write to documents of lower roles or their own
  level: number;

  // A map where the key is the resource name (e.g., "trucks")
  // and the value is the set of permissions for that resource.
  permissions: {
    [resource: string]: PermissionSet;
  };
}

// PermissionSet
export const permissionSetSchema = z.object({
  read: z.boolean(),
  write: z.boolean(),
});

// Role
export const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  roleId: z.string(),
  level: z.number(),
  permissions: z.record(z.string(), permissionSetSchema),
});

// Tank type enum
// Each truck can either be a split tank or single tank
export enum TankType {
  SINGLE = 'single',
  SPLIT = 'split',
}


export interface Truck {
  // Name for the truck shown on the UI
  name: string;

  // Unique id for the truck within the organization
  truckId: string;

  // The type of tank system the truck has
  tankType: TankType;

  // A link to the specific calibration chart this truck uses
  chartId: string;
  
  // Optional field for the user currently assigned to this truck
  assignedUserId: string | null;
}

// Truck
export const truckSchema = z.object({
  name: z.string().min(1, "Truck name is required"),
  truckId: z.string().min(1, "Truck ID is required"),
  tankType: z.nativeEnum(TankType),
  chartId: z.string().min(1, "A chart ID must be assigned"),
  assignedUserId: z.string().nullable(),
});


// Employee interface
// All employees have email and uid undefined until
// a user signs up into the account
export interface Employee {
  name: string;
  roleId: string; // Changed from 'role' to link to a Role document
  status: string;
  employeeId: string;
  email?: string;
  uid?: string;
}

// Employee
export const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  roleId: z.string().min(1, "Role ID is required"),
  status: z.enum(["invited", "active"]),
  employeeId: z.string().min(1, "Employee ID is required"),
  email: z.string().email().optional(),
  uid: z.string().optional(),
});

/**
 * Represents a single entry in a calibration chart.
 * Maps a physical measurement (e.g., from a dipstick) to a volume.
 */
export interface ChartEntry {
  measurement: number; // The dipstick reading (cm)
  volume: number;    // The corresponding volume (L)
}

/**
 * The main interface for a CalibrationChart document.
 * Used to connect a trucks measurement to product used
 */
export interface CalibrationChart {
  chartId: string; // The unique ID for this chart
  name: string;  // Display name
  
  productTable: ChartEntry[]; // Product table for this chart
}

// ChartEntry
export const chartEntrySchema = z.object({
  measurement: z.number(),
  volume: z.number(),
});

// CalibrationChart
export const calibrationChartSchema = z.object({
  chartId: z.string().min(1, "Chart ID is required"),
  name: z.string().min(1, "Chart name is required"),
  productTable: z.array(chartEntrySchema),
});

/**
 * Represents a single truck assignment event.
 * It now includes the specific product loadout being used for this assignment.
 */
export interface Assignment {
  // The unique ID for this assignment record
  assignmentId: string;

  // The ID of the truck that was assigned
  truckId: string;

  // The ID of the product loadout from the truck's configuration being used
  loadoutId: string;

  // The UID of the user assigned to the truck
  userId: string;

  // The employeeId of the user
  employeeId: string;

  // The timestamp when the assignment began
  assignedAt: Date;

  // The timestamp when the assignment ended.
  // If this is null, the assignment is currently active.
  unassignedAt: Date | null;
}


// Assignment
export const assignmentSchema = z.object({
  assignmentId: z.string().min(1),
  truckId: z.string().min(1),
  loadoutId: z.string().min(1),
  userId: z.string().min(1),
  employeeId: z.string().min(1),
  assignedAt: z.coerce.date(),
  unassignedAt: z.coerce.date().nullable(),
});

/**
 * Represents a single calibration report submitted by an employee for their assigned truck.
 */
export interface CalibrationReport {
  // The unique ID for this report, generated by Firestore
  reportId: string;

  // The ID of the organization this report belongs to
  organizationId: string;
  
  // The ID of the truck the report is for
  truckId: string;

  // The ID of the assignment that was active when this report was made
  assignmentId: string;

  // The UID of the employee who created the report
  createdBy: string;
  
  // The timestamp when the report was created
  createdAt: Date;
  
  // Id of the Product document being used
  productId: string;

  // The actual measurements taken by the employee
  productMeasurement: number; 
  
  // Amount of area done (usually in sqft)
  areaCompleted: number;

  // The product used calculated from the measurement using the truck's linked chart
  // This is calculated on the server when the report is created.
  calculatedProductUsed: number;

  // ( areaCompleted / calculatedProductUsed )
  actualCalibrationRate: number;
}

// CalibrationReport
export const calibrationReportSchema = z.object({
  reportId: z.string().min(1),
  organizationId: z.string().min(1),
  truckId: z.string().min(1),
  assignmentId: z.string().min(1),
  createdBy: z.string().min(1),
  createdAt: z.coerce.date(),
  productMeasurement: z.number().min(0),
  calculatedProductVolume: z.number().min(0),
});

// Schema picked from full schema for creating a calibration report
export const createCalibrationReportSchema = calibrationReportSchema.pick({
  truckId: true,
  assignmentId: true,
  productMeasurement: true,
});


/**
 * There are two types of measurement
 * calibrated: 
 *  Refers to liquids being used, when chosen the product used
 *  will defualt to the trucks calibrationChart
 * unit count:
 *  Refers to anything else such as kg of product used
 *  that doesn't need a calibration sheet
 */
export enum MeasurementType {
  CALIBRATED = 'calibrated',
  UNIT_COUNT = 'unit_count',
}

/**
 * Describes a single product within a Loadout, including how it's measured
 * and what its target application rate is.
 */
export interface Product {
  productId: string;
  name: string;
  measurementType: MeasurementType;
  
  // The target application rate ( product used / area completed )
  targetRate: number;

  // The unit of measurement (cm, bags, bottles)
  unitName: string;
}

// Product
export const productSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().min(1, "Product name is required"),
  measurementType: z.nativeEnum(MeasurementType),
  targetRate: z.number(),
  unitName: z.string().min(1, "Unit name is required"),
});

/**
 * The main interface for a Loadout document.
 * This is to mirror the different products used
 * in a single assignment, there usually isn't more than two.
 */
export interface Loadout {
  loadoutId: string;
  name: string;
  products: Product[];
}