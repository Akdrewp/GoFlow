'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentData } from 'firebase/firestore';

// Used for reloading after creating an organization
import { useRouter } from 'next/navigation';

import { ORGANIZATION_RESOURCES, Role } from '@/api/database/database';

// Placeholder for a service that would handle API calls
// import { organizationService } from '@/api/organizationService';

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const organizationsCreateEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/organizations`;

const rolesApiEndpoint = (orgId: string) => `/api/organizations/${orgId}/roles`;

function RolesManager({ organizationId, initialRoles }: { organizationId: string, initialRoles: Role[] | null }) {
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

function CreateOrganizationForm() {
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('Creating organization with:', { orgName, orgEmail, orgNumber });

      // Send the token to the API route to create a session cookie
      const sessionResponse = await fetch(organizationsCreateEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: orgName,
          email: orgEmail,
          organizationId: orgNumber
        }),
      });

      const showMessage = (msg: string) => {
        const messageBox = document.createElement('div');
        messageBox.className = "fixed inset-0 flex items-center justify-center z-50 p-4";
        messageBox.innerHTML = `
        <div class="bg-card text-foreground p-6 rounded-lg shadow-xl max-w-sm text-center">
          <p class="text-lg font-semibold mb-4">${msg}</p>
          <button class="bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-2 px-4 rounded-md" onclick="this.parentNode.parentNode.remove()">
          OK
          </button>
        </div>
        `;
        document.body.appendChild(messageBox);
      };

      const parsedSessionResponse = await sessionResponse.json();

      console.log("SESSION response: ", parsedSessionResponse);

      showMessage('Organization successfully created (Check console for data)');

      router.refresh();

    } catch (e) {
      console.error("Create organization error:", e);
      setError((e as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold leading-6 text-foreground">Create a New Organization</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an organization to manage employees, trucks, and calibration records.
        </p>
      </div>
      <form onSubmit={
            (e) => {
            void (async () => {
              await handleSubmit(e);
            })();
            }
          } className="space-y-6">
        <div>
          <label htmlFor="orgName" className="block text-sm font-medium text-foreground">
            Organization Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="orgName"
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              className="block w-full rounded-md border-border bg-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-3"
              placeholder="Your Company, Inc."
            />
          </div>
        </div>

        <div>
          <label htmlFor="orgEmail" className="block text-sm font-medium text-foreground">
            Contact Email
          </label>
          <div className="mt-1">
            <input
              type="email"
              name="orgEmail"
              id="orgEmail"
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              required
              className="block w-full rounded-md border-border bg-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-3"
              placeholder="contact@yourcompany.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="orgNumber" className="block text-sm font-medium text-foreground">
            Organization Number
          </label>
          <p className="text-xs text-muted-foreground mt-1">A unique identifier for your organization.</p>
          <div className="mt-1">
            <input
              type="text"
              name="orgNumber"
              id="orgNumber"
              value={orgNumber}
              onChange={(e) => setOrgNumber(e.target.value)}
              required
              className="block w-full rounded-md border-border bg-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-3"
              placeholder="e.g., ACME-2024"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Organization'}
          </button>
        </div>
      </form>
    </div>
  );
}

//Function OrgnaizationSettingsUser = { just display name, organizationId, and employeeId for now}

/**
 * A simple component to display the user's organization details.
 * @param name - The name of the organization.
 * @param organizationId - The organization's unique ID.
 * @param employeeId - The user's employee ID within the organization.
 */
function OrganizationSettingsUser({ name, organizationId, employeeId }: { name: string, organizationId: string, employeeId: string }) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-foreground">Organization Name</h3>
        <p className="text-sm text-muted-foreground">{name}</p>
      </div>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-foreground">Organization ID</h3>
        <p className="text-sm text-muted-foreground">{organizationId}</p>
      </div>
      <div>
        <h3 className="text-lg font-medium text-foreground">Your Employee ID</h3>
        <p className="text-sm text-muted-foreground">{employeeId}</p>
      </div>
    </div>
  );
}

// The parent component that decides what to show.
// It will be passed the organization, roles, and user's employeeId from the server.
export interface OrgSettingsData {
  organization: DocumentData;
  roles: Role[];
  userEmployeeId: string;
}

function OrganizationSettingsComponent({ data }: { data: OrgSettingsData | null }) {

  console.log("Organization form settings", data);

  // If data has DocumentData then user is part of an organization.
  // Then render Organzation Settings page
  if (data) {
    return (
      <div className="p-6 rounded-lg border bg-card text-card-foreground">
        <h2 className="text-xl font-semibold mb-4">Your Organization</h2>
        <OrganizationSettingsUser 
          name={data.organization.name || 'N/A'} 
          organizationId={data.organization.organizationId || 'N/A'}
          // This assumes the user's employeeId will be fetched and passed separately
          // or added to the organization data. For now, we'll placeholder it.
          employeeId={data.userEmployeeId || 'N/A'} 
        />

        {/* Render the new Roles Manager */}
        <RolesManager 
          organizationId={data.organization.organizationId} 
          initialRoles={data.roles} 
        />
      </div>
    );
  } else {
    // User is not part of an organization just render create orgnaization form
    return (
      <div className="p-6 rounded-lg border bg-card text-card-foreground">
        <CreateOrganizationForm />
      </div>
    );
  }
}

export const OrganizationSettings = {
  name: 'Organization',
  component: OrganizationSettingsComponent
};