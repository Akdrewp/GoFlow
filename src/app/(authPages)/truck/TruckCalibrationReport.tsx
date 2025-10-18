import { Assignment, CalibrationReport, Loadout, Product } from "@/api/database/database";
import { useState } from "react";

function ProductReportForm({
  assignment,
  product,
  organizationId,
  onReportSubmitted,
  pastReportsForProduct,
}: {
  assignment: Assignment,
  product: Product,
  organizationId: string,
  onReportSubmitted: (newReport: CalibrationReport) => void,
  pastReportsForProduct: CalibrationReport[],
}) {
  const [areaCompleted, setAreaCompleted] = useState('');
  const [measurement, setMeasurement] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const apiRoute = `/api/organizations/${organizationId}/calibrationReports`;
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckId: assignment.truckId,
          assignmentId: assignment.assignmentId,
          productId: product.productId,
          areaCompleted: parseFloat(areaCompleted),
          productMeasurement: parseFloat(measurement),
        }),
      });
      if (!response.ok) {
        throw new Error((await response.json()).message || 'Failed to submit report.');
      }
      const newReport = (await response.json()).data;
      console.log("newReport ", newReport);
      onReportSubmitted(newReport); // Lift state up to parent
      setAreaCompleted('');
      setMeasurement('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <h4 className="text-lg font-semibold text-foreground">{product.name}</h4>
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3 mt-2">
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Area Completed</label>
          <input type="number" step="any" value={areaCompleted} onChange={e => setAreaCompleted(e.target.value)} required className="mt-1 block w-full rounded-md border-border bg-input p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground">Measurement ({product.unitName})</label>
          <input type="number" step="any" value={measurement} onChange={e => setMeasurement(e.target.value)} required className="mt-1 block w-full rounded-md border-border bg-input p-2" />
        </div>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        <button type="submit" disabled={isLoading} className="w-full rounded-md bg-primary py-2 px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {isLoading ? 'Submitting...' : `Submit Report for ${product.name}`}
        </button>
      </form>
      <div className="mt-4">
        <h5 className="text-sm font-semibold text-muted-foreground mb-2">Recent Reports for {product.name}</h5>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {pastReportsForProduct.length > 0 ? pastReportsForProduct.map(report => (
            <div key={report.reportId} className="p-2 bg-background rounded text-sm">
              <p>Area: {report.areaCompleted.toFixed(2)} | Measurement: {report.productMeasurement} | Used: {report.productUsed.toFixed(2)} | Rate: {(report.actualCalibrationRate * 1000000).toFixed(0)}</p>
              <p className="text-muted-foreground">{new Date(report.createdAt).toLocaleTimeString()}</p>
            </div>
          )) : <p className="text-xs text-muted-foreground">No reports yet.</p>}
        </div>
      </div>
    </div>
  );
}

// --- Main component that orchestrates the product forms ---
export function CalibrationReportClient({ 
  assignment, 
  loadout,
  initialPastReports,
  organizationId
}: { 
  assignment: Assignment, 
  loadout: (Loadout & { products: Product[] }),
  initialPastReports: CalibrationReport[] | null,
  organizationId: string
}) {
  const [pastReports, setPastReports] = useState(initialPastReports || []);

  const handleNewReport = (newReport: CalibrationReport) => {
    // Add the new report to the top of the list, maintaining chronological order
    setPastReports(prev => [newReport, ...prev].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  return (
    <div className="mt-6 pt-6 border-t border-primary/20 space-y-6">
      <h3 className="text-xl font-semibold text-foreground">Submit Calibration Reports</h3>
      <div className="p-4 bg-card rounded-lg border space-y-6 divide-y divide-border">
        {loadout.products.map(product => (
          <ProductReportForm
            key={product.productId}
            assignment={assignment}
            product={product}
            organizationId={organizationId}
            onReportSubmitted={handleNewReport}
            pastReportsForProduct={pastReports.filter(r => r.productId === product.productId)}
          />
        ))}
      </div>
    </div>
  );
}