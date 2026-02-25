export enum OrderStatus {
  PENDING = 'pending',     // Available for pickup
  ACCEPTED = 'accepted',   // Driver accepted
  IN_TRANSIT = 'in_transit', // Driver has package, going to customer
  DELIVERED = 'delivered', // Dropped off (waiting admin completion)
  COMPLETED = 'completed', // Admin/System verified (funds released)
  CANCELLED = 'cancelled'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  earnings: number; // USD
  pickupAddress: string;
  storeName?: string;
  pickupCoords: Coordinates;
  deliveryAddress: string;
  deliveryCoords: Coordinates;
  deliveryNotes?: string;
  pickupNotes?: string;
  distance: string; // e.g., "3.5 km"
  customer: Customer;
  items: OrderItem[];
  createdAt: string;
  weight?: string;
  zone?: string;
  pickupMunicipality?: string;
  deliveryMunicipality?: string;
}

export interface BusinessAffiliation {
  businessName: string;
  businessEmail: string;
  businessId: string;
  status: 'pending' | 'active' | 'none';
}

export interface DriverProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  rating: number;
  totalRatings: number;
  totalDeliveries: number;
  successRate: number; // percentage
  averageTime: string; // e.g., "25 min"
  balance: number; // Current available balance
  totalEarned: number; // Lifetime
  cardNumber?: string; // For withdrawals
  operatingZones?: {
    pickupMunicipalities: string[];
    deliveryMunicipalities: string[];
  };
  businessAffiliation?: BusinessAffiliation;
}

export interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal';
  amount: number;
  status: 'pending' | 'completed';
  date: string;
  orderId?: string;
}