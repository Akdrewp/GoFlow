'use client';

import { useState } from 'react';
import { Menu, Package2, Settings, Building2, Truck, Clipboard, ClipboardCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '../lib/contexts/UserContext';

function SidebarNav({ onLinkClick }: { onLinkClick: () => void }) {
  const { user, isManager } = useUser();
  
  const isPartOfOrganization = user?.type === 'organization';

  // This is to close the sidebar only on mobile devices.
  const handleLinkClick = () => {
    // 768px is the default breakpoint for Tailwind's 'md' prefix.
    if (window.innerWidth < 768) {
      onLinkClick();
    }
  };

  return (
    <nav className="flex-1 overflow-auto px-2 text-sm font-medium lg:px-4">
      {isPartOfOrganization && (
        <>
          <Link href="/organization" onClick={handleLinkClick} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <Building2 className="sidebar-icon" />
            <p>Organization</p>
          </Link>
          <Link href="/truck" onClick={handleLinkClick} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <Truck className="sidebar-icon" />
            <p>My Truck</p>
          </Link>
          
          {isManager && (
            <>
              <Link href="/assign" onClick={handleLinkClick} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                <Clipboard className="sidebar-icon" />
                <p>Assign</p>
              </Link>
              <Link href="/reports" onClick={handleLinkClick} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
                <ClipboardCheck className="sidebar-icon" />
                <p>Reports</p>
              </Link>
            </>
          )}
        </>
      )}
      <Link href="/settings" onClick={handleLinkClick} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
        <Settings className="sidebar-icon" />
        <p>Settings</p>
      </Link>
    </nav>
  );
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans">
      <div className="flex min-h-screen w-full flex-col">
        <aside 
          className={`fixed inset-y-0 left-0 z-50 flex-col border-r bg-card transition-transform duration-300 ease-in-out 
            md:translate-x-0 md:w-64 
            ${isSidebarOpen ? 'translate-x-0 w-full' : '-translate-x-full w-full'}`
          }
        >
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <Package2 className="h-6 w-6 text-primary" />
                <span className="text-sidebar-foreground">GOFLOW</span>
              </Link>
              <button 
                onClick={() => setIsSidebarOpen(false)} 
                className="ml-auto md:hidden rounded-full p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-6 w-6 text-destructive" />
                <span className="sr-only">Close sidebar</span>
              </button>
            </div>
            {/* Pass the function to close the sidebar down to the nav component */}
            <SidebarNav onLinkClick={() => setIsSidebarOpen(false)} />
          </div>
        </aside>

        <div className={`flex flex-col transition-all duration-300 ease-in-out md:pl-64`}>
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 lg:h-[60px]">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            >
              {isSidebarOpen ? (
                <X className="h-6 w-6 text-destructive md:hidden" /> // Only show X on mobile
              ) : (
                <Menu className="h-6 w-6" />
              )}
              <span className="sr-only">Toggle sidebar</span>
            </button>
            {/* Other header content */}
          </header>

          <main className='m-4'>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

