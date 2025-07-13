"use client";

import { useState } from 'react';
import { Bell, Menu, Package2, Search, Settings } from 'lucide-react';
import Link from 'next/link';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
    <div className="min-h-screen w-full bg-background text-background font-sans">
        <div className="flex min-h-screen w-full flex-col">
            {/* Sidebar Component */}
            <aside className={`fixed inset-y-0 left-0 z-10 flex-col border-r bg-[var(--card)] transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden md:flex`}>
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <Link href="/" className="flex items-center gap-2 font-semibold">
                        <Package2 className="h-6 w-6 text-primary" />
                        <span className="text-sidebar-foreground">GOFLOW</span>
                        </Link>
                        <button className="ml-auto h-8 w-8 rounded-full opacity-0">
                        <Bell className="h-4 w-4" />
                        </button>
                    </div>
                    <nav className="flex-1 overflow-auto px-2 text-sm font-medium lg:px-4">
                        <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-[var(--primary)]">
                            <Settings className="h-8 w-8" />
                            <p>
                                Settings
                            </p>
                        </Link>
                    </nav>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:pl-64' : 'pl-0'}`}>
                {/* Top Bar Component */}
                <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-[var(--card)] px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 lg:h-[60px]">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="rounded-full p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] md:flex"
                >
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle sidebar</span>
                </button>
                <div className="relative ml-auto flex-1 md:grow-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
                    <input
                    type="search"
                    placeholder="Search..."
                    className="w-full rounded-lg bg-[var(--background)] pl-8 md:w-[200px] lg:w-[320px] h-9 border border-[var(--input)]"
                    />
                </div>
                <button className="ml-4 h-9 w-9 rounded-full border">
                    <img
                        src="https://placehold.co/36x36/E2E8F0/4A5568?text=U"
                        alt="User Avatar"
                        className="rounded-full"
                    />
                    <span className="sr-only">Toggle user menu</span>
                </button>
                </header>

                {/* Page Content */}
                <main className='m-4'>
                    {children}
                </main>
            </div>
        </div>
    </div>
);}