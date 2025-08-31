'use client'; // This page now contains interactive client components

import { useState } from 'react';
import { Organization as OrganizationType, Employee } from "@/api/database/database";
import { Plus } from 'lucide-react';

// organizationInfo global variable to allow apiRoute to use organizationId
// Will be set in OrganizationDisplay
let organizationInfo: OrganizationType;

// --- Component for Displaying and Managing the Employee List ---
function EmployeeList({ employees: initialEmployees }: { employees: Employee[] | null }) {
    const [employees, setEmployees] = useState(initialEmployees);
    const [isAdding, setIsAdding] = useState(false);
    
    // State for the new employee form
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('');
    const [newEmployeeId, setNewEmployeeId] = useState('');

    const handleAddNew = () => {
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        // Clear input fields
        setNewName('');
        setNewRole('');
        setNewEmployeeId('');
    };

    const handleSave = async () => {
        // Store the data and set status as "invited"
        // default since employee hasn't signed up yet
        const newEmployeeData = { 
            name: newName, 
            roleId: newRole, 
            employeeId: newEmployeeId,
            status: "invited"
        };

        try {
            // Construct the API endpoint with the dynamic organizationId
            const apiRoute = `/api/organizations/${organizationInfo.organizationId}/employees`;

            const response = await fetch(apiRoute, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newEmployeeData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add employee.');
            }

            const result = await response.json();
            console.log('API Response:', result); 

            // Optimistically update the UI with the new employee data
            const newEmployee: Employee = {
                ...newEmployeeData,
                status: 'invited',
            };
            setEmployees([...(employees || []), newEmployee]);

            handleCancel(); // Clear form on success
            
        } catch (e) {
            console.error("Error saving employee:", e);
        }
    };


    //If the organization has no employees show no employees message
    if (!employees || employees.length === 0 && !isAdding) {
        return (
            <div className="text-center mt-8">
                <p className="text-muted-foreground mb-4">No employees found.</p>
                <button onClick={handleAddNew} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Add Employee
                </button>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Employees</h2>
            <div className="rounded-lg border bg-card text-card-foreground">
                <div className="divide-y divide-border">
                    {/* Table Header */}
                    <div className="grid grid-cols-5 gap-4 px-4 py-3 font-semibold">
                        <div className="col-span-2">Name</div>
                        <div>Role</div>
                        <div>Status</div>
                        <div>Employee ID</div>
                    </div>
                    {/* Table Body */}
                    {employees.map((employee, index) => (
                        <div key={index} className="grid grid-cols-5 gap-4 px-4 py-3 text-muted-foreground items-center">
                            <div className="col-span-2">{employee.name}</div>
                            <div>{employee.roleId}</div>
                            <div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    employee.status === 'active' 
                                    ? 'bg-success/20 text-success' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                    {employee.status}
                                </span>
                            </div>
                            <div>{employee.employeeId}</div>
                        </div>
                    ))}
                    {/* Inline Form for Adding New Employee */}
                    {isAdding && (
                        <div className="grid grid-cols-5 gap-4 px-4 py-3 items-center bg-muted/50">
                            <div className="col-span-2">
                                <input type="text" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-input border border-border rounded-md w-full p-2 text-sm" />
                            </div>
                            <div>
                                <input type="text" placeholder="Role (e.g., Driver)" value={newRole} onChange={(e) => setNewRole(e.target.value)} className="bg-input border border-border rounded-md w-full p-2 text-sm" />
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">Invited</div>
                            <div>
                                <input type="text" placeholder="Employee ID" value={newEmployeeId} onChange={(e) => setNewEmployeeId(e.target.value)} className="bg-input border border-border rounded-md w-full p-2 text-sm" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => {
                                    void (async () => {
                                        await handleSave();
                                    })();
                            }} className="bg-primary text-primary-foreground h-8 px-3 rounded-md text-sm">Save</button>
                                <button onClick={ () => {
                                    void (async () => {
                                        await handleCancel();
                                    })();
                                }} className="bg-muted text-muted-foreground h-8 px-3 rounded-md text-sm">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
             {/* "Add Employee" Button */}
            {!isAdding && (
                <div className="mt-4">
                    <button onClick={handleAddNew} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Employee
                    </button>
                </div>
            )}
        </div>
    );
}

// --- Updated Component to Display Organization Info and the Employee List ---
export function OrganizationDisplay({ info, employees }: { info: OrganizationType | null, employees: Employee[] | null }) {
    
    // If there's no organization info, show a message
    if (!info) {
        return (
            <div className="p-6 rounded-lg border bg-card text-card-foreground">
                <h2 className="text-xl font-semibold">No Organization Found</h2>
                <p className="text-muted-foreground mt-2">You are not currently part of an organization.</p>
            </div>
        );
    }

    organizationInfo = info;

    return (
        <div>
            {/* Organization Header */}
            <div>
                <h1 className="text-5xl font-bold text-foreground">
                    {info.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {info.organizationId}
                </p>
            </div>

            {/* Employee List */}
            <EmployeeList employees={employees} />
        </div>
    );
}