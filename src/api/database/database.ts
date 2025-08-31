import { z } from "zod";

// --- INTERFACES ---

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
export const ORGANIZATION_RESOURCES = ["organizations", "employees", "roles", "trucks"];

// A permission set for a resource
// Just read and write for now
export interface PermissionSet {
    read: boolean;
    write: boolean;
}

// The main interface for a Role document
export interface Role {
    name: string;
    // A map where the key is the resource name (e.g., "trucks")
    // and the value is the set of permissions for that resource.
    permissions: {
        [resource: string]: PermissionSet;
    };
}

// The updated Employee interface
export interface Employee {
    name: string;
    roleId: string; // Changed from 'role' to link to a Role document
    status: string;
    employeeId: string;
    email?: string;
    uid?: string;
}


// --- ZOD SCHEMAS ---

export const userProfileSchema = z.object({
    name: z.string(),
    email: z.string(),
    uid: z.string(),
    createdAt: z.coerce.date(),
    organizationId: z.string().optional(),
    employeeId: z.string().optional()
});

export const organizationSchema = z.object({
    name: z.string(),
    email: z.string(),
    createdAt: z.coerce.date(),
    organizationId: z.string(),
    createdBy: z.string()
});

// A schema for the PermissionSet
export const permissionSetSchema = z.object({
    read: z.boolean(),
    write: z.boolean(),
});

// A schema for the Role
export const roleSchema = z.object({
    name: z.string().min(1, "Role name is required"),
    permissions: z.record(z.string(), permissionSetSchema),
});

// The updated employeeSchema
export const employeeSchema = z.object({
    name: z.string().min(1, "Name is required"),
    roleId: z.string().min(1, "Role ID is required"), // Changed from 'role'
    status: z.enum(["invited", "active"]),
    employeeId: z.string().min(1, "Employee ID is required"),
    email: z.string().email().optional(),
    uid: z.string().optional(),
});
