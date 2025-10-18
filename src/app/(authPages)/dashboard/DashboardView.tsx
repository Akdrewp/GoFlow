'use client';

import Link from 'next/link';
import { ArrowUpRight, Truck } from 'lucide-react';
import { CalibrationReport, Truck as TruckType } from '@/api/database/database';
import { useUser } from '@/app/lib/contexts/UserContext';


// Data for displaying assignment on dashboard
interface DashboardData {
  reports: CalibrationReport[];
  truck: TruckType | undefined;
}

// --- NEW Manager Actions Component ---
// A small, focused component for manager-specific links.
function ManagerActions() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-4">Manager Tools</h2>
      <div className="rounded-lg border bg-card p-6">
        <div className="flex w-full items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">View Full Reports</h3>
            <p className="text-sm text-muted-foreground">See all active assignments and their calibration reports.</p>
          </div>
          <Link href="/reports">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90">
              Go to Reports <ArrowUpRight className="ml-2 h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}


// --- UNIFIED CLIENT COMPONENT ---
// Renamed from EmployeeDashboardClient
export function DashboardView({ dashboardData }: { dashboardData: DashboardData }) {

  const userContext = useUser();
  const assignment = userContext.assignment;
  const isManager = userContext.isManager;


  const { reports, truck } = dashboardData;

  // This is the base view that everyone sees.
  const employeeView = (
    <>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">My Current Assignment</h2>
        <div className="mt-4 p-4 rounded-lg border bg-card">
          {assignment && truck ? (
            <>
              <p className="text-lg font-semibold text-primary">{truck.name}</p>
              <p className="text-sm text-muted-foreground">Truck ID: {truck.truckId} | Loadout: {assignment.loadoutId}</p>
            </>
          ) : (
            <div className="text-center py-8">
               <h3 className="text-xl font-semibold text-foreground">You are not assigned to a truck.</h3>
               <p className="mt-2 text-muted-foreground">Please assign yourself to a truck to begin submitting reports.</p>
               <Link href="/truck">
                 <button className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90">
                   <Truck className="mr-2 h-4 w-4" /> Assign a Truck
                 </button>
               </Link>
             </div>
          )}
        </div>
      </div>

      {assignment && (
         <div>
          <h2 className="text-2xl font-semibold text-foreground">My Recent Reports</h2>
          <div className="mt-4 space-y-2">
            {reports.length > 0 ? reports.slice(0, 5).map(report => (
              <div key={report.reportId} className="p-3 rounded-lg border bg-card flex justify-between">
                <div>
                  <p className="font-medium text-foreground">Product: {report.productId}</p>
                  <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-foreground">Rate: {(report.actualCalibrationRate * 1000000).toFixed(3)}</p>
                  <p className="text-xs text-muted-foreground">Used: {report.productUsed.toFixed(2)}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">You have not submitted any reports for this assignment yet.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
  
  return (
    <div className="space-y-8">
      {employeeView}
      
      {/* Conditionally render the manager actions */}
      {isManager && (
        <ManagerActions />
      )}
    </div>
  );
}

