'use client';

import { useState } from 'react';
import { Truck, Employee, Loadout } from '@/api/database/database';

// A new type for our augmented truck data
export type DisplayTruck = Truck & { 
  assignmentId?: string;
  assignedUserName?: string; 
};

// Interface for the component's props
export interface TruckAssignmentData {
  initialTrucks: DisplayTruck[];
  allEmployees: Employee[];
  organizationId: string;
  availableLoadouts: Loadout[];
}

// This is the interactive client component that displays the UI for managers.
export function AssignClient({ assignmentData }: { assignmentData: TruckAssignmentData }) {
  const { 
    initialTrucks, 
    allEmployees,
    organizationId,
    availableLoadouts,
  } = assignmentData;

  const [trucks, setTrucks] = useState(initialTrucks);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // State for the manager's assignment form
  const [assigningTruckId, setAssigningTruckId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string>('');

  // User for filtering out users with active assignments when assigning
  const assignedUserIds = new Set(trucks.map(truck => truck.assignedUserId).filter(Boolean));

  const handleStartAssign = (truckId: string) => {
    setAssigningTruckId(truckId);
    setSelectedEmployeeId('');
    setSelectedLoadoutId('');
  };

  const handleAssign = async (truckId: string) => {
    setIsLoading(truckId);
    setError('');
    
    const employeeToAssign = allEmployees.find(e => e.uid === selectedEmployeeId);

    try {
      if (!employeeToAssign || !employeeToAssign.uid) {
        setError("Please select a valid employee to assign.");
        setIsLoading(null);
        return;
      }
      if (!selectedLoadoutId) {
          setError("Please select a loadout for the assignment.");
          setIsLoading(null);
          return;
      }

      // Create an assignment with selected employee's information
      const apiRoute = `/api/organizations/${organizationId}/assignments`;
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          truckId: truckId,
          userId: employeeToAssign.uid,
          employeeId: employeeToAssign.employeeId,
          loadoutId: selectedLoadoutId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to assign truck.');
      }
      
      const newAssignment = (await response.json()).data;

      // Convert to variable since it may be accessed elsewhere
      //  assignedUserId: employeeToAssign.uid gives error
      const assignedUserId = employeeToAssign.uid;
      // Update the trucks list to show the new assignment details
      setTrucks(prev => prev.map(t => t.truckId === truckId ? { 
        ...t, 
        assignedUserId: assignedUserId, 
        assignedUserName: employeeToAssign.name,
        assignmentId: newAssignment.assignmentId,
      } : t));

      setAssigningTruckId(null);
      setSelectedEmployeeId('');
      setSelectedLoadoutId('');

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(null);
    }
  };

  const handleUnassign = async (assignmentId: string, truckId: string) => {
    setIsLoading(truckId);
    setError('');
    try {
      // End assignment via PUT by setting unAssignedAt to current date
      const apiRoute = `/api/organizations/${organizationId}/assignments/${assignmentId}`;
      const response = await fetch(apiRoute, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unassignedAt: new Date() }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to unassign truck.');
      }
      
      // When unassigning, set assignedUserId to null to match the type definition
      setTrucks(prev => prev.map(t => t.truckId === truckId ? { ...t, assignedUserId: null, assignedUserName: undefined, assignmentId: undefined } : t));
    
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(null);
    }
  };

  // --- RENDER LOGIC ---
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Truck Assignment</h1>
      <p className="text-muted-foreground">Assign available trucks to employees in your organization.</p>
      <div className="rounded-lg border bg-card text-card-foreground">
        <div className="divide-y divide-border">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4 px-4 py-3 font-semibold">
            <div>Truck</div>
            <div>Status</div>
            <div>Assigned To / Select</div>
            <div className="text-right">Actions</div>
          </div>
          {/* Body */}
          {trucks.map(truck => (
            <div key={truck.truckId} className="p-4">
              <div className="grid grid-cols-4 gap-4 items-center">
                <div>
                  <p className="font-semibold text-foreground">{truck.name}</p>
                  <p className="text-xs text-muted-foreground">{truck.truckId}</p>
                </div>
                <div>
                  {truck.assignedUserId ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-500">In Use</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success">Available</span>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">{truck.assignedUserName || '_'}</p>
                </div>
                <div className="flex justify-end space-x-2">
                  {truck.assignedUserId ? (
                     <button onClick={() => { void handleUnassign(truck.assignmentId!, truck.truckId); }} disabled={!!isLoading} className="rounded-md px-3 py-1.5 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/80">
                      {isLoading === truck.truckId ? '...' : 'Unassign'}
                    </button>
                  ) : (
                    <button onClick={() => handleStartAssign(truck.truckId)} disabled={!!isLoading} className="rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                      Assign
                    </button>
                  )}
                </div>
              </div>
              {assigningTruckId === truck.truckId && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="bg-input border border-border rounded-md p-2 text-sm w-full">
                      <option value="" disabled>Select Employee...</option>
                      {/* Filter the list to only show employees who are not currently assigned */}
                      {allEmployees.filter(e => e.uid && !assignedUserIds.has(e.uid)).map(emp => 
                        <option key={emp.uid} value={emp.uid}>{emp.name}</option>
                      )}
                    </select>
                    <select value={selectedLoadoutId} onChange={e => setSelectedLoadoutId(e.target.value)} className="bg-input border border-border rounded-md p-2 text-sm w-full">
                        <option value="" disabled>Select Loadout...</option>
                        {availableLoadouts.map(loadout => <option key={loadout.loadoutId} value={loadout.loadoutId}>{loadout.name}</option>)}
                    </select>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setAssigningTruckId(null)} className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted">Cancel</button>
                        <button onClick={() => { void handleAssign(truck.truckId); }} disabled={!selectedEmployeeId || !selectedLoadoutId || !!isLoading} className="rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                            Save
                        </button>
                    </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-4">{error}</p>}
    </div>
  );
}
