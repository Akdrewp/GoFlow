import { CalibrationChart, ChartEntry } from "@/api/database/database";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

// -- Calibration Component --
const chartsApiEndpoint = (orgId: string, chartId?: string) => chartId ? `/api/organizations/${orgId}/calibrationCharts/${chartId}` : `/api/organizations/${orgId}/calibrationCharts`;

export function CalibrationChartsManager({ organizationId, initialCharts }: { organizationId: string, initialCharts: CalibrationChart[] | null }) {
  const [charts, setCharts] = useState(initialCharts || []);
  const [isAdding, setIsAdding] = useState(false);
  
  // State for editing
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [editingChartData, setEditingChartData] = useState<Partial<CalibrationChart>>({});

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const tableToCsv = (table: ChartEntry[] | undefined): string => {
    if (!table) return '';
    return table.map(entry => `${entry.measurement},${entry.volume}`).join('\n');
  };

  const parseCsvToTable = (csv: string): ChartEntry[] => {
    return csv.split('\n').map(line => {
      const [measurement, volume] = line.split(',').map(Number);
      return { measurement, volume };
    }).filter(entry => !isNaN(entry.measurement) && !isNaN(entry.volume));
  };

  const handleSaveNew = async (newChartData: CalibrationChart) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(chartsApiEndpoint(organizationId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChartData),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to save chart.');
      
      const savedChart = (await response.json()).data;
      setCharts(prev => [...prev, savedChart]);
      setIsAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (updatedChartData: CalibrationChart) => {
    setEditingChartData(updatedChartData);

    if (!editingChartId) return;
    setIsLoading(true);
    setError('');
    try {


      const response = await fetch(chartsApiEndpoint(organizationId, editingChartId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Update with updated char information
        body: JSON.stringify(updatedChartData),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to update chart.');

      const updatedChart = (await response.json()).data;
      setCharts(prev => prev.map(c => c.chartId === editingChartId ? { ...c, ...updatedChart } : c));
      setEditingChartId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (chartId: string) => {
    if (!window.confirm(`Are you sure you want to delete chart "${chartId}"?`)) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(chartsApiEndpoint(organizationId, chartId), { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete chart.');
      
      setCharts(prev => prev.filter(c => c.chartId !== chartId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable form component for charts
  const ChartForm = ({
    isEditMode = false,
    initialData,
    onSave,
    onCancel
  }: {
    isEditMode?: boolean;
    initialData: Partial<CalibrationChart>;
    onSave: (data: CalibrationChart) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState(initialData);
    const [csvData, setCsvData] = useState(tableToCsv(initialData.productTable));

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const finalData = {
        ...formData,
        productTable: parseCsvToTable(csvData),
      };
      onSave(finalData as CalibrationChart);
    };

    return (
      <form onSubmit={handleSubmit} className="p-4 rounded-md bg-input border-2 border-primary space-y-4">
        <h4 className="font-semibold text-foreground">{isEditMode ? `Editing: ${initialData.name}` : 'Create New Chart'}</h4>
        <input type="text" placeholder="Chart Name" value={formData.name || ''} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
        <input type="text" placeholder="Chart ID" value={formData.chartId || ''} onChange={e => setFormData(p => ({...p, chartId: e.target.value}))} required disabled={isEditMode} className="block w-full rounded-md border-border bg-background shadow-sm p-2 disabled:bg-background/50" />
        <div>
          <label className="text-sm font-medium text-foreground">Chart Data (CSV: measurement,volume)</label>
          <textarea value={csvData} onChange={(e) => { setCsvData(e.target.value); }} rows={5} className="mt-1 block w-full rounded-md border-border bg-background shadow-sm p-2" placeholder="e.g.,&#10;10,50&#10;20,100&#10;30,150"></textarea>
        </div>
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onCancel} disabled={isLoading} className="rounded-md px-3 py-1 text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={isLoading} className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Save Chart'}
          </button>
        </div>
      </form>
    );
  };
  
  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h3 className="text-lg font-semibold leading-6 text-foreground">Calibration Charts</h3>
      <div className="mt-4 space-y-4">
        {charts.map(chart => (
          editingChartId === chart.chartId ? (
            <ChartForm 
              key={chart.chartId}
              isEditMode
              initialData={editingChartData}
              onSave={(chartData) => { void handleUpdate(chartData); }}
              onCancel={() => setEditingChartId(null)}
            />
          ) : (
            <div key={chart.chartId} className="p-4 rounded-md bg-input border border-border flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground">{chart.name}</p>
                <p className="text-xs text-muted-foreground">ID: {chart.chartId}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => { setEditingChartData(chart); setEditingChartId(chart.chartId); }} className="p-2 hover:text-foreground"><Edit className="h-4 w-4"/></button>
                <button onClick={() => { void handleDelete(chart.chartId); }} className="p-2 text-red-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
              </div>
            </div>
          )
        ))}

        {isAdding && (
          <ChartForm
            initialData={{}}
            onSave={(data) => { void handleSaveNew(data); }}
            onCancel={() => setIsAdding(false)}
          />
        )}
        
        {!isAdding && !editingChartId && (
          <button onClick={() => setIsAdding(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create New Chart
          </button>
        )}

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      </div>
    </div>
  );
}