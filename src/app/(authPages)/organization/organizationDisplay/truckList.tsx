import { TankType, Truck } from "@/api/database/database";
import { Edit, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

// Component for Displaying and Managing the Truck List
export function TruckList({ 
  initialTrucks, 
  organizationId
}: { 
  initialTrucks: Truck[] | null, 
  organizationId: string 
}) {
  const [trucks, setTrucks] = useState(initialTrucks || []);
  const [isAdding, setIsAdding] = useState(false);
  
  // State for the inline "Add New Truck" form
  const [newTruckName, setNewTruckName] = useState('');
  const [newTruckId, setNewTruckId] = useState('');
  const [newTankType, setNewTankType] = useState<TankType>(TankType.SINGLE);
  const [newChartId, setNewChartId] = useState('');
  
  // State for the inline "Edit Truck" form
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);
  const [editingTruckData, setEditingTruckData] = useState<Partial<Truck>>({});

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Handlers for Adding a New Truck ---
  const handleAddNew = () => {
    setIsAdding(true);
    setEditingTruckId(null); // Ensure we're not in edit mode
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewTruckName('');
    setNewTruckId('');
    setNewTankType(TankType.SINGLE);
    setNewChartId('');
    setError('');
  };

  const handleSaveNewTruck = async () => {
    setIsLoading(true);
    setError('');
    try {
      const newTruckData: Truck = {
        name: newTruckName,
        truckId: newTruckId,
        tankType: newTankType,
        chartId: newChartId
      };
      
      const apiRoute = `/api/organizations/${organizationId}/trucks`;
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTruckData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to add truck.');
      }

      const savedTruck = await response.json();
      setTrucks(prev => [...prev, savedTruck.data]);
      handleCancelAdd();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers for Editing a Truck ---
  const handleEdit = (truck: Truck) => {
    setEditingTruckId(truck.truckId);
    setEditingTruckData(truck);
    setIsAdding(false); // Ensure we're not in add mode
  };

  const handleCancelEdit = () => {
    setEditingTruckId(null);
    setEditingTruckData({});
  };
  
  const handleUpdateTruck = async () => {
    if (!editingTruckId) return;
    setIsLoading(true);
    setError('');
    try {
      const apiRoute = `/api/organizations/${organizationId}/trucks/${editingTruckId}`;
      const response = await fetch(apiRoute, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTruckData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to update truck.');
      }

      const updatedTruck = await response.json();
      setTrucks(prev => prev.map(t => t.truckId === editingTruckId ? updatedTruck.data : t));
      handleCancelEdit();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handler for Deleting a Truck ---
  const handleDelete = async (truckId: string) => {
    // In a real app, you would show a confirmation modal here.
    if (confirm(`Are you sure you want to delete truck ${truckId}?`)) {
      setIsLoading(true);
      setError('');
      try {
        const apiRoute = `/api/organizations/${organizationId}/trucks/${truckId}`;
        const response = await fetch(apiRoute, { method: 'DELETE' });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'Failed to delete truck.');
        }

        setTrucks(prev => prev.filter(t => t.truckId !== truckId));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
  };


  if (!trucks || trucks.length === 0 && !isAdding) {
    return (
      <div className="text-center mt-8">
        <p className="text-muted-foreground mb-4">No trucks found for this organization.</p>
        <button onClick={handleAddNew} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Add Truck
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-foreground mb-4">Trucks</h2>
      <div className="rounded-lg border bg-card text-card-foreground">
        <div className="divide-y divide-border">
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-4 px-4 py-3 font-semibold">
            <div>Name</div>
            <div>Truck ID</div>
            <div>Tank Type</div>
            <div>Chart ID</div>
            <div>Actions</div>
          </div>
          {/* Table Body */}
          {trucks.map((truck) => (
            editingTruckId === truck.truckId ? (
              // --- EDITING ROW ---
              <div key={truck.truckId} className="grid grid-cols-5 gap-4 px-4 py-3 bg-muted/50 items-center">
                <input value={editingTruckData.name} onChange={e => setEditingTruckData({...editingTruckData, name: e.target.value})} className="bg-input border border-border rounded-md p-2 text-sm" />
                <input value={editingTruckData.truckId} disabled className="bg-input/50 border border-border rounded-md p-2 text-sm text-muted-foreground" />
                <select value={editingTruckData.tankType} onChange={e => setEditingTruckData({...editingTruckData, tankType: e.target.value as TankType})} className="bg-input border border-border rounded-md p-2 text-sm">
                  <option value={TankType.SINGLE}>Single</option>
                  <option value={TankType.SPLIT}>Split</option>
                </select>
                <input value={editingTruckData.chartId} onChange={e => setEditingTruckData({...editingTruckData, chartId: e.target.value})} className="bg-input border border-border rounded-md p-2 text-sm" />
                <div className="flex space-x-2">
                  <button onClick={() => { void handleUpdateTruck(); }} disabled={isLoading} className="p-2 text-green-500 hover:text-green-400"><Save className="h-5 w-5"/></button>
                  <button onClick={handleCancelEdit} disabled={isLoading} className="p-2 text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
                </div>
              </div>
            ) : (
              // --- DISPLAY ROW ---
              <div key={truck.truckId} className="grid grid-cols-5 gap-4 px-4 py-3 text-muted-foreground items-center">
                <div>{truck.name}</div>
                <div>{truck.truckId}</div>
                <div className="capitalize">{truck.tankType}</div>
                <div>{truck.chartId}</div>
                <div className="flex space-x-2">
                  <button onClick={() => handleEdit(truck)} className="p-2 hover:text-foreground"><Edit className="h-4 w-4"/></button>
                  <button onClick={() => { void handleDelete(truck.truckId); }} className="p-2 text-red-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
                </div>
              </div>
            )
          ))}
          {/* Inline Form for Adding New Truck */}
          {isAdding && (
            <div className="grid grid-cols-5 gap-4 px-4 py-3 bg-muted/50 items-center">
              <input type="text" placeholder="Truck Name" value={newTruckName} onChange={(e) => setNewTruckName(e.target.value)} className="bg-input border border-border rounded-md p-2 text-sm" />
              <input type="text" placeholder="Unique Truck ID" value={newTruckId} onChange={(e) => setNewTruckId(e.target.value)} className="bg-input border border-border rounded-md p-2 text-sm" />
              <select value={newTankType} onChange={(e) => setNewTankType(e.target.value as TankType)} className="bg-input border border-border rounded-md p-2 text-sm">
                <option value={TankType.SINGLE}>Single</option>
                <option value={TankType.SPLIT}>Split</option>
              </select>
              <input type="text" placeholder="Assigned Chart ID" value={newChartId} onChange={(e) => setNewChartId(e.target.value)} className="bg-input border border-border rounded-md p-2 text-sm" />
              <div className="flex space-x-2">
                {/** Save and Cancel icons */}
                <button onClick={() => { void handleSaveNewTruck(); }} disabled={isLoading} className="p-2 text-green-500 hover:text-green-400"><Save className="h-5 w-5"/></button>
                <button onClick={handleCancelAdd} disabled={isLoading} className="p-2 text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
              </div>
            </div>
          )}
        </div>
      </div>
       {/* "Add Truck" Button appears at the bottom if not currently adding */}
      {!isAdding && (
        <div className="mt-4">
          <button onClick={handleAddNew} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Add Truck
          </button>
        </div>
      )}
      {error && <p className="text-sm text-destructive mt-4">{error}</p>}
    </div>
  );
}