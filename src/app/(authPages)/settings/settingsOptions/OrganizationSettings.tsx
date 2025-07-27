'use client';

import React, { useState } from 'react';
import { DocumentData } from 'firebase/firestore';

// Placeholder for a service that would handle API calls
// import { organizationService } from '@/api/organizationService';

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const organizationsCreateEndpoint = `${NEXT_PUBLIC_BASE_URL}/api/organizations`;



function CreateOrganizationForm() {
    const [orgName, setOrgName] = useState('');
    const [orgEmail, setOrgEmail] = useState('');
    const [orgNumber, setOrgNumber] = useState('');
    
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            console.log('Creating organization with:', { orgName, orgEmail, orgNumber });

            // 3. Send the token to the API route to create a session cookie
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

function OrganizationSettingsComponent({ data }: { data: DocumentData | null }) {

    console.log("Organization form settings", data);

    // If data has DocumentData then user is part of an organization.
    // Then render Organzation Settings page
    if (data) {
        return (
            <div className="p-6 rounded-lg border bg-card text-card-foreground">
                <h2 className="text-xl font-semibold mb-4">Your Organization</h2>
                <OrganizationSettingsUser 
                    name={data.name || 'N/A'} 
                    organizationId={data.organizationId || 'N/A'}
                    // This assumes the user's employeeId will be fetched and passed separately
                    // or added to the organization data. For now, we'll placeholder it.
                    employeeId={data.userEmployeeId || 'N/A'} 
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