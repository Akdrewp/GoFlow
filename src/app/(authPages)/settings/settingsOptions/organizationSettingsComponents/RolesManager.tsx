// -- Roles Component --

import { ORGANIZATION_RESOURCES, PermissionSet, Role } from "@/api/database/database";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const rolesApiEndpoint = (orgId: string, roleId?: string) => roleId ? `/api/organizations/${orgId}/roles/${roleId}` : `/api/organizations/${orgId}/roles`;
export function RolesManager({ organizationId, initialRoles }: { organizationId: string, initialRoles: Role[] | null }) {
  const [roles, setRoles] = useState(initialRoles || []);
  const [isAdding, setIsAdding] = useState(false);
  
  // State for editing
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleData, setEditingRoleData] = useState<Partial<Role>>({});

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveNew = async (newRoleData: Role) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(rolesApiEndpoint(organizationId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoleData),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to save role.');
      
      const savedRole = (await response.json()).data;
      setRoles(prev => [...prev, savedRole]);
      setIsAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (editingRoleData: Partial<Role>) => {
    if (!editingRoleId) return;
    setIsLoading(true);
    setError('');
    try {
      setEditingRoleData(editingRoleData);
      console.log("editingRoleData", editingRoleData);
      const response = await fetch(rolesApiEndpoint(organizationId, editingRoleId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRoleData),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to update role.');

      const updatedRole = (await response.json()).data;
      setRoles(prev => prev.map(r => r.roleId === editingRoleId ? { ...r, ...updatedRole } : r));
      setEditingRoleId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!window.confirm(`Are you sure you want to delete role "${roleId}"?`)) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(rolesApiEndpoint(organizationId, roleId), { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete role.');
      
      setRoles(prev => prev.filter(r => r.roleId !== roleId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable form component for roles
  const RoleForm = ({
    isEditMode = false,
    initialData,
    onSave,
    onCancel
  }: {
    isEditMode?: boolean;
    initialData: Partial<Role>;
    onSave: (data: Role) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState(initialData);

    const handlePermissionChange = (resource: typeof ORGANIZATION_RESOURCES[number], accessType: keyof PermissionSet, value: boolean) => {
      setFormData(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [resource]: {
            ...(prev.permissions ? prev.permissions[resource] : { read: false, write: false }),
            [accessType]: value
          }
        }
      }));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData as Role);
    };

    return (
      <form onSubmit={handleSubmit} className="p-4 rounded-md bg-input border-2 border-primary space-y-4">
        <h4 className="font-semibold text-foreground">{isEditMode ? `Editing: ${initialData.name}` : 'Create New Role'}</h4>
        <input type="text" placeholder="Role Name" value={formData.name || ''} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
        <input type="text" placeholder="Role ID" value={formData.roleId || ''} onChange={e => setFormData(p => ({...p, roleId: e.target.value}))} required disabled={isEditMode} className="block w-full rounded-md border-border bg-background shadow-sm p-2 disabled:bg-background/50" />
        <input type="number" placeholder="Role Level" value={formData.level || ''} onChange={e => setFormData(p => ({...p, level: parseInt(e.target.value, 10)}))} required className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Permissions</p>
          {ORGANIZATION_RESOURCES.map(resource => (
            <div key={resource} className="flex items-center justify-between p-2 rounded bg-background">
              <span className="capitalize text-muted-foreground">{resource}</span>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={formData.permissions?.[resource]?.read || false} onChange={e => handlePermissionChange(resource, 'read', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                  <span>Read</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={formData.permissions?.[resource]?.write || false} onChange={e => handlePermissionChange(resource, 'write', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                  <span>Write</span>
                </label>
              </div>
            </div>
          ))}
        </div>
        
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onCancel} disabled={isLoading} className="rounded-md px-3 py-1 text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={isLoading} className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
            {isLoading ? 'Saving...' : 'Save Role'}
          </button>
        </div>
      </form>
    );
  };
  
  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h3 className="text-lg font-semibold leading-6 text-foreground">Roles & Permissions</h3>
      <div className="mt-4 space-y-4">
        {roles.map(role => (
          editingRoleId === role.roleId ? (
            <RoleForm 
              key={role.roleId}
              isEditMode 
              initialData={editingRoleData} 
              onSave={(data) => { void handleUpdate(data); }} 
              onCancel={() => setEditingRoleId(null)} 
            />
          ) : (
            <div key={role.roleId} className="p-4 rounded-md bg-input border border-border flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground">{role.name}</p>
                <p className="text-xs text-muted-foreground">ID: {role.roleId} | Level: {role.level}</p>
              </div>
              <div className="flex space-x-2">
                 <button onClick={() => { setEditingRoleData(role); setEditingRoleId(role.roleId); }} className="p-2 hover:text-foreground"><Edit className="h-4 w-4"/></button>
                 <button onClick={() => { void handleDelete(role.roleId); }} className="p-2 text-red-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
              </div>
            </div>
          )
        ))}

        {isAdding && (
          <RoleForm
            initialData={{ permissions: ORGANIZATION_RESOURCES.reduce((acc, r) => ({...acc, [r]: {read: false, write: false}}), {}) }}
            onSave={(data) => { void handleSaveNew(data); }} 
            onCancel={() => setIsAdding(false)} 
          />
        )}
        
        {!isAdding && !editingRoleId && (
          <button onClick={() => setIsAdding(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create New Role
          </button>
        )}
        
        {error && <p className="text-sm text-destructive mt-4">{error}</p>}
      </div>
    </div>
  );
}