'use client';

import { Assignment, CalibrationReport } from "@/api/database/database";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

// A "hydrated" report with all the details needed for display
export interface DisplayReport extends CalibrationReport {
  productName: string;
  targetRate: number;
}

// A "hydrated" assignment with all its associated data
export interface DisplayAssignment extends Assignment {
  truckName: string;
  employeeName: string;
  reports: DisplayReport[];
}

// --- CLIENT COMPONENT for rendering the UI ---

// Calibration multiplier so calibration is not a small decimal
const CALIBRATION_MULTIPLIER = 1000000;

export function ReportsClient({ initialAssignments }: { initialAssignments: DisplayAssignment[] }) {
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);

  const toggleAssignment = (assignmentId: string) => {
    setOpenAssignmentId(prevId => prevId === assignmentId ? null : assignmentId);
  };

  if (initialAssignments.length === 0) {
    return <p className="text-muted-foreground">There are no active assignments to display reports for.</p>;
  }

  return (
    <div className="space-y-4">
      {initialAssignments.map(assignment => {
        // Find the latest report for EACH unique product in the assignment.
        const latestReportsByProduct = assignment.reports.reduce((acc, report) => {
          // Since the reports are sorted newest to oldest, the first time we see a
          // productId, it's the latest report for that product.
          if (!acc[report.productId]) {
            acc[report.productId] = report;
          }
          return acc;
        }, {} as { [productId: string]: DisplayReport });

        const latestReportsArray = Object.values(latestReportsByProduct);

        console.log("latestReportsArray: ",  latestReportsArray);

        return (
          <div key={assignment.assignmentId} className="rounded-lg border bg-card text-card-foreground">
            {/* Main, always-visible section */}
            <div className="p-4">
              <div 
                onClick={() => toggleAssignment(assignment.assignmentId)} 
                className="flex justify-between items-start cursor-pointer"
              >
                <div>
                  <p className="font-semibold text-foreground">{assignment.truckName} <span className="text-xs text-muted-foreground">({assignment.truckId})</span></p>
                  <p className="text-sm text-muted-foreground">Assigned to: {assignment.employeeName}</p>
                </div>
                <div className="p-1">
                  {openAssignmentId === assignment.assignmentId ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
              </div>
              
              {/* Display a summary for EACH of the latest reports */}
              <div className="mt-3 pt-3 border-t border-border/50 text-sm space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Latest Reports</p>
                {latestReportsArray.length > 0 ? (
                  latestReportsArray.map(latestReport => {
                    // Calculate deviation for each product's latest report
                    let deviation = 0;
                    if (latestReport.targetRate > 0) {
                      deviation = Math.abs(latestReport.actualCalibrationRate - latestReport.targetRate) / latestReport.targetRate;
                    }
                    return (
                      <div key={latestReport.reportId} className="flex justify-between items-center">
                        <span className="text-foreground font-medium">{latestReport.productName}</span>
                        <div className="flex items-center space-x-2">
                          <span 
                            className={`h-2.5 w-2.5 rounded-full ${
                              deviation <= 0.1 ? 'bg-success' : deviation <= 0.2 ? 'bg-warning' : 'bg-danger'
                            }`}
                            title={`Deviation: ${(deviation * 100).toFixed(1)}%`}
                          ></span>
                          <span className="text-foreground">
                            {(latestReport.actualCalibrationRate * CALIBRATION_MULTIPLIER).toFixed(3)}
                          </span>
                          <span className="text-muted-foreground">/ {latestReport.targetRate * CALIBRATION_MULTIPLIER}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No reports submitted yet.</p>
                )}
              </div>
            </div>

            {/* Collapsible content with full report history */}
            {openAssignmentId === assignment.assignmentId && (
              <div className="border-t border-border p-4">
                <h4 className="text-md font-semibold text-foreground mb-2">Full Report History</h4>
                <div className="divide-y divide-border text-sm">
                  <div className="grid grid-cols-5 gap-4 py-2 font-semibold text-muted-foreground">
                    <div>Product</div>
                    <div>Area Completed</div>
                    <div>Product Used</div>
                    <div>Actual Rate</div>
                    <div>Target Rate</div>
                  </div>
                  {assignment.reports.map(report => (
                    <div key={report.reportId} className="grid grid-cols-5 gap-4 py-3 items-center">
                      <div className="font-medium text-foreground">{report.productName}</div>
                      <div>{report.areaCompleted.toFixed(2)}</div>
                      <div>{report.productUsed.toFixed(2)}</div>
                      <div>{(report.actualCalibrationRate * CALIBRATION_MULTIPLIER).toFixed(3)}</div>
                      <div className="text-muted-foreground">{report.targetRate * CALIBRATION_MULTIPLIER}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}