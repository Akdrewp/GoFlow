'use client';

import { useState } from 'react';
import { Truck, Employee } from '@/api/database/database';

// A new type for our augmented truck data
export type DisplayTruck = Truck & { 
  assignmentId?: string;
  assignedUserName?: string; 
};

// Interface for the component's props
interface TruckAssignmentData {
  initialTrucks: DisplayTruck[];
  allEmployees: Employee[];
  organizationId: string;
}

// This is the interactive client component that displays the UI for managers.
export function AssignClient({ assignmentData }: { assignmentData: TruckAssignmentData }) {
  const { 
    initialTrucks, 
    allEmployees,
    organizationId,
  } = assignmentData;

  const [trucks, setTrucks] = useState(initialTrucks);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // State for the manager's assignment form
  const [assigningTruckId, setAssigningTruckId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const handleAssign = async (truckId: string) => {
    setIsLoading(truckId);
    setError('');
    
    // Check if choosing an employee that doesn't exist
    // OR
    // An employee who hasn't signed up yet
    const employeeToAssign = allEmployees.find(e => e.uid === selectedEmployeeId);
    if (!employeeToAssign || !employeeToAssign.uid) {
      setError("Please select a valid employee to assign.");
      setIsLoading(null);
      return;
    }

    try {
      // Create an assignment with selected employees
      // information
      const apiRoute = `/api/organizations/${organizationId}/assignments`;
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          truckId: truckId,
          userId: employeeToAssign.uid,
          employeeId: employeeToAssign.employeeId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to assign truck.');
      }
      
      const newAssignment = (await response.json()).data;
      
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
      // End assignment via POST by setting unAssignedAt to current date
      const apiRoute = `/api/organizations/${organizationId}/assignments/${assignmentId}`;
      const response = await fetch(apiRoute, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
            <div>Assigned To</div>
            <div className="text-right">Actions</div>
          </div>
          {/* Body */}
          {trucks.map(truck => (
            <div key={truck.truckId} className="grid grid-cols-4 gap-4 p-4 items-center">
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
                {assigningTruckId === truck.truckId ? (
                  <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="bg-input border border-border rounded-md p-2 text-sm w-full">
                    <option value="" disabled>Select Employee...</option>
                    {allEmployees.map(emp => <option key={emp.uid} value={emp.uid}>{emp.name}</option>)}
                  </select>
                ) : (
                  <p className="text-muted-foreground">{truck.assignedUserName || '—'}</p>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                {truck.assignedUserId ? (
                   <button onClick={() => { void handleUnassign(truck.assignmentId!, truck.truckId); }} disabled={!!isLoading} className="rounded-md px-3 py-1.5 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/80">
                    {isLoading === truck.truckId ? '...' : 'Unassign'}
                  </button>
                ) : assigningTruckId === truck.truckId ? (
                  <>
                    <button onClick={() => { void handleAssign(truck.truckId); }} disabled={!selectedEmployeeId || !!isLoading} className="rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                      Save
                    </button>
                    <button onClick={() => setAssigningTruckId(null)} className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={() => setAssigningTruckId(truck.truckId)} disabled={!!isLoading} className="rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                    Assign
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-4">{error}</p>}
    </div>
  );
}