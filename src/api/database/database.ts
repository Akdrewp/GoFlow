import { z } from "zod";

// --- ZOD SCHEMAS (The Single Source of Truth) ---

// Base schemas for discriminated union
const individualUserProfileSchema = z.object({
  type: z.literal('individual'),
  name: z.string(),
  email: z.string().email(),
  uid: z.string(),
  createdAt: z.coerce.date(),
});

const organizationUserProfileSchema = z.object({
  type: z.literal('organization'),
  name: z.string(),
  email: z.string().email(),
  uid: z.string(),
  createdAt: z.coerce.date(),
  organizationId: z.string(),
  employeeId: z.string(),
});

// UserProfile schema using a discriminated union
export const userProfileSchema = z.discriminatedUnion("type", [
  individualUserProfileSchema,
  organizationUserProfileSchema,
]);

// Organization schema
export const organizationSchema = z.object({
  name: z.string(),
  email: z.string(),
  createdAt: z.coerce.date(),
  organizationId: z.string(),
  createdBy: z.string()
});

// PermissionSet schema
// For now only READ and WRITE
export const permissionSetSchema = z.object({
  read: z.boolean(),
  write: z.boolean(),
});

// Role schema
/**
 * Each role has a set of permissions that gets filled out when created
 * ex:
 *  "organizations": read: true, write: false
 * 
 * This would mean the user can read the "organizations" collection
 * but wouldn't be able to write to it
 * 
 * This does NOT affect any special/specific permissions 
 */
export const roleSchema = z.object({
  roleId: z.string(),
  name: z.string().min(1, "Role name is required"),
  level: z.number(),
  permissions: z.record(z.string(), permissionSetSchema),
});

// TankType enum
export enum TankType {
  SINGLE = 'single',
  SPLIT = 'split',
}

// Truck schema

export const truckSchema = z.object({
  name: z.string().min(1, "Truck name is required"),
  truckId: z.string().min(1, "Truck ID is required"),
  tankType: z.nativeEnum(TankType),
  // Each truck has a certain tank measurement to it
  chartId: z.string().min(1, "A chart ID must be assigned"),
  assignedUserId: z.string().nullable(),
});

const statusTypes = [
  "invited",
  "active"
 ] as const;

// Employee schema
export const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  roleId: z.string().min(1, "Role ID is required"),
  status: z.enum(statusTypes),
  employeeId: z.string().min(1, "Employee ID is required"),
  email: z.string().email().optional(),
  uid: z.string().optional(),
});

// ChartEntry schema
export const chartEntrySchema = z.object({
  measurement: z.number(),
  volume: z.number(),
});

// CalibrationChart schema
export const calibrationChartSchema = z.object({
  chartId: z.string().min(1, "Chart ID is required"),
  name: z.string().min(1, "Chart name is required"),
  productTable: z.array(chartEntrySchema),
});

// Assignment schema
/**
 * Used for tracking assignments from employees to trucks
 * 
 * This is to cross reference when an employee makes a calibrationReport
 * 
 * The loadoutId is used to show which products are being calibrated
 */
export const assignmentSchema = z.object({
  assignmentId: z.string().min(1),
  truckId: z.string().min(1),
  loadoutId: z.string().min(1),
  userId: z.string().min(1),
  employeeId: z.string().min(1),
  assignedAt: z.coerce.date(),
  unassignedAt: z.coerce.date().nullable(),
});

// MeasurementType enum
export enum MeasurementType {
  CALIBRATED = 'calibrated',
  UNIT_COUNT = 'unit_count',
}

// Product schema
/**
 * measurementType can either be
 * calibrated: liquid
 * OR
 * unit_count: other
 * 
 * A calibrated measuremenType would use the trucks calibrationChart
 * to obtain the productUsed
 * 
 * While unit_count would require the productUsed to be passed in
 */
export const productSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().min(1, "Product name is required"),
  measurementType: z.nativeEnum(MeasurementType),
  targetRate: z.number(),
  unitName: z.string().min(1, "Unit name is required"),
});

// Loadout schema
export const loadoutSchema = z.object({
  loadoutId: z.string().min(1, "Loadout ID is required"),
  name: z.string().min(1, "Loadout name is required"),
  productIds: z.array(z.string().min(1, "Product ID is required")),
});

// CalibrationReport schema
export const calibrationReportSchema = z.object({
  reportId: z.string().min(1),
  organizationId: z.string().min(1),
  truckId: z.string().min(1),
  assignmentId: z.string().min(1),
  createdBy: z.string().min(1),
  createdAt: z.coerce.date(),
  // Area completed will be 0 for the first report
  areaCompleted: z.number().gte(0),
  productId: z.string().min(1),
  productMeasurement: z.number().min(0),
  productUsed: z.number(),
  actualCalibrationRate: z.number(),
});

export const createCalibrationReportSchema = calibrationReportSchema.pick({
  areaCompleted: true,
  productMeasurement: true,
  truckId: true,
  assignmentId: true,
  productId: true,
});


// --- TYPES (Inferred from Zod Schemas) ---

export type UserProfile = z.infer<typeof userProfileSchema>;
export type IndividualUserProfile = z.infer<typeof individualUserProfileSchema>;
export type OrganizationUserProfile = z.infer<typeof organizationUserProfileSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type PermissionSet = z.infer<typeof permissionSetSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Truck = z.infer<typeof truckSchema>;
export type Employee = z.infer<typeof employeeSchema>;
export type ChartEntry = z.infer<typeof chartEntrySchema>;
export type CalibrationChart = z.infer<typeof calibrationChartSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Product = z.infer<typeof productSchema>;
export type Loadout = z.infer<typeof loadoutSchema>;
export type CalibrationReport = z.infer<typeof calibrationReportSchema>;


// --- CONSTANTS ---

// All the resources used in the app
export const ORGANIZATION_RESOURCES = ["organizations", "employees", "roles", "trucks", "calibrationCharts", "assignments", "calibrationReports", "products", "loadouts"] as const;