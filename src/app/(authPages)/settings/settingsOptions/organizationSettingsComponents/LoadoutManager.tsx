import { Loadout, Product } from "@/api/database/database";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const loadoutsApiEndpoint = (orgId: string, loadoutId?: string) => loadoutId ? `/api/organizations/${orgId}/loadouts/${loadoutId}` : `/api/organizations/${orgId}/loadouts`;


// --- Loadout Component ---
export function LoadoutsManager({ organizationId, initialLoadouts, availableProducts }: { organizationId: string, initialLoadouts: Loadout[] | null, availableProducts: Product[] | null }) {
  const [loadouts, setLoadouts] = useState(initialLoadouts || []);
  const [isAdding, setIsAdding] = useState(false);
  
  // State for editing
  const [editingLoadoutId, setEditingLoadoutId] = useState<string | null>(null);
  const [editingLoadoutData, setEditingLoadoutData] = useState<Partial<Loadout>>({});

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveNew = async (newLoadoutData: Loadout) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(loadoutsApiEndpoint(organizationId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoadoutData),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to save loadout.');
      
      const savedLoadout = (await response.json()).data;
      setLoadouts(prev => [...prev, savedLoadout]);
      setIsAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingLoadoutId) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(loadoutsApiEndpoint(organizationId, editingLoadoutId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLoadoutData),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to update loadout.');

      const updatedLoadout = (await response.json()).data;
      setLoadouts(prev => prev.map(l => l.loadoutId === editingLoadoutId ? updatedLoadout : l));
      setEditingLoadoutId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (loadoutId: string) => {
    if (!window.confirm(`Are you sure you want to delete loadout "${loadoutId}"?`)) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(loadoutsApiEndpoint(organizationId, loadoutId), { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete loadout.');
      
      setLoadouts(prev => prev.filter(l => l.loadoutId !== loadoutId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // A reusable form component for both adding and editing loadouts
  const LoadoutForm = ({
    isEditMode = false,
    initialData,
    onSave,
    onCancel
  }: {
    isEditMode?: boolean;
    initialData: Partial<Loadout>;
    onSave: (data: Loadout) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState(initialData);

    const handleProductSelection = (selectedOptions: HTMLOptionsCollection) => {
        const selectedProductIds = Array.from(selectedOptions)
            .filter(option => option.selected)
            .map(option => option.value);
        setFormData(prev => ({ ...prev, productIds: selectedProductIds }));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData as Loadout);
    };

    return (
      <form onSubmit={handleSubmit} className="p-4 rounded-md bg-input border-2 border-primary space-y-4">
        <h4 className="font-semibold text-foreground">{isEditMode ? `Editing: ${initialData.name}` : 'Create New Loadout'}</h4>
        <input type="text" placeholder="Loadout Name (e.g., Spring Herbicide Mix)" value={formData.name || ''} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
        <input type="text" placeholder="Loadout ID (e.g., spring-mix)" value={formData.loadoutId || ''} onChange={e => setFormData(p => ({...p, loadoutId: e.target.value}))} required disabled={isEditMode} className="block w-full rounded-md border-border bg-background shadow-sm p-2 disabled:bg-background/50" />
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Select Products</label>
          <select 
            multiple 
            value={formData.productIds || []} 
            onChange={(e) => handleProductSelection(e.target.options)}
            className="block w-full rounded-md border-border bg-background shadow-sm p-2 h-32"
          >
            {availableProducts?.map(product => (
              <option key={product.productId} value={product.productId}>{product.name} ({product.productId})</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">Hold Ctrl/Cmd to select multiple products.</p>
        </div>

        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onCancel} disabled={isLoading} className="rounded-md px-3 py-1 text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={isLoading} className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Save Loadout'}
          </button>
        </div>
      </form>
    );
  };
  
  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h3 className="text-lg font-semibold leading-6 text-foreground">Loadouts</h3>
      <div className="mt-4 space-y-4">
        {loadouts.map(loadout => (
          editingLoadoutId === loadout.loadoutId ? (
            <LoadoutForm 
              key={loadout.loadoutId}
              isEditMode 
              initialData={editingLoadoutData} 
              onSave={() => { void handleUpdate(); }} 
              onCancel={() => setEditingLoadoutId(null)} 
            />
          ) : (
            <div key={loadout.loadoutId} className="p-4 rounded-md bg-input border border-border flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground">{loadout.name}</p>
                <p className="text-xs text-muted-foreground">ID: {loadout.loadoutId} | Products: {loadout.productIds.join(', ')}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => { setEditingLoadoutData(loadout); setEditingLoadoutId(loadout.loadoutId); }} className="p-2 hover:text-foreground"><Edit className="h-4 w-4"/></button>
                <button onClick={() => { void handleDelete(loadout.loadoutId); }} className="p-2 text-red-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
              </div>
            </div>
          )
        ))}

        {isAdding && (
          <LoadoutForm 
            initialData={{ productIds: [] }} 
            onSave={(data) => { void handleSaveNew(data); }} 
            onCancel={() => setIsAdding(false)} 
          />
        )}
        
        {!isAdding && !editingLoadoutId && (
          <button onClick={() => setIsAdding(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create New Loadout
          </button>
        )}

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      </div>
    </div>
  );
}