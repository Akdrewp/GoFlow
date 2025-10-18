'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';

import { CalibrationReport, Loadout, Product, Truck } from '@/api/database/database';
import { UserProfile } from '@/api/database/database';
import { CalibrationReportClient } from './TruckCalibrationReport';
import { useUser } from '@/app/lib/contexts/UserContext';

// Used for reloading after creating an organization
import { useRouter } from "next/navigation";

// A type for our augmented truck data, which includes assignment info
type DisplayTruck = Truck & { assignmentId?: string };

export interface TruckAssignmentData {
  initialTrucks: DisplayTruck[];
  currentUser: UserProfile;
  availableLoadouts: Loadout[];
  loadoutDetails: (Loadout & { products: Product[] }) | null;
  pastReports: CalibrationReport[] | null;
}

export function TruckAssignmentClient({ truckAssignmentData }: { truckAssignmentData: TruckAssignmentData }) {

  const router = useRouter();

  const userContext = useUser();

  const { 
    initialTrucks, 
    availableLoadouts,
    loadoutDetails,
    pastReports,
  } = truckAssignmentData;

  console.log("initialTrucks", initialTrucks);


  const [trucks, setTrucks] = useState(initialTrucks);
  const [currentUserAssignment, setCurrentUserAssignment] = useState(userContext.assignment);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // State to manage which truck is in the "assigning" state (showing the loadout dropdown)
  const [selectingTruckId, setSelectingTruckId] = useState<string | null>(null);
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string>('');

  // Get current user and organizationId
  const currentUser = userContext.user;
  if (currentUser.type !== 'organization') {
    setError("Cannot assign truck: User is not a valid organization member.");
    return;
  }
  const organizationId = currentUser.organizationId;

  const handleStartAssign = (truckId: string) => {
    setSelectingTruckId(truckId);
    setSelectedLoadoutId(''); // Reset selection
  };

  const handleCancelAssign = () => {
    setSelectingTruckId(null);
    setSelectedLoadoutId('');
  };

  const handleConfirmAssign = async (truckId: string) => {
    if (!selectedLoadoutId) {
      setError("Please select a loadout for this assignment.");
      return;
    }

    setIsLoading(truckId);
    setError('');
    try {
      const apiRoute = `/api/organizations/${organizationId}/assignments`;
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          truckId: truckId,
          employeeId: currentUser.employeeId,
          loadoutId: selectedLoadoutId, // Include the selected loadout
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to assign truck.');
      }

      const newAssignment = (await response.json()).data;
      setCurrentUserAssignment(newAssignment);
      // Update the trucks list to show the new assignment.
      setTrucks(prev => prev.map(t => t.truckId === truckId ? { ...t, assignedUserId: currentUser.uid } : t));

      router.refresh();

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(null);
    }
  };

  const handleUnassign = async () => {
    if (!currentUserAssignment) return;
    const { assignmentId, truckId } = currentUserAssignment;
    setIsLoading(truckId);
    setError('');
    try {
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

      setCurrentUserAssignment(undefined);
      setTrucks(prev => prev.map(t => t.truckId === truckId ? { ...t, assignedUserId: null } : t));
    
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* My Assigned Truck Section */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-4">My Assigned Truck</h2>
        {currentUserAssignment ? (
          <div className="p-4 rounded-lg border-2 border-primary bg-primary/10">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-lg text-primary">{trucks.find(t => t.truckId === currentUserAssignment.truckId)?.name}</p>
                <p className="text-sm text-muted-foreground">ID: {currentUserAssignment.truckId} | Loadout: {currentUserAssignment.loadoutId}</p>
              </div>
              <button 
                onClick={() => { void handleUnassign(); }}
                disabled={!!isLoading}
                className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/80 disabled:opacity-50"
              >
                {isLoading === currentUserAssignment.truckId ? 'Unassigning...' : 'Unassign'}
              </button>
            </div>
            {/* Conditionally render the new Calibration Report UI */}
            {loadoutDetails && (
              <CalibrationReportClient
                assignment={currentUserAssignment} 
                loadout={loadoutDetails}
                initialPastReports={pastReports}
                organizationId={organizationId}
              />
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">You are not currently assigned to a truck. Select one from the list below.</p>
        )}
      </div>

      {/* Available Trucks Section */}
      {!currentUserAssignment && (
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Available Trucks</h2>
          <div className="rounded-lg border bg-card text-card-foreground">
            <div className="divide-y divide-border">
              {trucks.map(truck => {
                const isAvailable = !truck.assignedUserId;
                return (
                  <div key={truck.truckId} className="p-4">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div>
                        <p className="font-semibold text-foreground">{truck.name}</p>
                        <p className="text-xs text-muted-foreground">{truck.truckId}</p>
                      </div>
                      <div className="capitalize text-muted-foreground">{truck.tankType} Tank</div>
                      <div className="flex justify-end">
                        {isAvailable ? (
                          <button
                            onClick={() => handleStartAssign(truck.truckId)}
                            disabled={!!isLoading}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                          >
                            Assign to Me
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            <Zap className="mr-1.5 h-4 w-4" />
                            In Use
                          </span>
                        )}
                      </div>
                    </div>
                    {selectingTruckId === truck.truckId && (
                      <div className="mt-4 pt-4 border-t border-border space-y-2">
                        <select value={selectedLoadoutId} onChange={(e) => setSelectedLoadoutId(e.target.value)} className="block w-full rounded-md border-border bg-input shadow-sm p-2 text-sm">
                          <option value="" disabled>Select a Loadout...</option>
                          {availableLoadouts.map(loadout => (
                            <option key={loadout.loadoutId} value={loadout.loadoutId}>{loadout.name}</option>
                          ))}
                        </select>
                        <div className="flex justify-end space-x-2">
                          <button onClick={handleCancelAssign} className="rounded-md px-3 py-1 text-sm font-medium hover:bg-muted">Cancel</button>
                          <button onClick={() => { void handleConfirmAssign(truck.truckId); }} disabled={!selectedLoadoutId || isLoading === truck.truckId} className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                            {isLoading === truck.truckId ? 'Confirming...' : 'Confirm Assignment'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {error && <p className="text-sm text-destructive mt-4">{error}</p>}
        </div>
      )}
    </div>
  );
}
