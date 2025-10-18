'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Assignment, Employee, UserProfile } from '@/api/database/database';
import { redirect } from 'next/navigation';

// Define the shape of the data that the context will provide
interface UserContextType {
  user: UserProfile;
  employee: Employee | undefined;
  assignment: Assignment | undefined;
  isManager: boolean; // A convenient flag for role-based UI
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserContextProvider({ children, initialValue }: { children: ReactNode, initialValue: UserContextType | undefined }) {
  return(
    <UserContext.Provider value={initialValue}>
      {children}
    </UserContext.Provider>
  );
}

// --- The Custom Hook ---
// This makes it easy for other components to access the user data.
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    redirect("/login");
  }
  console.log("User Context", context);
  
  return context;
}
