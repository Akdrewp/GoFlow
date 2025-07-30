//Change type to sidestep duplicate organization use
import { Organization as OrganizationType, Employee } from "@/api/database/database";

// --- New Component for Displaying the Employee List ---
function EmployeeList({ employees }: { employees: Employee[] | null }) {
    if (!employees || employees.length === 0) {
        return <p className="text-muted-foreground mt-4">No employees found.</p>;
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Employees</h2>
            <div className="rounded-lg border bg-card text-card-foreground">
                <div className="divide-y divide-border">
                    {/* Table Header */}
                    <div className="grid grid-cols-4 gap-4 px-4 py-3 font-semibold">
                        <div>Name</div>
                        <div>Role</div>
                        <div>Status</div>
                        <div>Employee ID</div>
                    </div>
                    {/* Table Body */}
                    {employees.map((employee, index) => (
                        <div key={index} className="grid grid-cols-4 gap-4 px-4 py-3 text-muted-foreground">
                            <div>{employee.name}</div>
                            <div>{employee.role}</div>
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
                </div>
            </div>
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