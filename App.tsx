import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { OrderCard } from './components/OrderCard';
import { MOCK_DRIVER, MOCK_ORDERS, MOCK_TRANSACTIONS } from './services/mockData';
import { DriverProfile, Order, OrderStatus, Transaction } from './types';
import { Filter, RefreshCw, Star, LogOut, ChevronRight, Settings, Trash2, Map, DollarSign, ArrowUpRight, TrendingUp, TrendingDown, Wallet, Clock, Box, Package, X, Search, Menu, MapPin, Navigation, Eye, EyeOff, Mail, Lock, Smartphone, User, RotateCcw, ArrowLeft, Camera, CheckCircle2, Bike, Car, Truck, Bell, Plus } from 'lucide-react';
import { getUnifiedRouteUrl } from './utils/maps';
import { CUBA_GEOGRAPHY } from './constants/cuba';
import { ActiveOrderCard } from './components/ActiveOrderCard';

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

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => 
      o.id === orderId ? { ...o, status: OrderStatus.PENDING } : o
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
    cancelOrder,
    updateOrderStatus,
    requestWithdrawal,
    setDriver,
    updateDriver: (data: Partial<DriverProfile>) => setDriver(prev => ({ ...prev, ...data }))
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
      // 0. Pre-filter by Driver's Operating Zones (if set)
      if (store.driver.operatingZones) {
        const { pickupMunicipalities, deliveryMunicipalities } = store.driver.operatingZones;
        
        const matchesPickup = pickupMunicipalities.length === 0 || 
          (order.pickupMunicipality && pickupMunicipalities.includes(order.pickupMunicipality));
        
        const matchesDelivery = deliveryMunicipalities.length === 0 || 
          (order.deliveryMunicipality && deliveryMunicipalities.includes(order.deliveryMunicipality));

        if (!matchesPickup || !matchesDelivery) return false;
      }

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
  const handleNextStatus = (order: Order) => {
    let nextStatus: OrderStatus | null = null;
    if (order.status === OrderStatus.ACCEPTED) nextStatus = OrderStatus.IN_TRANSIT;
    else if (order.status === OrderStatus.IN_TRANSIT) nextStatus = OrderStatus.DELIVERED;
    
    if (nextStatus) {
      store.updateOrderStatus(order.id, nextStatus);
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
           launchMaps({ lat: 23.1136, lng: -82.3666 });
        }
      );
    } else {
      launchMaps({ lat: 23.1136, lng: -82.3666 });
    }
  };

  return (
    <div className="p-6 pb-24 max-w-lg mx-auto min-h-screen bg-background">
       <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Mis Entregas Activas</h1>
        <button className="relative p-2 text-white/80 hover:text-white transition-colors">
          <Bell size={24} />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#4ade80] border-2 border-background rounded-full"></span>
        </button>
      </header>

      {store.activeOrders.length > 0 && (
        <button 
          onClick={handleUnifyRoute}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl flex items-center justify-center gap-3 mb-8 font-bold transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98]"
        >
          <Map size={20} />
          Unificar recorrido optimizado
        </button>
      )}

      <div className="space-y-6">
         {store.activeOrders.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-gray-600">
             <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
               <Plus size={32} />
             </div>
             <p className="text-sm font-medium">No tienes más entregas activas</p>
           </div>
         ) : (
           <div className="space-y-4">
             {store.activeOrders.map(order => (
                <ActiveOrderCard 
                  key={order.id}
                  order={order} 
                  onAction={(id, action) => {
                    if (action === 'next_status') handleNextStatus(order);
                    if (action === 'cancel') store.cancelOrder(order.id);
                    if (action === 'map') {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryCoords.lat},${order.deliveryCoords.lng}`, '_blank');
                    }
                  }}
                />
             ))}
           </div>
         )}
      </div>
    </div>
  );
};

// 3. History
const History = ({ store }: { store: ReturnType<typeof useAppStore> }) => {
  return (
    <div className="p-6 pb-24 max-w-lg mx-auto min-h-screen bg-background">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Historial de Entregas</h1>
        <button className="p-2 text-white/80 hover:text-white transition-colors">
          <Bell size={24} />
        </button>
      </header>

      <div className="space-y-4">
        {store.historyOrders.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-sm font-medium">No tienes entregas en el historial</p>
          </div>
        ) : (
          store.historyOrders.map(order => (
             <OrderCard key={order.id} order={order} onAction={() => {}} variant="compact" />
          ))
        )}
      </div>
    </div>
  );
};

// 4. Earnings (Wallet)
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

// --- Sub-components ---

const OperatingZonesModal = ({ 
  isOpen, 
  onClose, 
  currentZones, 
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  currentZones: DriverProfile['operatingZones'], 
  onSave: (newZones: DriverProfile['operatingZones']) => void 
}) => {
  const [pickupZones, setPickupZones] = useState<string[]>(currentZones?.pickupMunicipalities || []);
  const [deliveryZones, setDeliveryZones] = useState<string[]>(currentZones?.deliveryMunicipalities || []);
  const [selectedProvince, setSelectedProvince] = useState<string | 'all'>(CUBA_GEOGRAPHY[0].name);
  const [activeType, setActiveType] = useState<'pickup' | 'delivery'>('pickup');

  const province = selectedProvince === 'all' ? null : CUBA_GEOGRAPHY.find(p => p.name === selectedProvince);

  const toggleZone = (municipality: string) => {
    if (activeType === 'pickup') {
      setPickupZones(prev => 
        prev.includes(municipality) ? prev.filter(m => m !== municipality) : [...prev, municipality]
      );
    } else {
      setDeliveryZones(prev => 
        prev.includes(municipality) ? prev.filter(m => m !== municipality) : [...prev, municipality]
      );
    }
  };

  const selectAllInProvince = () => {
    if (!province) {
      // Select all in country
      const allMuncipalities = CUBA_GEOGRAPHY.flatMap(p => p.municipalities);
      if (activeType === 'pickup') setPickupZones(allMuncipalities);
      else setDeliveryZones(allMuncipalities);
      return;
    }
    
    const municipalities = province.municipalities;
    if (activeType === 'pickup') {
      setPickupZones(prev => Array.from(new Set([...prev, ...municipalities])));
    } else {
      setDeliveryZones(prev => Array.from(new Set([...prev, ...municipalities])));
    }
  };

  const clearAllInProvince = () => {
    if (!province) {
      if (activeType === 'pickup') setPickupZones([]);
      else setDeliveryZones([]);
      return;
    }

    const municipalities = province.municipalities;
    if (activeType === 'pickup') {
      setPickupZones(prev => prev.filter(m => !municipalities.includes(m)));
    } else {
      setDeliveryZones(prev => prev.filter(m => !deliveryZones.includes(m)));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-surfaceHighlight w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-surfaceHighlight flex justify-between items-center bg-surfaceHighlight/30">
          <div>
            <h2 className="text-xl font-bold text-white">Zonas Operativas</h2>
            <p className="text-xs text-textMuted">Configura tus municipios de recogida y entrega</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-textMuted" />
          </button>
        </div>

        <div className="flex border-b border-surfaceHighlight">
          <button 
            onClick={() => setActiveType('pickup')}
            className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2 ${activeType === 'pickup' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-white'}`}
          >
            Puntos de Recogida ({pickupZones.length})
          </button>
          <button 
            onClick={() => setActiveType('delivery')}
            className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2 ${activeType === 'delivery' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textMuted hover:text-white'}`}
          >
            Zonas de Entrega ({deliveryZones.length})
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Province Selector */}
          <div className="w-full md:w-1/3 border-r border-surfaceHighlight overflow-y-auto bg-black/10 p-2 space-y-1">
            <p className="text-[10px] font-bold text-textMuted uppercase px-3 py-2">Provincias</p>
            <button
              onClick={() => setSelectedProvince('all')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all ${selectedProvince === 'all' ? 'bg-primary text-white font-medium shadow-md shadow-orange-900/20' : 'text-textMuted hover:bg-white/5 hover:text-white'}`}
            >
              Todas las provincias
            </button>
            {CUBA_GEOGRAPHY.map(p => (
              <button
                key={p.name}
                onClick={() => setSelectedProvince(p.name)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all ${selectedProvince === p.name ? 'bg-primary text-white font-medium shadow-md shadow-orange-900/20' : 'text-textMuted hover:bg-white/5 hover:text-white'}`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Municipality Selector */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-bold text-textMuted uppercase">
                {selectedProvince === 'all' ? 'Todos los municipios' : `Municipios de ${selectedProvince}`}
              </p>
              <div className="flex gap-2">
                <button onClick={selectAllInProvince} className="text-[10px] text-primary hover:underline font-bold">Seleccionar Todo</button>
                <button onClick={clearAllInProvince} className="text-[10px] text-textMuted hover:underline font-bold">Limpiar</button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedProvince === 'all' ? (
                <div className="col-span-full py-10 text-center">
                  <p className="text-sm text-textMuted italic">Selecciona una provincia para ver municipios específicos o usa "Seleccionar Todo" para marcar todo el país.</p>
                </div>
              ) : (
                province?.municipalities.map(m => {
                  const isSelected = activeType === 'pickup' ? pickupZones.includes(m) : deliveryZones.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleZone(m)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${isSelected ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-surfaceHighlight/30 border-transparent text-textMuted hover:border-gray-600'}`}
                    >
                      <span>{m}</span>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-surfaceHighlight bg-surfaceHighlight/10 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <p className="text-[10px] text-textMuted uppercase font-bold mb-1">Resumen</p>
            <p className="text-xs text-white truncate">
              {activeType === 'pickup' 
                ? `Recogida: ${pickupZones.length > 0 ? pickupZones.join(', ') : 'Ninguno'}`
                : `Entrega: ${deliveryZones.length > 0 ? deliveryZones.join(', ') : 'Ninguno'}`
              }
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setPickupZones([]);
                setDeliveryZones([]);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 transition-colors border border-primary/20"
            >
              Restablecer a Todo el País
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-textMuted hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                onSave({ pickupMunicipalities: pickupZones, deliveryMunicipalities: deliveryZones });
                onClose();
              }}
              className="px-8 py-2.5 bg-primary hover:bg-primaryHover text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-95"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Profile
const Profile = ({ store }: { store: ReturnType<typeof useAppStore> }) => {
  const [editingCard, setEditingCard] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [showZonesModal, setShowZonesModal] = useState(false);
  
  // Form states
  const [tempCard, setTempCard] = useState(store.driver.cardNumber || '');
  const [tempProfile, setTempProfile] = useState({
    name: store.driver.name,
    email: store.driver.email,
    phone: store.driver.phone
  });
  const [tempBusiness, setTempBusiness] = useState({
    businessName: store.driver.businessAffiliation?.businessName || '',
    businessEmail: store.driver.businessAffiliation?.businessEmail || '',
    businessId: store.driver.businessAffiliation?.businessId || ''
  });

  const MOCK_BUSINESSES = [
    'Restaurante El Vedado',
    'Tienda Panamericana',
    'Cafetería 23 y L',
    'Farmacia Central',
    'Supermercado 3ra y 70'
  ];

  const saveCard = () => {
    store.updateDriver({ cardNumber: tempCard });
    setEditingCard(false);
  };

  const saveProfile = () => {
    store.updateDriver(tempProfile);
    setEditingProfile(false);
  };

  const saveBusiness = () => {
    store.updateDriver({
      businessAffiliation: {
        ...tempBusiness,
        status: 'pending'
      }
    });
    setEditingBusiness(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        store.updateDriver({ avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveZones = (newZones: DriverProfile['operatingZones']) => {
    store.setDriver(prev => ({ ...prev, operatingZones: newZones }));
  };

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-primary rounded-xl p-6 text-center text-white relative h-full flex flex-col">
             <div className="absolute top-4 right-4">
                <button className="p-2 bg-white/20 rounded-full hover:bg-white/30">
                   <Settings size={18} />
                </button>
             </div>
             <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-surface mx-auto mb-4 overflow-hidden relative shadow-xl group">
                <img src={store.driver.avatar} alt="Profile" className="w-full h-full object-cover" />
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera size={24} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
                <div className="absolute bottom-0 w-full bg-green-500 text-[10px] font-bold py-0.5">ACTIVO</div>
             </div>
             <h2 className="text-2xl font-bold">{store.driver.name}</h2>
             <div className="flex items-center justify-center gap-1 mt-1 text-sm opacity-90 mb-6">
                <div className="flex text-yellow-300">
                   {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="currentColor" />)}
                </div>
                <span>{store.driver.rating.toFixed(1)} ({store.driver.totalRatings})</span>
             </div>
             
             <div className="space-y-3 mt-auto">
               {!editingCard ? (
                 <button onClick={() => setEditingCard(true)} className="w-full px-4 py-3 bg-surface text-white text-sm font-medium rounded-lg border border-surfaceHighlight/50 hover:bg-surfaceHighlight transition-colors">
                   Editar datos bancarios
                 </button>
               ) : (
                 <div className="bg-surface p-4 rounded-lg text-left">
                    <label className="text-xs text-textMuted mb-1 block">Tarjeta USD</label>
                    <input 
                      value={tempCard}
                      onChange={(e) => setTempCard(e.target.value)}
                      className="w-full bg-surfaceHighlight border border-gray-600 rounded p-2 text-sm text-white mb-3 focus:outline-none focus:border-white/50"
                    />
                    <div className="flex gap-2">
                       <button onClick={saveCard} className="flex-1 bg-white text-primary py-1.5 rounded text-sm font-medium">Guardar</button>
                       <button onClick={() => setEditingCard(false)} className="flex-1 bg-transparent border border-gray-500 py-1.5 rounded text-sm font-medium">Cancelar</button>
                    </div>
                 </div>
               )}

               <button 
                 onClick={() => setShowZonesModal(true)}
                 className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg border border-white/10 transition-colors flex items-center justify-center gap-2"
               >
                 <MapPin size={16} />
                 Zonas operativas
               </button>
             </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Data */}
          <div className="bg-surface border border-surfaceHighlight rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <User size={18} className="text-primary" />
                Datos Personales
              </h3>
              {!editingProfile ? (
                <button onClick={() => setEditingProfile(true)} className="text-xs text-primary hover:underline">Editar</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveProfile} className="text-xs text-green-500 hover:underline">Guardar</button>
                  <button onClick={() => setEditingProfile(false)} className="text-xs text-textMuted hover:underline">Cancelar</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-textMuted uppercase font-bold">Nombre</p>
                {editingProfile ? (
                  <input 
                    value={tempProfile.name}
                    onChange={e => setTempProfile({...tempProfile, name: e.target.value})}
                    className="w-full bg-surfaceHighlight border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                ) : (
                  <p className="text-sm text-white">{store.driver.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-textMuted uppercase font-bold">Email</p>
                {editingProfile ? (
                  <input 
                    value={tempProfile.email}
                    onChange={e => setTempProfile({...tempProfile, email: e.target.value})}
                    className="w-full bg-surfaceHighlight border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                ) : (
                  <p className="text-sm text-white">{store.driver.email}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-textMuted uppercase font-bold">Teléfono</p>
                {editingProfile ? (
                  <input 
                    value={tempProfile.phone}
                    onChange={e => setTempProfile({...tempProfile, phone: e.target.value})}
                    className="w-full bg-surfaceHighlight border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-primary"
                  />
                ) : (
                  <p className="text-sm text-white">{store.driver.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Business Affiliation */}
          <div className="bg-surface border border-surfaceHighlight rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Package size={18} className="text-primary" />
                Afiliación a Negocio
              </h3>
              {store.driver.businessAffiliation?.status === 'active' ? (
                <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] rounded border border-green-500/20 font-bold uppercase">Activo</span>
              ) : store.driver.businessAffiliation?.status === 'pending' ? (
                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] rounded border border-yellow-500/20 font-bold uppercase">Pendiente</span>
              ) : (
                <button onClick={() => setEditingBusiness(true)} className="text-xs text-primary hover:underline">Afiliarse</button>
              )}
            </div>

            {editingBusiness ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-textMuted uppercase font-bold">Seleccionar Negocio</label>
                  <select 
                    value={tempBusiness.businessName}
                    onChange={e => setTempBusiness({...tempBusiness, businessName: e.target.value})}
                    className="w-full bg-surfaceHighlight border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-primary appearance-none"
                  >
                    <option value="">Selecciona un negocio...</option>
                    {MOCK_BUSINESSES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                
                {tempBusiness.businessName && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-textMuted uppercase font-bold">Email del Negocio</label>
                      <input 
                        type="email"
                        value={tempBusiness.businessEmail}
                        onChange={e => setTempBusiness({...tempBusiness, businessEmail: e.target.value})}
                        className="w-full bg-surfaceHighlight border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-primary"
                        placeholder="negocio@ejemplo.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-textMuted uppercase font-bold">ID del Negocio</label>
                      <input 
                        value={tempBusiness.businessId}
                        onChange={e => setTempBusiness({...tempBusiness, businessId: e.target.value})}
                        className="w-full bg-surfaceHighlight border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-primary"
                        placeholder="ID-12345"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={saveBusiness}
                    disabled={!tempBusiness.businessName || !tempBusiness.businessEmail || !tempBusiness.businessId}
                    className="flex-1 bg-primary hover:bg-primaryHover disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition-all"
                  >
                    Enviar Solicitud
                  </button>
                  <button 
                    onClick={() => setEditingBusiness(false)}
                    className="flex-1 bg-surfaceHighlight hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-surfaceHighlight/30 p-4 rounded-xl border border-surfaceHighlight/50">
                {store.driver.businessAffiliation ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white">{store.driver.businessAffiliation.businessName}</p>
                      <p className="text-xs text-textMuted">{store.driver.businessAffiliation.businessEmail}</p>
                    </div>
                    <p className="text-xs font-mono text-textMuted">{store.driver.businessAffiliation.businessId}</p>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-xs text-textMuted italic">No estás afiliado a ningún negocio actualmente.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Operating Zones Summary */}
          <div className="bg-surface border border-surfaceHighlight rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Navigation size={18} className="text-primary" />
                Zonas de Operación
              </h3>
              <button onClick={() => setShowZonesModal(true)} className="text-xs text-primary hover:underline">Configurar</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surfaceHighlight/30 p-4 rounded-xl border border-surfaceHighlight/50">
                <p className="text-[10px] text-textMuted uppercase font-bold mb-2">Puntos de Recogida</p>
                <div className="flex flex-wrap gap-1.5">
                  {store.driver.operatingZones?.pickupMunicipalities.length ? (
                    store.driver.operatingZones.pickupMunicipalities.map(m => (
                      <span key={m} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded border border-primary/20">{m}</span>
                    ))
                  ) : (
                    <span className="text-xs text-textMuted italic">Todos los municipios</span>
                  )}
                </div>
              </div>
              <div className="bg-surfaceHighlight/30 p-4 rounded-xl border border-surfaceHighlight/50">
                <p className="text-[10px] text-textMuted uppercase font-bold mb-2">Zonas de Entrega</p>
                <div className="flex flex-wrap gap-1.5">
                  {store.driver.operatingZones?.deliveryMunicipalities.length ? (
                    store.driver.operatingZones.deliveryMunicipalities.map(m => (
                      <span key={m} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded border border-blue-500/20">{m}</span>
                    ))
                  ) : (
                    <span className="text-xs text-textMuted italic">Todos los municipios</span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-textMuted mt-4 italic">El panel principal filtrará automáticamente los pedidos según estas zonas.</p>
          </div>

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
      
      {/* Modals */}
      <OperatingZonesModal 
        isOpen={showZonesModal}
        onClose={() => setShowZonesModal(false)}
        currentZones={store.driver.operatingZones}
        onSave={saveZones}
      />
    </div>
  );
};

// 5. Login Layout
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.hash = '#/';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
       <div className="w-full max-w-sm z-10 flex flex-col items-center">
          <div className="text-center mb-10">
             <div className="w-20 h-20 bg-surfaceHighlight rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl border border-white/5">
               <Bike size={40} className="text-primary" />
             </div>
             <h1 className="text-4xl font-bold text-white mb-2">
               Merqba <span className="text-primary">Delivery</span>
             </h1>
             <p className="text-textMuted text-sm">Gestiona tus entregas con facilidad</p>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-6">
             <div className="space-y-2">
                <label className="text-sm font-medium text-white ml-1">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface/50 border border-surfaceHighlight rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all"
                    placeholder="tu@ejemplo.com"
                  />
                </div>
             </div>
             
             <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-medium text-white">Contraseña</label>
                  <a href="#" className="text-xs text-primary hover:underline font-medium">¿Olvidaste tu contraseña?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface/50 border border-surfaceHighlight rounded-xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-primary transition-all"
                    placeholder="........"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
             </div>

             <button type="submit" className="w-full bg-primary hover:bg-primaryHover text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] text-lg">
               Iniciar Sesión
             </button>
          </form>

          <div className="w-full mt-10">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surfaceHighlight"></div>
              </div>
              <span className="relative px-4 bg-background text-textMuted text-sm">O continúa con</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 bg-surface/50 border border-surfaceHighlight rounded-xl py-3.5 text-white hover:bg-surfaceHighlight transition-colors">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                <span className="text-sm font-medium">Google</span>
              </button>
              <button className="flex items-center justify-center gap-2 bg-surface/50 border border-surfaceHighlight rounded-xl py-3.5 text-white hover:bg-surfaceHighlight transition-colors">
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg viewBox="0 0 384 512" className="w-4 h-4 fill-current"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                </div>
                <span className="text-sm font-medium">Apple</span>
              </button>
            </div>
          </div>

          <p className="mt-12 text-center text-textMuted text-sm">
            ¿No tienes cuenta? <button onClick={() => window.location.hash = '#/register'} className="text-primary font-bold hover:underline ml-1">Regístrate aquí</button>
          </p>

          <p className="mt-16 text-[10px] text-textMuted tracking-widest uppercase opacity-50">
            © 2024 MERQBA DELIVERY. TODOS LOS DERECHOS RESERVADOS.
          </p>
       </div>
    </div>
  );
};

// 6. Register Layout
const Register = () => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1 Data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 Data
  const [vehicleType, setVehicleType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [document, setDocument] = useState<File | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) setStep(2);
    else {
      // Finalize registration
      alert('Registro completado con éxito. Tu cuenta está en proceso de activación.');
      window.location.hash = '#/login';
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else window.location.hash = '#/login';
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center gap-4 border-b border-surfaceHighlight/30">
        <button onClick={handleBack} className="p-2 hover:bg-surfaceHighlight rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">
          {step === 1 ? 'Registro de Conductor' : 'Professional Registration'}
        </h1>
      </header>

      <div className="flex-1 p-6 max-w-md mx-auto w-full">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-primary text-[10px] font-bold uppercase tracking-wider mb-1">
                {step === 1 ? 'PASO 1 DE 2' : 'Step 2 of 2'}
              </p>
              <h2 className="text-3xl font-bold">
                {step === 1 ? 'Información Personal' : 'Vehicle Information'}
              </h2>
            </div>
            <span className="text-textMuted text-sm font-medium">{step === 1 ? '50%' : '100%'}</span>
          </div>
          <div className="w-full bg-surfaceHighlight rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-500 ease-out" 
              style={{ width: step === 1 ? '50%' : '100%' }}
            ></div>
          </div>
          <p className="mt-4 text-textMuted text-sm leading-relaxed">
            {step === 1 
              ? 'Completa tus datos básicos para comenzar tu proceso de activación.' 
              : 'Tell us about your transport to complete the setup.'}
          </p>
        </div>

        <form onSubmit={handleNext} className="space-y-6">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white ml-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface/50 border border-surfaceHighlight rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white ml-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface/50 border border-surfaceHighlight rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white ml-1">Número de Teléfono</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                  <input 
                    type="tel" 
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-surface/50 border border-surfaceHighlight rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all"
                    placeholder="+52 000 000 0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white ml-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface/50 border border-surfaceHighlight rounded-xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-primary transition-all"
                    placeholder="........"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white ml-1">Confirmar Contraseña</label>
                <div className="relative">
                  <RotateCcw className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={18} />
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-surface/50 border border-surfaceHighlight rounded-xl pl-12 pr-12 py-4 text-white focus:outline-none focus:border-primary transition-all"
                    placeholder="........"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-textMuted uppercase tracking-wider ml-1">VEHICLE TYPE</label>
                <div className="relative">
                  <select 
                    required
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-surface/50 border border-surfaceHighlight rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary appearance-none transition-all"
                  >
                    <option value="" disabled className="bg-surface">Select your vehicle</option>
                    <option value="bike" className="bg-surface">Bicycle / Electric Scooter</option>
                    <option value="motorcycle" className="bg-surface">Motorcycle</option>
                    <option value="car" className="bg-surface">Car</option>
                    <option value="truck" className="bg-surface">Truck / Van</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-textMuted">
                    <ChevronRight size={18} className="rotate-90" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-textMuted uppercase tracking-wider ml-1">LICENSE PLATE NUMBER</label>
                <input 
                  type="text" 
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full bg-surface/50 border border-surfaceHighlight rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary transition-all"
                  placeholder="ABC-1234"
                />
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 size={20} />
                  <h3 className="font-bold">Document Verification</h3>
                </div>
                <p className="text-textMuted text-sm">Please upload a clear photo of your professional license or ID card.</p>
                
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setDocument(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-primary/30 rounded-2xl p-10 flex flex-col items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-all">
                    <div className="w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center mb-4 text-primary">
                      <Camera size={32} />
                    </div>
                    <p className="text-white font-bold mb-1">Click to upload photo</p>
                    <p className="text-textMuted text-xs">JPG, PNG up to 5MB</p>
                    {document && (
                      <p className="mt-4 text-success text-xs font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> {document.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-6">
            <button type="submit" className="w-full bg-primary hover:bg-primaryHover text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg">
              {step === 1 ? 'siguiente' : 'Finalizar Registro'}
              <ChevronRight size={20} />
            </button>
          </div>
        </form>
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
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Layout store={store}><Dashboard store={store} /></Layout>} />
        <Route path="/my-orders" element={<Layout store={store}><MyOrders store={store} /></Layout>} />
        <Route path="/history" element={<Layout store={store}><History store={store} /></Layout>} />
        <Route path="/earnings" element={<Layout store={store}><Earnings store={store} /></Layout>} />
        <Route path="/profile" element={<Layout store={store}><Profile store={store} /></Layout>} />
      </Routes>
    </Router>
  );
}