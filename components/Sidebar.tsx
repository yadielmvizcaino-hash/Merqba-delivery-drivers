import React from 'react';
import { Home, Package, History, Wallet, User, LogOut, Map } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  pendingCount?: number;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, pendingCount, className }) => {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'my-orders', icon: Package, label: 'Mis Pedidos' },
    { id: 'history', icon: History, label: 'Historial' },
    { id: 'earnings', icon: Wallet, label: 'Pagos' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <div className={`w-64 bg-surface border-r border-surfaceHighlight flex-col h-full ${className}`}>
      <div className="p-6 flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Map size={20} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Merqba</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group ${
                isActive 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-textMuted hover:bg-surfaceHighlight hover:text-textMain'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-primary' : 'group-hover:text-white transition-colors'} />
              <span>{item.label}</span>
              
              {/* Badge for orders */}
              {item.id === 'my-orders' && pendingCount && pendingCount > 0 ? (
                <span className="absolute right-4 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-surfaceHighlight">
         <div className="bg-surfaceHighlight/30 rounded-xl p-4 mb-2">
             <p className="text-xs text-textMuted mb-1">Tu balance</p>
             <p className="text-lg font-bold text-white">$1,195.00</p>
         </div>
         <button className="w-full flex items-center gap-3 px-4 py-3 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
         </button>
      </div>
    </div>
  );
};