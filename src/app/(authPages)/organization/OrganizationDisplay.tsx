'use client'; // This page now contains interactive client components

import { Organization as OrganizationType, Employee, Role, Truck } from "@/api/database/database";

import { EmployeeList } from './organizationDisplay/EmployeeList';
import { TruckList } from './organizationDisplay/truckList';


// OrganizationType is Organization renamed to avoid
// confusion with organization component
export interface organizationDisplayData {
  info: OrganizationType | null, 
  employees: Employee[] | null,
  roles: Role[] | null,
  trucks: Truck[] | null
}

// --- Component to Display Organization Info, Employees, and Trucks ---
export function OrganizationDisplay({ data: organizationData }: { data: organizationDisplayData | null }) {
  if (!organizationData) {
    return "Error";
  }
  if (!organizationData.info) {
    return (
      <div className="p-6 rounded-lg border bg-card text-card-foreground">
        <h2 className="text-xl font-semibold">No Organization Found</h2>
        <p className="text-muted-foreground mt-2">You are not currently part of an organization.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Organization Header */}
      <div>
        <h1 className="text-5xl font-bold text-foreground">{organizationData.info.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{organizationData.info.organizationId}</p>
      </div>

      {/* Employee List */}
      <EmployeeList employees={organizationData.employees} organizationId={organizationData.info.organizationId} roles={organizationData.roles} />
      
      {/* Truck List */}
      <TruckList initialTrucks={organizationData.trucks} organizationId={organizationData.info.organizationId} />
    </div>
  );
}