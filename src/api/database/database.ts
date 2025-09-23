import { z } from "zod";

// --- INTERFACES ---

// Each user is stored in auth and in the database.
// Only has organiztionId and employeeId when part
// of an organization
export interface UserProfile {
    name: string;
    email: string;
    uid: string;
    createdAt: Date;
    organizationId?: string;
    employeeId?: string;
}

export interface Organization {
    name: string;
    email: string;
    createdAt: Date;
    organizationId: string;
    createdBy: string;
}

// All the resources used in the app
export const ORGANIZATION_RESOURCES = ["organizations", "employees", "roles", "trucks", "calibrationCharts"];

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
  chartId?: string;
  
  // Optional field for the user currently assigned to this truck
  assignedUserId?: string;
}

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

/**
 * Represents a single entry in a calibration chart.
 * Maps a physical measurement (e.g., from a dipstick) to a volume.
 */
export interface ChartEntry {
  measurement: number; // The dipstick reading (cm)
  volume: number;      // The corresponding volume (L)
}

/**
 * The main interface for a CalibrationChart document.
 * Used to connect a trucks measurement to product used
 */
export interface CalibrationChart {
  chartId: string; // The unique ID for this chart
  name: string;    // Display name
  
  productTable: ChartEntry[]; // Product table for this chart
}


// --- ZOD SCHEMAS ---

// UserProfile
export const userProfileSchema = z.object({
    name: z.string(),
    email: z.string(),
    uid: z.string(),
    createdAt: z.coerce.date(),
    organizationId: z.string().optional(),
    employeeId: z.string().optional()
});

// Organization
export const organizationSchema = z.object({
    name: z.string(),
    email: z.string(),
    createdAt: z.coerce.date(),
    organizationId: z.string(),
    createdBy: z.string()
});

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

// Employee
export const employeeSchema = z.object({
    name: z.string().min(1, "Name is required"),
    roleId: z.string().min(1, "Role ID is required"),
    status: z.enum(["invited", "active"]),
    employeeId: z.string().min(1, "Employee ID is required"),
    email: z.string().email().optional(),
    uid: z.string().optional(),
});

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

// Truck
export const truckSchema = z.object({
  name: z.string().min(1, "Truck name is required"),
  truckId: z.string().min(1, "Truck ID is required"),
  tankType: z.nativeEnum(TankType),
  chartId: z.string().min(1, "A chart ID must be assigned"),
  assignedUserId: z.string().optional(),
});