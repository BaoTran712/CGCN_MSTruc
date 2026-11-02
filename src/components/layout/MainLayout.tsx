import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { ActiveNavTab, User } from '../../types';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: ActiveNavTab;
  onNavigate: (tab: ActiveNavTab) => void;
  currentUser: User;
  pendingCount: number;
  myDossierCount: number;
  onSignOut: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab,
  onNavigate,
  currentUser,
  pendingCount,
  myDossierCount,
  onSignOut,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      <div className="flex-1 flex">
        {/* Responsive Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onNavigate={(tab) => {
            onNavigate(tab);
            setMobileMenuOpen(false);
          }}
          currentUser={currentUser}
          pendingCount={pendingCount}
          myDossierCount={myDossierCount}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onSignOut={onSignOut}
        />

        {/* Main Content Area */}
        <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
          {/* Top Header */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-3 text-slate-600 hover:text-slate-900 lg:hidden cursor-pointer"
              title="Mở thanh điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <Header
                currentUser={currentUser}
                onNavigate={onNavigate}
                activeTab={activeTab}
                pendingCount={pendingCount}
                onSignOut={onSignOut}
              />
            </div>
          </div>

          {/* Viewport Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
