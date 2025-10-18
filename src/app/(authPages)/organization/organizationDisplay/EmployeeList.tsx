import { Employee, Role } from "@/api/database/database";
import { Edit, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

const employeesApiEndpoint = (orgId: string, empId?: string) => empId ? `/api/organizations/${orgId}/employees/${empId}` : `/api/organizations/${orgId}/employees`;


// Component for Displaying and Managing the Employee List 
export function EmployeeList({ 
  employees: initialEmployees, 
  roles, 
  organizationId 
}: { 
  employees: Employee[] | null, 
  roles: Role[] | null, 
  organizationId: string 
}) {
  const [employees, setEmployees] = useState(initialEmployees || []);
  const [isAdding, setIsAdding] = useState(false);
  
  // State for the "Add New" form
  const [newName, setNewName] = useState('');
  const [newRoleId, setNewRoleId] = useState(roles?.[0]?.roleId || '');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  
  // State for the "Edit" form
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editingEmployeeData, setEditingEmployeeData] = useState<Partial<Employee>>({});
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingEmployeeId(null);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewName('');
    setNewRoleId(roles?.[0]?.roleId || '');
    setNewEmployeeId('');
    setError('');
  };

  const handleSaveNew = async () => {
    setIsLoading(true);
    setError('');
    try {
      const newEmployeeData = { name: newName, roleId: newRoleId, employeeId: newEmployeeId };
      const response = await fetch(employeesApiEndpoint(organizationId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployeeData),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to add employee.');
      
      const savedEmployee = (await response.json()).data;
      setEmployees(prev => [...prev, { ...savedEmployee, status: 'invited' }]);
      handleCancelAdd();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployeeId(employee.employeeId);
    setEditingEmployeeData(employee);
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingEmployeeId(null);
    setEditingEmployeeData({});
  };
  
  const handleUpdate = async () => {
    if (!editingEmployeeId) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(employeesApiEndpoint(organizationId, editingEmployeeId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEmployeeData),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to update employee.');
      
      const updatedEmployee = (await response.json()).data;
      setEmployees(prev => prev.map(e => e.employeeId === editingEmployeeId ? { ...e, ...updatedEmployee } : e));
      handleCancelEdit();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!window.confirm(`Are you sure you want to delete employee ${employeeId}?`)) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(employeesApiEndpoint(organizationId, employeeId), { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete employee.');
      
      setEmployees(prev => prev.filter(e => e.employeeId !== employeeId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!employees || employees.length === 0 && !isAdding) {
    return (
      <div className="text-center mt-8">
        <p className="text-muted-foreground mb-4">No employees found.</p>
        <button onClick={handleAddNew} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90">
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
          <div className="grid grid-cols-6 gap-4 px-4 py-3 font-semibold">
            <div className="col-span-2">Name</div>
            <div>Role</div>
            <div>Status</div>
            <div>Employee ID</div>
            <div>Actions</div>
          </div>
          
          {employees?.map((employee) => (
            editingEmployeeId === employee.employeeId ? (
              // --- EDITING ROW ---
              <div key={employee.employeeId} className="grid grid-cols-6 gap-4 px-4 py-3 bg-muted/50 items-center">
                <div className="col-span-2"><input value={editingEmployeeData.name} onChange={e => setEditingEmployeeData({...editingEmployeeData, name: e.target.value})} className="bg-input border border-border rounded-md p-2 text-sm w-full" /></div>
                <div>
                  <select value={editingEmployeeData.roleId} onChange={e => setEditingEmployeeData({...editingEmployeeData, roleId: e.target.value})} className="bg-input border border-border rounded-md p-2 text-sm w-full">
                    {roles?.map(role => <option key={role.roleId} value={role.roleId}>{role.name}</option>)}
                  </select>
                </div>
                <div className="capitalize text-xs">{employee.status}</div>
                <div>{employee.employeeId}</div>
                <div className="flex justify-end space-x-2">
                  <button onClick={() => { void handleUpdate(); }} disabled={isLoading} className="p-2 text-green-500 hover:text-green-400"><Save className="h-5 w-5"/></button>
                  <button onClick={handleCancelEdit} disabled={isLoading} className="p-2 text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
                </div>
              </div>
            ) : (
              // --- DISPLAY ROW ---
              <div key={employee.employeeId} className="grid grid-cols-6 gap-4 px-4 py-3 text-muted-foreground items-center group">
                <div className="col-span-2 font-medium text-foreground">{employee.name}</div>
                <div className="capitalize">{employee.roleId}</div>
                <div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${employee.status === 'active' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>{employee.status}</span>
                </div>
                <div>{employee.employeeId}</div>
                <div className="space-x-2">
                  <button onClick={() => handleEdit(employee)} className="p-2 hover:text-foreground"><Edit className="h-4 w-4"/></button>
                  <button onClick={() => { void handleDelete(employee.employeeId); }} className="p-2 text-red-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
                </div>
              </div>
            )
          ))}

          {/* --- ADDING ROW --- */}
          {isAdding && (
            <div className="grid grid-cols-6 gap-4 px-4 py-3 items-center bg-muted/50">
              <div className="col-span-2"><input type="text" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} required className="bg-input border border-border rounded-md w-full p-2 text-sm" /></div>
              <div>
                <select value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} required className="bg-input border border-border rounded-md w-full p-2 text-sm">
                  {roles?.map(role => <option key={role.roleId} value={role.roleId}>{role.name}</option>)}
                </select>
              </div>
              <div className="text-xs font-medium text-muted-foreground">Invited</div>
              <div><input type="text" placeholder="Employee ID" value={newEmployeeId} onChange={(e) => setNewEmployeeId(e.target.value)} required className="bg-input border border-border rounded-md w-full p-2 text-sm" /></div>
              <div className="flex justify-end items-center space-x-2">
                <button onClick={() => { void handleSaveNew(); }} disabled={isLoading} className="p-2 text-green-500 hover:text-green-400"><Save className="h-5 w-5"/></button>
                <button onClick={handleCancelAdd} disabled={isLoading} className="p-2 text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
              </div>
            </div>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
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