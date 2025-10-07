import { CalibrationChart, ChartEntry } from "@/api/database/database";
import { Plus } from "lucide-react";
import { useState } from "react";

// -- Calibration Component --
const chartsApiEndpoint = (orgId: string) => `/api/organizations/${orgId}/calibrationCharts`;

export function CalibrationChartsManager({ organizationId, initialCharts }: { organizationId: string, initialCharts: CalibrationChart[] | null }) {
  const [charts, setCharts] = useState(initialCharts || []);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [newChartId, setNewChartId] = useState('');
  const [newChartName, setNewChartName] = useState('');
  const [isSplit, setIsSplit] = useState(false);
  const [product1Csv, setProduct1Csv] = useState('');
  const [product2Csv, setProduct2Csv] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const parseCsvToTable = (csv: string): ChartEntry[] => {
    return csv.split('\n').map(line => {
      const [measurement, volume] = line.split(',').map(Number);
      return { measurement, volume };
    }).filter(entry => !isNaN(entry.measurement) && !isNaN(entry.volume));
  };

  const handleSaveChart = async () => {
    setIsLoading(true);
    setError('');
    try {
      const newChartData: Partial<CalibrationChart> = {
        chartId: newChartId,
        name: newChartName,
        productTable: parseCsvToTable(product1Csv),
      };

      const response = await fetch(chartsApiEndpoint(organizationId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChartData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save chart.');
      }
      const savedChart = await response.json();
      setCharts(prev => [...prev, savedChart.data]);
      setIsAdding(false);
      // Reset form
      setNewChartId('');
      setNewChartName('');
      setIsSplit(false);
      setProduct1Csv('');
      setProduct2Csv('');

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    // Reset form fields
    setNewChartId('');
    setNewChartName('');
    setIsSplit(false);
    setProduct1Csv('');
    setProduct2Csv('');
    setError('');
  };
  
  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h3 className="text-lg font-semibold leading-6 text-foreground">Calibration Charts</h3>
      <div className="mt-4 space-y-4">
        {charts.map(chart => (
          <div key={chart.chartId} className="p-4 rounded-md bg-input border border-border">
            <p className="font-semibold text-foreground">{chart.name}</p>
            <p className="text-xs text-muted-foreground">ID: {chart.chartId}</p>
          </div>
        ))}

        {isAdding && (
          <div className="p-4 rounded-md bg-input border-2 border-primary space-y-4">
            <h4 className="font-semibold text-foreground">Create New Chart</h4>
            <input type="text" placeholder="Chart ID (e.g., model-y-split)" value={newChartId} onChange={e => setNewChartId(e.target.value)} className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
            <input type="text" placeholder="Chart Name (e.g., Model Y Split Tank)" value={newChartName} onChange={e => setNewChartName(e.target.value)} className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={isSplit} onChange={e => setIsSplit(e.target.checked)} className="rounded text-primary focus:ring-primary" />
              <span className="text-sm text-foreground">Split Tank Chart</span>
            </label>

            <div>
              <label className="text-sm font-medium text-foreground">Product 1 Data (CSV: measurement,volume)</label>
              <textarea value={product1Csv} onChange={e => setProduct1Csv(e.target.value)} rows={5} className="mt-1 block w-full rounded-md border-border bg-background shadow-sm p-2" placeholder="e.g.,&#10;10,50&#10;20,100&#10;30,150"></textarea>
            </div>

            {isSplit && (
              <div>
                <label className="text-sm font-medium text-foreground">Product 2 Data (CSV: measurement,volume)</label>
                <textarea value={product2Csv} onChange={e => setProduct2Csv(e.target.value)} rows={5} className="mt-1 block w-full rounded-md border-border bg-background shadow-sm p-2" placeholder="e.g.,&#10;10,45&#10;20,90"></textarea>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end space-x-2">
              <button onClick={handleCancel} disabled={isLoading} className="rounded-md px-3 py-1 text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => { void handleSaveChart(); }} disabled={isLoading} className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                {isLoading ? 'Saving...' : 'Save Chart'}
              </button>
            </div>
          </div>
        )}

        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create New Chart
          </button>
        )}
      </div>
    </div>
  );
}