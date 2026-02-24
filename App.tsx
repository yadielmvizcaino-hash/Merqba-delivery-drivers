import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { OrderCard } from './components/OrderCard';
import { MOCK_DRIVER, MOCK_ORDERS, MOCK_TRANSACTIONS } from './services/mockData';
import { DriverProfile, Order, OrderStatus, Transaction } from './types';
import { Filter, RefreshCw, Star, LogOut, ChevronRight, Settings, Trash2, Map, DollarSign, ArrowUpRight, TrendingUp, TrendingDown, Wallet, Clock, Box, Package, X, Search, Menu } from 'lucide-react';
import { getUnifiedRouteUrl } from './utils/maps';

// --- State Management Simulation (Hook) ---
// In a real app, this would be Zustand or Redux
const useAppStore = () => {
  const [driver, setDriver] = useState<DriverProfile>(MOCK_DRIVER);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [loading, setLoading] = useState(false);

  // Derive active orders
  const activeOrders = orders.filter(o => 
    [OrderStatus.ACCEPTED, OrderStatus.IN_TRANSIT].includes(o.status)
  );

  const availableOrders = orders.filter(o => o.status === OrderStatus.PENDING);
  const historyOrders = orders.filter(o => [OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(o.status));

  const refreshOrders = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800); // Simulate network delay
  };

  const acceptOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: OrderStatus.ACCEPTED } : o
    ));
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => {
      const updated = prev.map(o => {
        if (o.id === orderId) {
          // If moving to COMPLETED, add to transactions and balance
          if (newStatus === OrderStatus.COMPLETED && o.status !== OrderStatus.COMPLETED) {
             const newTx: Transaction = {
               id: `t-${Date.now()}`,
               type: 'earning',
               amount: o.earnings,
               status: 'completed',
               date: new Date().toISOString(),
               orderId: o.orderNumber
             };
             setTransactions(curr => [newTx, ...curr]);
             setDriver(d => ({ 
               ...d, 
               balance: d.balance + o.earnings,
               totalEarned: d.totalEarned + o.earnings
             }));
          }
          return { ...o, status: newStatus };
        }
        return o;
      });
      return updated;
    });
  };
  
  // Withdraw Funds
  const requestWithdrawal = () => {
    if (driver.balance <= 0) return;
    
    const amount = driver.balance;
    const newTx: Transaction = {
      id: `wd-${Date.now()}`,
      type: 'withdrawal',
      amount: amount,
      status: 'pending',
      date: new Date().toISOString()
    };
    
    setTransactions(curr => [newTx, ...curr]);
    setDriver(d => ({ ...d, balance: 0 }));
    alert('Solicitud de retiro enviada correctamente.');
  };

  return {
    driver,
    orders,
    activeOrders,
    availableOrders,
    historyOrders,
    transactions,
    loading,
    refreshOrders,
    acceptOrder,
    updateOrderStatus,
    requestWithdrawal,
    setDriver
  };
};

// --- Pages ---

// 1. Dashboard (Available Orders)
const Dashboard = ({ store }: { store: ReturnType<typeof useAppStore> }) => {
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [minEarnings, setMinEarnings] = useState('');
  const [maxEarnings, setMaxEarnings] = useState('');
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [selectedZones, setSelectedZones] = useState<string[]>([]);

  // Get unique zones from available orders
  const uniqueZones = useMemo(() => {
    const zones = new Set<string>();
    store.availableOrders.forEach(o => {
      if (o.zone) zones.add(o.zone);
    });
    return Array.from(zones).sort();
  }, [store.availableOrders]);

  const toggleZone = (zone: string) => {
    setSelectedZones(prev => 
      prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setMinEarnings('');
    setMaxEarnings('');
    setMinWeight('');
    setMaxWeight('');
    setSelectedZones([]);
  };

  const filteredOrders = useMemo(() => {
    return store.availableOrders.filter(order => {
      // 1. Text Search (Master Search)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesText = 
          order.orderNumber.toLowerCase().includes(q) ||
          order.pickupAddress.toLowerCase().includes(q) ||
          order.deliveryAddress.toLowerCase().includes(q) ||
          order.customer.name.toLowerCase().includes(q) ||
          (order.zone && order.zone.toLowerCase().includes(q));
        
        if (!matchesText) return false;
      }

      // 2. Filter by Zone
      if (selectedZones.length > 0 && (!order.zone || !selectedZones.includes(order.zone))) {
        return false;
      }

      // 3. Filter by Earnings
      if (minEarnings && order.earnings < parseFloat(minEarnings)) return false;
      if (maxEarnings && order.earnings > parseFloat(maxEarnings)) return false;

      // 4. Filter by Weight (Convert order kg to lb for comparison)
      // 1 kg = 2.20462 lbs
      const weightVal = parseFloat(order.weight || '0');
      const weightInLbs = weightVal * 2.20462;
      
      if (minWeight && weightInLbs < parseFloat(minWeight)) return false;
      if (maxWeight && weightInLbs > parseFloat(maxWeight)) return false;

      return true;
    });
  }, [store.availableOrders, searchQuery, selectedZones, minEarnings, maxEarnings, minWeight, maxWeight]);

  const hasActiveFilters = searchQuery || minEarnings || maxEarnings || minWeight || maxWeight || selectedZones.length > 0;

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Merqba Delivery</h1>
          <p className="text-textMuted text-sm">Hola de nuevo, {store.driver.name.split(' ')[0]}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-surfaceHighlight overflow-hidden border border-gray-600 md:hidden">
           <img src={store.driver.avatar} alt="Profile" className="w-full h-full object-cover" />
        </div>
      </header>

      {/* Summary Stats */}
      <div className="bg-primary rounded-xl p-4 md:p-6 mb-6 text-white shadow-lg shadow-orange-900/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
             <div className="flex justify-between items-start mb-2 md:mb-4">
                <div>
                  <p className="text-orange-100 text-xs md:text-sm font-medium">Balance disponible</p>
                  <h2 className="text-3xl md:text-4xl font-bold">${store.driver.balance.toFixed(2)}</h2>
                </div>
                <span className="bg-white/20 px-2 py-1 rounded text-xs backdrop-blur-sm">En línea</span>
             </div>
             <div className="w-full bg-black/20 rounded-full h-1.5 mb-1 max-w-md">
               <div className="bg-white h-1.5 rounded-full" style={{ width: '45%' }}></div>
             </div>
             <div className="flex justify-between text-[10px] md:text-xs text-orange-100 opacity-80 max-w-md">
               <span>Progreso semanal</span>
               <span>Meta: $500</span>
             </div>
          </div>
          <div className="hidden md:block">
             {/* Desktop decoration or additional stats could go here */}
          </div>
        </div>
        {/* Decor */}
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Master Search */}
        <div className="relative flex-1 max-w-lg">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
           <input 
             type="text" 
             placeholder="Buscar por #orden, dirección, cliente..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-surface border border-surfaceHighlight rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors shadow-sm"
           />
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3">
          <span className="text-sm font-medium text-textMuted whitespace-nowrap">
             {filteredOrders.length} disponibles
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl transition-all flex items-center gap-2 ${showFilters || hasActiveFilters ? 'bg-primary text-white shadow-lg shadow-orange-900/20' : 'bg-surface border border-surfaceHighlight text-textMuted hover:text-white hover:border-gray-600'}`}
            >
              <Filter size={18} />
              <span className="hidden md:inline text-sm font-medium">Filtros</span>
            </button>
            <button 
              onClick={store.refreshOrders} 
              className={`p-3 bg-surface border border-surfaceHighlight rounded-xl text-textMuted hover:text-white hover:border-gray-600 transition-colors ${store.loading ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-6 bg-surface border border-surfaceHighlight rounded-xl p-4 animate-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-white flex items-center gap-2"><Filter size={16} /> Filtros Avanzados</h3>
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">Limpiar todo</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Earnings */}
            <div>
              <label className="text-xs text-textMuted mb-2 block font-medium">Rango de Ganancia (USD)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-xs">$</span>
                   <input 
                     type="number" 
                     placeholder="Min"
                     value={minEarnings}
                     onChange={e => setMinEarnings(e.target.value)}
                     className="w-full bg-surfaceHighlight border border-gray-700 rounded-lg py-2 pl-6 pr-2 text-sm text-white focus:border-primary focus:outline-none"
                   />
                </div>
                <span className="text-textMuted">-</span>
                <div className="relative flex-1">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-xs">$</span>
                   <input 
                     type="number" 
                     placeholder="Max"
                     value={maxEarnings}
                     onChange={e => setMaxEarnings(e.target.value)}
                     className="w-full bg-surfaceHighlight border border-gray-700 rounded-lg py-2 pl-6 pr-2 text-sm text-white focus:border-primary focus:outline-none"
                   />
                </div>
              </div>
            </div>

            {/* Weight */}
            <div>
              <label className="text-xs text-textMuted mb-2 block font-medium">Rango de Peso (Lb)</label>
              <div className="flex items-center gap-2">
                <input 
                   type="number" 
                   placeholder="Min"
                   value={minWeight}
                   onChange={e => setMinWeight(e.target.value)}
                   className="w-full bg-surfaceHighlight border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-primary focus:outline-none"
                 />
                <span className="text-textMuted">-</span>
                <input 
                   type="number" 
                   placeholder="Max"
                   value={maxWeight}
                   onChange={e => setMaxWeight(e.target.value)}
                   className="w-full bg-surfaceHighlight border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-primary focus:outline-none"
                 />
              </div>
            </div>

            {/* Zones */}
            <div>
              <label className="text-xs text-textMuted mb-2 block font-medium">Zonas de Entrega</label>
              <div className="flex flex-wrap gap-2">
                {uniqueZones.map(zone => (
                  <button
                    key={zone}
                    onClick={() => toggleZone(zone)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedZones.includes(zone) 
                        ? 'bg-primary/20 border-primary text-primary' 
                        : 'bg-surfaceHighlight border-transparent text-textMuted hover:border-gray-600'
                    }`}
                  >
                    {zone}
                  </button>
                ))}
                {uniqueZones.length === 0 && <span className="text-xs text-textMuted italic">No hay zonas disponibles</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order List */}
      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full text-center py-20 text-textMuted bg-surface/50 rounded-xl border border-dashed border-surfaceHighlight">
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p className="mb-2">No hay pedidos disponibles.</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-primary text-sm hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          filteredOrders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onAction={() => {
                if(window.confirm(`¿Aceptar pedido ${order.orderNumber}?`)) {
                  store.acceptOrder(order.id);
                }
              }}
              actionLabel="Aceptar pedido"
            />
          ))
        )}
      </div>
    </div>
  );
};

// 2. My Orders (Active)
const MyOrders = ({ store }: { store: ReturnType<typeof useAppStore> }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const handleNextStatus = (order: Order) => {
    let nextStatus: OrderStatus | null = null;
    if (order.status === OrderStatus.ACCEPTED) nextStatus = OrderStatus.IN_TRANSIT;
    else if (order.status === OrderStatus.IN_TRANSIT) nextStatus = OrderStatus.DELIVERED;
    
    if (nextStatus) {
      store.updateOrderStatus(order.id, nextStatus);
    }
  };

  const simulateAdminCompletion = (orderId: string) => {
    if(window.confirm("Simulación: ¿Confirmar que la administración ha verificado esta orden? (Esto liberará el pago)")) {
      store.updateOrderStatus(orderId, OrderStatus.COMPLETED);
    }
  };

  const getButtonLabel = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.ACCEPTED: return "Comenzar ruta";
      case OrderStatus.IN_TRANSIT: return "Confirmar entrega";
      case OrderStatus.DELIVERED: return "Esperando validación...";
      default: return "";
    }
  };

  const handleUnifyRoute = () => {
    const launchMaps = (origin: { lat: number, lng: number }) => {
      const waypoints = store.activeOrders.flatMap(o => [
        { coords: o.pickupCoords, type: 'pickup' as const },
        { coords: o.deliveryCoords, type: 'delivery' as const }
      ]);
      const url = getUnifiedRouteUrl(origin, waypoints);
      if (url) window.open(url, '_blank');
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
           launchMaps({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
           console.warn("Geolocation failed", error);
           // Fallback to Havana center
           launchMaps({ lat: 23.1136, lng: -82.3666 });
        }
      );
    } else {
      launchMaps({ lat: 23.1136, lng: -82.3666 });
    }
  };

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto">
       <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Mis Entregas</h1>
        <div className="flex bg-surfaceHighlight p-1 rounded-lg w-full md:w-auto md:min-w-[300px]">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'active' ? 'bg-surface shadow text-white' : 'text-textMuted'}`}
          >
            En Curso ({store.activeOrders.length})
          </button>
          <button 
             onClick={() => setActiveTab('history')}
             className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-surface shadow text-white' : 'text-textMuted'}`}
          >
            Historial
          </button>
        </div>
      </header>

      {activeTab === 'active' && (
        <div className="space-y-4">
           {store.activeOrders.length > 0 && (
             <button 
               onClick={handleUnifyRoute}
               className="w-full md:w-auto md:px-8 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 mb-4 font-medium transition-colors ml-auto shadow-lg shadow-blue-900/20"
             >
               <Map size={18} />
               Ver ruta unificada optimizada
             </button>
           )}

           {store.activeOrders.length === 0 ? (
             <div className="text-center py-20 text-textMuted bg-surface/50 rounded-xl border border-dashed border-surfaceHighlight">
               <Map size={48} className="mx-auto mb-4 opacity-50" />
               No tienes entregas activas.
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {store.activeOrders.map(order => (
                  <div key={order.id} className="relative h-full">
                    <OrderCard 
                      order={order} 
                      onAction={() => handleNextStatus(order)}
                      actionLabel={getButtonLabel(order.status)}
                    />
                    {order.status === OrderStatus.DELIVERED && (
                       <div className="text-center mt-2">
                          <button onClick={() => simulateAdminCompletion(order.id)} className="text-xs text-primary underline">
                            Simular validación admin (Demo)
                          </button>
                       </div>
                    )}
                  </div>
               ))}
             </div>
           )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {store.historyOrders.map(order => (
             <OrderCard key={order.id} order={order} onAction={() => {}} variant="compact" />
          ))}
        </div>
      )}
    </div>
  );
};

// 3. Earnings (Wallet)
const Earnings = ({ store }: { store: ReturnType<typeof useAppStore> }) => {
  const pending = store.transactions.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
  const withdrawn = store.transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Pagos y ganancias</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Main Balance Card */}
        <div className="bg-success rounded-xl p-6 text-white shadow-lg relative overflow-hidden h-full flex flex-col justify-between">
           <div className="relative z-10">
              <div className="flex justify-between items-start">
                 <div>
                   <p className="text-green-100 font-medium mb-1">Balance disponible</p>
                   <h2 className="text-4xl font-bold mb-1">${store.driver.balance.toFixed(2)}</h2>
                   <span className="text-green-100 text-sm">USD</span>
                 </div>
                 <div className="p-3 bg-white/20 rounded-xl">
                   <Wallet size={24} />
                 </div>
              </div>
              
              <div className="mt-8">
                 <button 
                   onClick={store.requestWithdrawal}
                   disabled={store.driver.balance < 10}
                   className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {store.driver.balance < 10 ? 'Mínimo $10.00' : 'Solicitar retiro'}
                   <ArrowUpRight size={18} />
                 </button>
              </div>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-surface p-6 rounded-xl border border-surfaceHighlight text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3 text-green-500"><TrendingUp size={20} /></div>
              <p className="text-textMuted text-xs mb-1">Ganado Total</p>
              <p className="text-xl font-bold text-white">${store.driver.totalEarned.toFixed(0)}</p>
           </div>
           <div className="bg-surface p-6 rounded-xl border border-surfaceHighlight text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-3 text-orange-500"><TrendingDown size={20} /></div>
              <p className="text-textMuted text-xs mb-1">Retirado</p>
              <p className="text-xl font-bold text-white">${withdrawn.toFixed(0)}</p>
           </div>
           <div className="col-span-2 bg-surface p-6 rounded-xl border border-surfaceHighlight flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500"><Clock size={20} /></div>
                 <div>
                    <p className="text-textMuted text-xs">Pendiente de pago</p>
                    <p className="text-xl font-bold text-white">${pending.toFixed(0)}</p>
                 </div>
              </div>
              <ChevronRight className="text-textMuted" size={16} />
           </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-surface rounded-xl border border-surfaceHighlight overflow-hidden">
        <div className="p-4 border-b border-surfaceHighlight flex justify-between items-center">
          <h3 className="font-semibold">Historial de movimientos</h3>
          <span className="text-xs text-textMuted">Todo</span>
        </div>
        <div className="divide-y divide-surfaceHighlight">
           {store.transactions.length === 0 ? (
             <div className="p-8 text-center text-textMuted text-sm">Sin movimientos recientes</div>
           ) : (
             store.transactions.map(tx => (
               <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-surfaceHighlight/20 transition-colors">
                  <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'earning' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {tx.type === 'earning' ? <DollarSign size={18} /> : <ArrowUpRight size={18} />}
                     </div>
                     <div>
                       <p className="text-sm font-medium text-white">{tx.type === 'earning' ? 'Entrega completada' : 'Retiro de fondos'}</p>
                       <p className="text-xs text-textMuted">{new Date(tx.date).toLocaleDateString()} {tx.orderId ? `• ${tx.orderId}` : ''}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className={`font-semibold ${tx.type === 'earning' ? 'text-green-500' : 'text-white'}`}>
                       {tx.type === 'earning' ? '+' : '-'}${tx.amount.toFixed(2)}
                     </p>
                     <p className="text-[10px] text-textMuted uppercase">{tx.status}</p>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

// 4. Profile
const Profile = ({ store }: { store: ReturnType<typeof useAppStore> }) => {
  const [editing, setEditing] = useState(false);
  const [tempCard, setTempCard] = useState(store.driver.cardNumber || '');

  const saveCard = () => {
    store.setDriver(prev => ({ ...prev, cardNumber: tempCard }));
    setEditing(false);
  };

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-primary rounded-xl p-6 text-center text-white relative h-full">
             <div className="absolute top-4 right-4">
                <button className="p-2 bg-white/20 rounded-full hover:bg-white/30">
                   <Settings size={18} />
                </button>
             </div>
             <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-surface mx-auto mb-4 overflow-hidden relative shadow-xl">
                <img src={store.driver.avatar} alt="Profile" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 w-full bg-green-500 text-[10px] font-bold py-0.5">ACTIVO</div>
             </div>
             <h2 className="text-2xl font-bold">{store.driver.name}</h2>
             <div className="flex items-center justify-center gap-1 mt-1 text-sm opacity-90 mb-6">
                <div className="flex text-yellow-300">
                   {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="currentColor" />)}
                </div>
                <span>{store.driver.rating.toFixed(1)} ({store.driver.totalRatings})</span>
             </div>
             
             {!editing ? (
               <button onClick={() => setEditing(true)} className="w-full mt-auto px-4 py-3 bg-surface text-white text-sm font-medium rounded-lg border border-surfaceHighlight/50 hover:bg-surfaceHighlight transition-colors">
                 Editar datos bancarios
               </button>
             ) : (
               <div className="mt-4 bg-surface p-4 rounded-lg text-left">
                  <label className="text-xs text-textMuted mb-1 block">Tarjeta USD</label>
                  <input 
                    value={tempCard}
                    onChange={(e) => setTempCard(e.target.value)}
                    className="w-full bg-surfaceHighlight border border-gray-600 rounded p-2 text-sm text-white mb-3 focus:outline-none focus:border-white/50"
                  />
                  <div className="flex gap-2">
                     <button onClick={saveCard} className="flex-1 bg-white text-primary py-1.5 rounded text-sm font-medium">Guardar</button>
                     <button onClick={() => setEditing(false)} className="flex-1 bg-transparent border border-gray-500 py-1.5 rounded text-sm font-medium">Cancelar</button>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="md:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight hover:bg-surfaceHighlight/30 transition-colors">
               <p className="text-textMuted text-xs flex items-center gap-2 mb-1"><Box size={14}/> Entregas</p>
               <p className="text-2xl font-bold text-white">{store.driver.totalDeliveries}</p>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight hover:bg-surfaceHighlight/30 transition-colors">
               <p className="text-textMuted text-xs flex items-center gap-2 mb-1"><TrendingUp size={14}/> Tasa éxito</p>
               <p className="text-2xl font-bold text-green-500">{store.driver.successRate}%</p>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight hover:bg-surfaceHighlight/30 transition-colors">
               <p className="text-textMuted text-xs flex items-center gap-2 mb-1"><Clock size={14}/> Tiempo</p>
               <p className="text-2xl font-bold text-white">{store.driver.averageTime}</p>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-surfaceHighlight hover:bg-surfaceHighlight/30 transition-colors">
               <p className="text-textMuted text-xs flex items-center gap-2 mb-1"><DollarSign size={14}/> Total</p>
               <p className="text-2xl font-bold text-primary">${store.driver.totalEarned}</p>
            </div>
          </div>

          {/* Account Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg mb-2">Acciones de cuenta</h3>
            
            <button className="w-full bg-surfaceHighlight hover:bg-surface p-4 rounded-xl flex items-center justify-between group transition-colors border border-transparent hover:border-surfaceHighlight">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                     <LogOut size={20} className="text-gray-300" />
                  </div>
                  <div className="text-left">
                     <p className="font-medium text-white group-hover:text-primary transition-colors">Cerrar sesión</p>
                     <p className="text-xs text-textMuted">Salir de tu cuenta</p>
                  </div>
               </div>
               <ChevronRight size={20} className="text-textMuted" />
            </button>

            <button className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 p-4 rounded-xl flex items-center justify-between group transition-colors">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-900/40 flex items-center justify-center">
                     <Trash2 size={20} className="text-red-500" />
                  </div>
                  <div className="text-left">
                     <p className="font-medium text-red-500">Eliminar cuenta</p>
                     <p className="text-xs text-red-400/70">Borrar datos permanentemente</p>
                  </div>
               </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. Login Layout
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = window.location.hash.includes('#') ? () => {} : null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.hash = '#/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
       {/* Background accent */}
       <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none"></div>

       <div className="w-full max-w-sm z-10 bg-surface/50 p-8 rounded-2xl border border-surfaceHighlight backdrop-blur-sm shadow-2xl">
          <div className="text-center mb-10">
             <div className="w-20 h-20 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-orange-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
               <Map size={40} className="text-white" />
             </div>
             <h1 className="text-3xl font-bold text-white mb-2">Merqba Delivery</h1>
             <p className="text-textMuted">Gestión de entregas para conductores</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
             <div className="space-y-2">
                <label className="text-sm font-medium text-textMuted ml-1">Correo electrónico</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface border border-surfaceHighlight rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="nombre@merqba.com"
                />
             </div>
             <div className="space-y-2">
                <label className="text-sm font-medium text-textMuted ml-1">Contraseña</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface border border-surfaceHighlight rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="••••••••"
                />
             </div>

             <div className="flex justify-end pt-1">
                <a href="#" className="text-sm text-primary hover:underline">¿Olvidaste tu contraseña?</a>
             </div>

             <button type="submit" className="w-full bg-primary hover:bg-primaryHover text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-900/50 transition-all active:scale-[0.98]">
               Iniciar Sesión
             </button>
          </form>

          <p className="mt-8 text-center text-textMuted text-sm">
            ¿No tienes cuenta? <a href="#" className="text-white font-medium hover:underline">Regístrate aquí</a>
          </p>
       </div>
    </div>
  );
};


const Layout = ({ children, store }: { children?: React.ReactNode, store: ReturnType<typeof useAppStore> }) => {
  const location = useLocation();
  const currentPath = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNav = (tab: string) => {
    window.location.hash = `#/${tab === 'dashboard' ? '' : tab}`;
    setSidebarOpen(false); // Close drawer on nav
  };

  return (
    <div className="flex h-screen bg-background text-textMain overflow-hidden font-sans">
      {/* Desktop Sidebar (lg+) */}
      <Sidebar 
        currentTab={currentPath} 
        onTabChange={handleNav} 
        pendingCount={store.activeOrders.length}
        className="hidden lg:flex shrink-0 w-72" 
      />

      {/* Tablet/Mobile Drawer Sidebar */}
      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          currentTab={currentPath} 
          onTabChange={handleNav} 
          pendingCount={store.activeOrders.length}
          className="flex h-full shadow-2xl" 
        />
        <button 
           onClick={() => setSidebarOpen(false)}
           className="absolute top-4 right-4 text-white/50 hover:text-white"
        >
          <X size={24} />
        </button>
      </div>

      <main className="flex-1 relative h-full overflow-y-auto bg-background scroll-smooth">
         {/* Header for Tablet (md to lg) to show Hamburger */}
         {/* Only visible on md to lg. Hidden on lg (desktop has sidebar) and hidden on sm (mobile has bottom nav) */}
         {/* Actually, user might want this on mobile too, but mobile uses bottom nav. Let's keep it consistent: show on tablet only. */}
         <div className="hidden md:flex lg:hidden items-center justify-between p-4 bg-surface/80 backdrop-blur-md border-b border-surfaceHighlight sticky top-0 z-30">
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setSidebarOpen(true)}
                 className="p-2 hover:bg-surfaceHighlight rounded-lg text-white transition-colors"
               >
                 <Menu size={24} />
               </button>
               <span className="font-bold text-lg text-white">Merqba</span>
            </div>
            {/* Optional: Add profile or something here */}
         </div>

         {/* Main Content Area */}
        <div className="min-h-full w-full">
          {children}
        </div>
        
        {/* Mobile Bottom Nav (< md) */}
        <div className="md:hidden">
          <BottomNav 
            currentTab={currentPath} 
            onTabChange={handleNav} 
            pendingCount={store.activeOrders.length}
          />
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const store = useAppStore();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout store={store}><Dashboard store={store} /></Layout>} />
        <Route path="/my-orders" element={<Layout store={store}><MyOrders store={store} /></Layout>} />
        <Route path="/history" element={<Layout store={store}><MyOrders store={store} /></Layout>} />
        <Route path="/earnings" element={<Layout store={store}><Earnings store={store} /></Layout>} />
        <Route path="/profile" element={<Layout store={store}><Profile store={store} /></Layout>} />
      </Routes>
    </Router>
  );
}