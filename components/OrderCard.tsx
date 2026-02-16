import React, { useState } from 'react';
import { MapPin, Box, ChevronDown, ChevronUp, Navigation, Phone, User, DollarSign, Clock, Scale } from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface OrderCardProps {
  order: Order;
  onAction: (orderId: string, action: 'accept' | 'update_status' | 'view_details') => void;
  actionLabel?: string;
  variant?: 'compact' | 'expanded';
  isDetailedView?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onAction, actionLabel, variant = 'expanded', isDetailedView = false }) => {
  const [expanded, setExpanded] = useState(isDetailedView);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'hace momentos';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} d`;
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case OrderStatus.ACCEPTED: return 'bg-primary/20 text-primary border-primary/30';
      case OrderStatus.IN_TRANSIT: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case OrderStatus.DELIVERED: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case OrderStatus.COMPLETED: return 'bg-success/20 text-success border-success/30';
      default: return 'bg-gray-700 text-gray-400';
    }
  };

  const getStatusText = (status: OrderStatus) => {
     switch (status) {
      case OrderStatus.PENDING: return 'Disponible';
      case OrderStatus.ACCEPTED: return 'Aceptado';
      case OrderStatus.IN_TRANSIT: return 'En Camino';
      case OrderStatus.DELIVERED: return 'Entregado (Pendiente Pago)';
      case OrderStatus.COMPLETED: return 'Completado';
      case OrderStatus.CANCELLED: return 'Cancelado';
    }
  };

  const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="bg-surface rounded-xl border border-surfaceHighlight p-4 mb-4 shadow-sm transition-all hover:border-primary/30">
      {/* Header: Earnings & ID */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-xl font-bold text-textMain flex items-center gap-2">
            {formatCurrency(order.earnings)}
            <span className="text-xs font-normal text-success bg-success/10 px-2 py-0.5 rounded-full">ganancia</span>
          </h3>
          <p className="text-xs text-textMuted mt-1">{order.orderNumber}</p>
        </div>
        <div 
          onClick={() => !isDetailedView && setExpanded(!expanded)}
          className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-1 ${getStatusColor(order.status)} ${!isDetailedView ? 'cursor-pointer' : ''}`}
        >
          {getStatusText(order.status)}
          {!isDetailedView && (expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </div>
      </div>

      {/* Main Route Info */}
      <div className="space-y-4">
        {/* Pickup */}
        <div className="relative pl-6 border-l-2 border-dashed border-gray-700 pb-4">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-surface border-2 border-blue-500 box-content"></div>
          <p className="text-xs text-textMuted mb-0.5">Recoger en</p>
          <p className="text-sm text-textMain leading-tight">{order.pickupAddress}</p>
          {expanded && order.pickupNotes && (
             <div className="mt-2 bg-blue-900/20 text-blue-200 text-xs p-2 rounded border border-blue-500/10">
               <span className="font-semibold">Nota:</span> {order.pickupNotes}
             </div>
          )}
        </div>

        {/* Delivery */}
        <div className="relative pl-6">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-surface border-2 border-primary box-content"></div>
          <p className="text-xs text-textMuted mb-0.5">Entregar a</p>
          <p className="text-sm text-textMain leading-tight">{order.deliveryAddress}</p>
          
           {expanded && order.deliveryNotes && (
             <div className="mt-2 bg-yellow-900/20 text-yellow-200 text-xs p-2 rounded border border-yellow-500/10">
               <span className="font-semibold">Nota de entrega:</span> {order.deliveryNotes}
             </div>
          )}
        </div>
      </div>

      {/* Meta Info Preview */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surfaceHighlight/50 text-xs text-textMuted">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5" title="Cantidad de productos">
            <Box size={14} className="text-textMuted" />
            <span>{itemCount} prod.</span>
          </div>
          <div className="flex items-center gap-1.5" title="Peso estimado">
             <Scale size={14} className="text-textMuted" />
             <span className="font-medium text-textMain">{order.weight || '--'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5" title="Tiempo desde publicación">
          <Clock size={14} className="text-textMuted" />
          <span>{formatTimeAgo(order.createdAt)}</span>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-surfaceHighlight animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Customer Info */}
          <div className="flex items-center justify-between bg-surfaceHighlight/30 p-3 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <User size={16} className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium">{order.customer.name}</p>
                <p className="text-xs text-textMuted">Cliente</p>
              </div>
            </div>
            <a href={`tel:${order.customer.phone}`} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Phone size={16} />
            </a>
          </div>

          {/* Products */}
          <div className="space-y-2 mb-4">
            <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">Productos</p>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <span className="text-textMain">{item.quantity}x {item.name}</span>
                <span className="text-textMuted font-mono">${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryCoords.lat},${order.deliveryCoords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="col-span-1 bg-surfaceHighlight hover:bg-gray-700 text-textMain rounded-lg flex items-center justify-center py-3 transition-colors"
            >
              <Navigation size={18} />
            </a>
            {actionLabel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(order.id, order.status === OrderStatus.PENDING ? 'accept' : 'update_status');
                }}
                className="col-span-3 bg-primary hover:bg-primaryHover text-white font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};