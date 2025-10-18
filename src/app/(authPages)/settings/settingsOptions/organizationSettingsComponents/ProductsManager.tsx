import { MeasurementType, Product } from "@/api/database/database";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const productsApiEndpoint = (orgId: string, productId?: string) => productId ? `/api/organizations/${orgId}/products/${productId}` : `/api/organizations/${orgId}/products`;

// --- Products Component ---
export function ProductsManager({ organizationId, initialProducts }: { organizationId: string, initialProducts: Product[] | null }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [isAdding, setIsAdding] = useState(false);
  
  // State for editing
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductData, setEditingProductData] = useState<Partial<Product>>({});

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveNew = async (newProductData: Product) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(productsApiEndpoint(organizationId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProductData),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to save product.');
      
      const savedProduct = (await response.json()).data;
      setProducts(prev => [...prev, savedProduct]);
      setIsAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingProductId) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(productsApiEndpoint(organizationId, editingProductId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProductData),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to update product.');

      const updatedProduct = (await response.json()).data;
      setProducts(prev => prev.map(p => p.productId === editingProductId ? updatedProduct : p));
      setEditingProductId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm(`Are you sure you want to delete product "${productId}"?`)) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(productsApiEndpoint(organizationId, productId), { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete product.');
      
      setProducts(prev => prev.filter(p => p.productId !== productId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // A reusable form component for both adding and editing
  const ProductForm = ({
    isEditMode = false,
    initialData,
    onSave,
    onCancel
  }: {
    isEditMode?: boolean;
    initialData: Partial<Product>;
    onSave: (data: Product) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState(initialData);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData as Product);
    };

    return (
      <form onSubmit={handleSubmit} className="p-4 rounded-md bg-input border-2 border-primary space-y-4">
        <h4 className="font-semibold text-foreground">{isEditMode ? `Editing: ${initialData.name}` : 'Create New Product'}</h4>
        <input type="text" placeholder="Product Name (e.g., Herbicide A)" value={formData.name || ''} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
        <input type="text" placeholder="Product ID (e.g., herbicide-a)" value={formData.productId || ''} onChange={e => setFormData(p => ({...p, productId: e.target.value}))} required disabled={isEditMode} className="block w-full rounded-md border-border bg-background shadow-sm p-2 disabled:bg-background/50" />
        <select value={formData.measurementType || ''} onChange={e => setFormData(p => ({...p, measurementType: e.target.value as MeasurementType}))} required className="block w-full rounded-md border-border bg-background shadow-sm p-2">
          <option value="" disabled>Select Measurement Type...</option>
          <option value={MeasurementType.CALIBRATED}>Calibrated (Liquid)</option>
          <option value={MeasurementType.UNIT_COUNT}>Unit Count (Bags, etc.)</option>
        </select>
        <input type="text" placeholder="Unit Name (e.g., Liters, Bags)" value={formData.unitName || ''} onChange={e => setFormData(p => ({...p, unitName: e.target.value}))} required className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
        <input type="number" placeholder="Target Rate (e.g., 15.5)" value={formData.targetRate || ''} onChange={e => setFormData(p => ({...p, targetRate: parseFloat(e.target.value)}))} required className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onCancel} disabled={isLoading} className="rounded-md px-3 py-1 text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={isLoading} className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    );
  };
  
  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h3 className="text-lg font-semibold leading-6 text-foreground">Products</h3>
      <div className="mt-4 space-y-4">
        {products.map(product => (
          editingProductId === product.productId ? (
            <ProductForm 
              key={product.productId}
              isEditMode 
              initialData={editingProductData} 
              onSave={() => { void handleUpdate(); }} 
              onCancel={() => setEditingProductId(null)} 
            />
          ) : (
            <div key={product.productId} className="p-4 rounded-md bg-input border border-border flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground">{product.name}</p>
                <p className="text-xs text-muted-foreground">ID: {product.productId} | Target Rate: {product.targetRate} {product.unitName}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => { setEditingProductData(product); setEditingProductId(product.productId); }} className="p-2 hover:text-foreground"><Edit className="h-4 w-4"/></button>
                <button onClick={() => { void handleDelete(product.productId); }} className="p-2 text-red-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
              </div>
            </div>
          )
        ))}

        {isAdding && (
          <ProductForm 
            initialData={{ measurementType: MeasurementType.CALIBRATED }} 
            onSave={(data) => { void handleSaveNew(data); }} 
            onCancel={() => setIsAdding(false)} 
          />
        )}
        
        {!isAdding && !editingProductId && (
          <button onClick={() => setIsAdding(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create New Product
          </button>
        )}

        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      </div>
    </div>
  );
}