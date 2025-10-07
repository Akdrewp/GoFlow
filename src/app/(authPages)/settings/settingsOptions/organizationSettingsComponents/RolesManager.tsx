// -- Roles Component --

import { ORGANIZATION_RESOURCES, Role } from "@/api/database/database";
import { Plus } from "lucide-react";
import { useState } from "react";

const rolesApiEndpoint = (orgId: string) => `/api/organizations/${orgId}/roles`;
export function RolesManager({ organizationId, initialRoles }: { organizationId: string, initialRoles: Role[] | null }) {
  const [roles, setRoles] = useState(initialRoles || []);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state for new role
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleLevel, setNewRoleLevel] = useState(''); // State for the new level
  const [newPermissions, setNewPermissions] = useState<Role['permissions']>(() => {
    // Initialize all permissions to false
    return ORGANIZATION_RESOURCES.reduce((acc, resource) => {
      acc[resource] = { read: false, write: false };
      return acc;
    }, {} as Role['permissions']);
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePermissionChange = (resource: typeof ORGANIZATION_RESOURCES[number], accessType: string, value: boolean) => {
    setNewPermissions(prev => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [accessType]: value
      }
    }));
  };

  const handleSaveRole = async () => {
    setIsLoading(true);
    setError('');
    try {
      const newRoleData: Role = {
        roleId: newRoleId,
        name: newRoleName,
        level: parseInt(newRoleLevel, 10) || 0, // Parse level to a number
        permissions: newPermissions
      };

      const response = await fetch(rolesApiEndpoint(organizationId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save role.');
      }

      const savedRole = await response.json();
      console.log("Saved Role: ", savedRole);
      setRoles(prev => [...prev, savedRole.data]);
      setIsAdding(false);
      // Reset form
      setNewRoleName('');
      setNewRoleId('');
      setNewRoleLevel(''); // Reset level input

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewRoleName('');
    setNewRoleId('');
    setNewRoleLevel('');
    setError('');
  };


  // Log the current state of roles for debugging
  console.log('Current roles:', roles);


  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h3 className="text-lg font-semibold leading-6 text-foreground">Roles & Permissions</h3>
      <div className="mt-4 space-y-4">
        {roles.map(role => (
          <div key={role.roleId} className="p-4 rounded-md bg-input border border-border">
            <p className="font-semibold text-foreground">{role.name}</p>
            {/* Display the role's level */}
            <p className="text-xs text-muted-foreground">ID: {role.roleId} | Level: {role.level}</p>
          </div>
        ))}

        {/** Adding role show form */}
        {isAdding && (
          <div className="p-4 rounded-md bg-input border-2 border-primary space-y-4">
            <h4 className="font-semibold text-foreground">Create New Role</h4>
            <input type="text" placeholder="Role Name (e.g., Supervisor)" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
            <input type="text" placeholder="Role ID (e.g., supervisor)" value={newRoleId} onChange={e => setNewRoleId(e.target.value)} className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
            {/* Input for the role level */}
            <input type="number" placeholder="Role Level (e.g., 20)" value={newRoleLevel} onChange={e => setNewRoleLevel(e.target.value)} className="block w-full rounded-md border-border bg-background shadow-sm p-2" />
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Permissions</p>
              {ORGANIZATION_RESOURCES.map(resource => (
                <div key={resource} className="flex items-center justify-between p-2 rounded bg-background">
                  <span className="capitalize text-muted-foreground">{resource}</span>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={newPermissions[resource]?.read} onChange={e => handlePermissionChange(resource, 'read', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                      <span>Read</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={newPermissions[resource]?.write} onChange={e => handlePermissionChange(resource, 'write', e.target.checked)} className="rounded text-primary focus:ring-primary" />
                      <span>Write</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end space-x-2">
              <button onClick={handleCancel} disabled={isLoading} className="rounded-md px-3 py-1 text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => { void handleSaveRole(); }} disabled={isLoading} className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                {isLoading ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </div>
        )}

        {/** Not adding show create role button */}
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Create New Role
          </button>
        )}
      </div>
    </div>
  );
}