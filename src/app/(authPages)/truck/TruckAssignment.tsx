'use client';

import { useState } from 'react';
import { Truck, Assignment, UserProfile  } from '@/api/database/database';
import { Zap } from 'lucide-react';

// A new type for our augmented truck data, which includes the assignmentId for easier management.
type DisplayTruck = Truck & { assignmentId?: string };

// This is the interactive client component that displays the UI.
export function TruckAssignmentClient({ 
  initialTrucks, 
  initialCurrentUserAssignment, 
  currentUser,
  organizationId,
}: { 
  initialTrucks: DisplayTruck[];
  initialCurrentUserAssignment: Assignment | null;
  currentUser: UserProfile; // Simplified type for current user profile
  organizationId: string;
}) {
  const [trucks, setTrucks] = useState(initialTrucks);
  const [currentUserAssignment, setCurrentUserAssignment] = useState(initialCurrentUserAssignment);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAssign = async (truckId: string) => {
    setIsLoading(truckId);
    setError('');
    try {
      const apiRoute = `/api/organizations/${organizationId}/assignments`;
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          truckId: truckId,
          userId: currentUser.uid,
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

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(null);
    }
  };

  const handleUnassign = async () => {
    // We get all necessary info from the currentUserAssignment state.
    if (!currentUserAssignment) return;

    const { assignmentId, truckId } = currentUserAssignment;
    setIsLoading(truckId);
    setError('');
    try {
      // Update via PUT route
      const apiRoute = `/api/organizations/${organizationId}/assignments/${assignmentId}`;
      const response = await fetch(apiRoute, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentUserAssignment),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to unassign truck.');
      }

      setCurrentUserAssignment(null);

      // Update the trucks list to show the truck is now available.
      setTrucks(prev => prev.map(t => t.truckId === truckId ? { ...t, assignedUserId: undefined } : t));
    
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section for the user's currently assigned truck */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-4">My Assigned Truck</h2>
        {currentUserAssignment ? (
          <div className="p-4 rounded-lg border-2 border-primary bg-primary/10">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-lg text-primary">{trucks.find(t => t.truckId === currentUserAssignment.truckId)?.name}</p>
                <p className="text-sm text-muted-foreground">ID: {currentUserAssignment.truckId}</p>
              </div>
              <button 
                onClick={() => { void handleUnassign(); }}
                disabled={!!isLoading}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {isLoading === currentUserAssignment.truckId ? 'Unassigning...' : 'Unassign'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">You are not currently assigned to a truck. Select one from the list below.</p>
        )}
      </div>

      {/* Section for the list of all available trucks - ONLY shown if the user is NOT currently assigned */}
      {!currentUserAssignment && (
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Available Trucks</h2>
          <div className="rounded-lg border bg-card text-card-foreground">
            <div className="divide-y divide-border">
              {trucks.map(truck => {
                const isAvailable = !truck.assignedUserId;

                return (
                  <div key={truck.truckId} className="grid grid-cols-3 gap-4 p-4 items-center">
                    <div>
                      <p className="font-semibold text-foreground">{truck.name}</p>
                      <p className="text-xs text-muted-foreground">{truck.truckId}</p>
                    </div>
                    <div className="capitalize text-muted-foreground">{truck.tankType} Tank</div>
                    <div className="flex justify-end">
                      {isAvailable ? (
                        <button
                          onClick={() => { void handleAssign(truck.truckId); }}
                          disabled={!!isLoading}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading === truck.truckId ? 'Assigning...' : 'Assign to Me'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          <Zap className="mr-1.5 h-4 w-4" />
                          In Use
                        </span>
                      )}
                    </div>
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

