'use client'; // This page now contains interactive client components

import { useState } from 'react';
import { Organization as OrganizationType, Employee, Role, TankType, Truck } from "@/api/database/database";
import { Plus } from 'lucide-react';

// --- Component for Displaying and Managing the Truck List ---
function TruckList({ 
  initialTrucks, 
  organizationId 
}: { 
  initialTrucks: Truck[] | null, 
  organizationId: string 
}) {
  const [trucks, setTrucks] = useState(initialTrucks || []);
  const [isAdding, setIsAdding] = useState(false);
  
  // State for the new truck form
  const [newName, setNewName] = useState('');
  const [newTruckId, setNewTruckId] = useState('');
  const [newTankType, setNewTankType] = useState<TankType>(TankType.SINGLE);
  const [newChartId, setNewChartId] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddNew = () => setIsAdding(true);

  const handleCancel = () => {
    setIsAdding(false);
    setError('');
    // Clear input fields
    setNewName('');
    setNewTruckId('');
    setNewTankType(TankType.SINGLE);
    setNewChartId('');
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    const newTruckData = { 
      name: newName, 
      truckId: newTruckId, 
      tankType: newTankType,
      chartId: newChartId,
    };

    try {
      const apiRoute = `/api/organizations/${organizationId}/trucks`;
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTruckData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add truck.');
      }

      const result = await response.json();
      console.log('API Response for new truck:', result); 

      // Optimistically update the UI with the new truck data
      setTrucks([...trucks, result.data]);
      handleCancel(); // Clear form on success
    } catch (e) {
      console.error("Error saving truck:", e);
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-foreground mb-4">Trucks</h2>
      <div className="rounded-lg border bg-card text-card-foreground">
        <div className="divide-y divide-border">
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-4 px-4 py-3 font-semibold">
            <div>Name</div>
            <div>Truck ID</div>
            <div>Tank Type</div>
            <div>Assigned Chart ID</div>
          </div>
          {/* Table Body */}
          {trucks.map((truck) => (
            <div key={truck.truckId} className="grid grid-cols-4 gap-4 px-4 py-3 text-muted-foreground items-center">
              <div>{truck.name}</div>
              <div>{truck.truckId}</div>
              <div className="capitalize">{truck.tankType}</div>
              <div>{truck.chartId}</div>
            </div>
          ))}
          {/* Inline Form for Adding New Truck */}
          {isAdding && (
            <div className="grid grid-cols-4 gap-4 px-4 py-3 items-center bg-muted/50">
              <div><input type="text" placeholder="Truck Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-input border border-border rounded-md w-full p-2 text-sm" /></div>
              <div><input type="text" placeholder="Truck ID" value={newTruckId} onChange={(e) => setNewTruckId(e.target.value)} className="bg-input border border-border rounded-md w-full p-2 text-sm" /></div>
              <div>
                <select value={newTankType} onChange={(e) => setNewTankType(e.target.value as TankType)} className="bg-input border border-border rounded-md w-full p-2 text-sm capitalize">
                  <option value={TankType.SINGLE}>Single</option>
                  <option value={TankType.SPLIT}>Split</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input type="text" placeholder="Chart ID" value={newChartId} onChange={(e) => setNewChartId(e.target.value)} className="bg-input border border-border rounded-md w-full p-2 text-sm" />
                <button onClick={() => { void handleSave(); }} disabled={isLoading} className="bg-primary text-primary-foreground h-9 px-3 rounded-md text-sm whitespace-nowrap">{isLoading ? 'Saving...' : 'Save'}</button>
                <button onClick={handleCancel} className="bg-muted text-muted-foreground h-9 px-3 rounded-md text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      {!isAdding && (
        <div className="mt-4">
          <button onClick={handleAddNew} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" /> Add Truck
          </button>
        </div>
      )}
    </div>
  );
}

// --- Component for Displaying and Managing the Employee List ---
function EmployeeList({ 
  employees: initialEmployees, 
  roles, 
  organizationId 
}: { 
  employees: Employee[] | null, 
  roles: Role[] | null, 
  organizationId: string 
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [isAdding, setIsAdding] = useState(false);
  
  // State for the new employee form
  const [newName, setNewName] = useState('');
  // This state now stores the selected role ID from the dropdown
  const [newRoleId, setNewRoleId] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [error, setError] = useState('');

  const handleAddNew = () => {
    setIsAdding(true);
    // Set the default selected role to the first one in the list, if available
    if (roles && roles.length > 0) {
      setNewRoleId(roles[0].roleId);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    // Clear input fields
    setNewName('');
    setNewRoleId('');
    setNewEmployeeId('');
    setError('');
  };

  const handleSave = async () => {
    setError('');
    const newEmployeeData = { 
      name: newName, 
      roleId: newRoleId, 
      employeeId: newEmployeeId,
      status: "invited" // New employees are always invited
    };

    try {
      // Construct the API endpoint with the dynamic organizationId
      const apiRoute = `/api/organizations/${organizationId}/employees`;

      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEmployeeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add employee.');
      }

      const result = await response.json();
      console.log('API Response:', result); 

      // Optimistically update the UI with the new employee data
      const newEmployee: Employee = {
        name: newName,
        roleId: newRoleId,
        employeeId: newEmployeeId,
        status: 'invited',
      };
      setEmployees([...(employees || []), newEmployee]);

      handleCancel(); // Clear form on success
      
    } catch (e) {
      console.error("Error saving employee:", e);
      setError((e as Error).message);
    }
  };


  //If the organization has no employees show no employees message
  if (!employees || employees.length === 0 && !isAdding) {
    return (
      <div className="text-center mt-8">
        <p className="text-muted-foreground mb-4">No employees found.</p>
        <button onClick={handleAddNew} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-foreground mb-4">Employees</h2>
      <div className="rounded-lg border bg-card text-card-foreground">
        <div className="divide-y divide-border">
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-4 px-4 py-3 font-semibold">
            <div className="col-span-2">Name</div>
            <div>Role</div>
            <div>Status</div>
            <div>Employee ID</div>
          </div>
          {/* Table Body */}
          {employees?.map((employee, index) => (
            <div key={index} className="grid grid-cols-5 gap-4 px-4 py-3 text-muted-foreground items-center">
              <div className="col-span-2">{employee.name}</div>
              <div>{employee.roleId}</div>
              <div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  employee.status === 'active' 
                  ? 'bg-success/20 text-success' 
                  : 'bg-muted text-muted-foreground'
                }`}>
                  {employee.status}
                </span>
              </div>
              <div>{employee.employeeId}</div>
            </div>
          ))}
          {/* Inline Form for Adding New Employee */}
          {isAdding && (
            <div className="grid grid-cols-5 gap-4 px-4 py-3 items-center bg-muted/50">
              <div className="col-span-2">
                <input type="text" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-input border border-border rounded-md w-full p-2 text-sm" />
              </div>
              <div>
                {/* Choose roles */}
                <select value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} className="bg-input border border-border rounded-md w-full p-2 text-sm">
                  {roles && roles.map(role => (
                    <option key={role.roleId} value={role.roleId}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs font-medium text-muted-foreground">Invited</div>
              <div>
                <input type="text" placeholder="Employee ID" value={newEmployeeId} onChange={(e) => setNewEmployeeId(e.target.value)} className="bg-input border border-border rounded-md w-full p-2 text-sm" />
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => { void handleSave(); }} className="bg-primary text-primary-foreground h-8 px-3 rounded-md text-sm">Save</button>
                <button onClick={handleCancel} className="bg-muted text-muted-foreground h-8 px-3 rounded-md text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      {/* "Add Employee" Button */}
      {!isAdding && (
        <div className="mt-4">
          <button onClick={handleAddNew} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </button>
        </div>
      )}
    </div>
  );
}

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