import React from 'react';
import { MapPin, Navigation, MessageSquare, Camera, Info, Check, Zap, User, Phone, Trash2, Package } from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface ActiveOrderCardProps {
  order: Order;
  onAction: (orderId: string, action: 'next_status' | 'chat' | 'map' | 'cancel') => void;
}

export const ActiveOrderCard: React.FC<ActiveOrderCardProps> = ({ order, onAction }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStepStatus = (step: 'accepted' | 'in_transit' | 'delivered') => {
    const statusOrder = [OrderStatus.ACCEPTED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, OrderStatus.COMPLETED];
    const currentIdx = statusOrder.indexOf(order.status);
    
    let stepIdx = -1;
    if (step === 'accepted') stepIdx = 0;
    if (step === 'in_transit') stepIdx = 1;
    if (step === 'delivered') stepIdx = 2;

    if (currentIdx > stepIdx) return 'completed';
    if (currentIdx === stepIdx) return 'active';
    return 'pending';
  };

  const renderStep = (label: string, icon: React.ReactNode, step: 'accepted' | 'in_transit' | 'delivered') => {
    const status = getStepStatus(step);
    const isActive = status === 'active';
    const isCompleted = status === 'completed';

    return (
      <div className="flex flex-col items-center gap-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
          isActive || isCompleted ? 'bg-yellow-400 text-gray-900 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'bg-gray-800 text-gray-500 border border-gray-700'
        }`}>
          {isCompleted ? <Check size={20} strokeWidth={3} /> : icon}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          isActive || isCompleted ? 'text-yellow-400' : 'text-gray-500'
        }`}>
          {label}
        </span>
      </div>
    );
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = order.customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  return (
    <div className="bg-[#1a222e] rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-surfaceHighlight rounded-2xl flex items-center justify-center text-primary border border-white/5">
            <Package size={24} />
          </div>
          <div>
            <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">
              PEDIDO {order.orderNumber}
            </p>
            <h3 className="text-white font-bold">{order.storeName || 'Market Central'}</h3>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        <div className="h-px bg-white/5 mb-6" />
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-gray-400 text-xs mb-1">Ganancia estimada</p>
            <p className="text-[#4ade80] text-3xl font-bold">{formatCurrency(order.earnings)}</p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if(confirm('¿Estás seguro de que deseas cancelar este envío? El pedido volverá a estar disponible para otros repartidores.')) {
                onAction(order.id, 'cancel');
              }
            }}
            className="flex items-center gap-2 text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <Trash2 size={14} />
            Cancelar envío
          </button>
        </div>

        {/* Stepper */}
        <div className="flex justify-between items-center relative mb-8 px-2">
          <div className="absolute top-5 left-12 right-12 h-[2px] bg-gray-800 -z-0">
            <div 
              className="h-full bg-yellow-400 transition-all duration-500" 
              style={{ width: order.status === OrderStatus.ACCEPTED ? '0%' : order.status === OrderStatus.IN_TRANSIT ? '50%' : '100%' }}
            />
          </div>

          <div className="relative z-10 flex justify-between w-full">
            {renderStep('Aceptado', <Check size={20} />, 'accepted')}
            {renderStep('En camino', <Zap size={20} />, 'in_transit')}
            {renderStep('Entregado', <Check size={20} />, 'delivered')}
          </div>
        </div>

        {/* Route Info */}
        <div className="space-y-6 mb-8">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div className="w-[2px] h-10 border-l-2 border-dashed border-gray-700 my-1" />
            </div>
            <div>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">RECOGIDA</p>
              <p className="text-gray-200 text-sm font-medium">{order.pickupAddress}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <div>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">ENTREGA</p>
              <p className="text-gray-200 text-sm font-medium">{order.deliveryAddress}</p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl mb-6 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-white/10">
              <User size={20} className="text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{order.customer.name}</p>
              <p className="text-xs text-gray-500">Cliente</p>
            </div>
          </div>
          <a href={`tel:${order.customer.phone}`} className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center text-yellow-400 border border-yellow-400/20">
            <Phone size={18} />
          </a>
        </div>

        {/* Products */}
        <div className="space-y-3 mb-8">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">PRODUCTOS</p>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-300 font-medium">{item.quantity}x {item.name}</span>
                <span className="text-gray-500 font-mono">${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 mb-8">
          <Info size={20} className="text-blue-400 shrink-0" />
          <p className="text-blue-200/80 text-[11px] leading-relaxed">
            El saldo se añadirá a tu cuenta una vez el cliente confirme la recepción del pedido (Estado: Completado).
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAction(order.id, 'next_status');
            }}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-yellow-400/10"
          >
            {order.status === OrderStatus.IN_TRANSIT ? 'Finalizar Entrega' : 'Siguiente Paso'}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleWhatsApp}
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors border border-white/5"
            >
              <MessageSquare size={18} className="text-gray-400" />
              Chat
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAction(order.id, 'map');
              }}
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors border border-white/5"
            >
              <MapPin size={18} className="text-gray-400" />
              Mapa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
