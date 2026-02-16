import React from 'react';
import { Home, Package, History, Wallet, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, pendingCount }) => {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'my-orders', icon: Package, label: 'Mis Pedidos' },
    { id: 'history', icon: History, label: 'Historial' },
    { id: 'earnings', icon: Wallet, label: 'Pagos' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-surfaceHighlight z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative ${
                isActive ? 'text-primary' : 'text-textMuted hover:text-textMain'
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
              
              {/* Badge for orders */}
              {item.id === 'my-orders' && pendingCount && pendingCount > 0 ? (
                <span className="absolute top-2 right-4 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};