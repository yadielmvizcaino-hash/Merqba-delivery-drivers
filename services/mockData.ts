import { Order, OrderStatus, DriverProfile, Transaction } from '../types';

export const MOCK_DRIVER: DriverProfile = {
  id: 'driver-001',
  name: 'Yadiel Moya',
  email: 'yadiel@merqba.com',
  phone: '+53 55555555',
  avatar: 'https://picsum.photos/200/200',
  rating: 5.0,
  totalRatings: 12,
  totalDeliveries: 45,
  successRate: 98.5,
  averageTime: '32 min',
  balance: 0.00, // Calculated dynamically in app state usually, but initial here
  totalEarned: 1195.00,
  cardNumber: '9200 1234 5678 9010',
  operatingZones: {
    pickupMunicipalities: [], // Empty means "All" by default
    deliveryMunicipalities: []
  }
};

export const MOCK_ORDERS: Order[] = [
  {
    id: '1',
    orderNumber: '#WC-10045',
    status: OrderStatus.PENDING,
    earnings: 15.50,
    pickupAddress: 'Almacén Central, Calle 23 #456, Vedado, La Habana',
    pickupCoords: { lat: 23.1368, lng: -82.3816 }, // Vedado
    deliveryAddress: 'Calle 10 #202 e/ 9 y 11, Miramar, Playa',
    deliveryCoords: { lat: 23.1189, lng: -82.4223 }, // Miramar
    customer: {
      id: 'c1',
      name: 'María García',
      phone: '+53 52222222',
    },
    items: [
      { id: 'p1', name: 'Laptop HP 15.6"', quantity: 1, price: 850.00 },
      { id: 'p2', name: 'Mouse Inalámbrico', quantity: 2, price: 25.00 }
    ],
    deliveryNotes: 'Apartamento 4B, tocar el timbre dos veces.',
    pickupNotes: 'Preguntar por Jorge en despacho.',
    distance: '4.2 km',
    createdAt: new Date().toISOString(),
    weight: '3.5 kg',
    zone: 'Playa',
    pickupMunicipality: 'Plaza de la Revolución',
    deliveryMunicipality: 'Playa'
  },
  {
    id: '2',
    orderNumber: '#WC-10046',
    status: OrderStatus.PENDING,
    earnings: 5.00,
    pickupAddress: 'Tienda Electro, Obispo #302, Habana Vieja',
    pickupCoords: { lat: 23.1386, lng: -82.3552 }, // Habana Vieja
    deliveryAddress: 'Calle San Lázaro #567, Centro Habana',
    deliveryCoords: { lat: 23.1404, lng: -82.3734 }, // Centro Habana
    customer: {
      id: 'c2',
      name: 'Roberto Perez',
      phone: '+53 53333333',
    },
    items: [
      { id: 'p3', name: 'Auriculares Bluetooth', quantity: 1, price: 45.00 }
    ],
    distance: '1.8 km',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    weight: '0.2 kg',
    zone: 'Centro Habana',
    pickupMunicipality: 'Habana Vieja',
    deliveryMunicipality: 'Centro Habana'
  },
  {
    id: '3',
    orderNumber: '#WC-10047',
    status: OrderStatus.PENDING,
    earnings: 8.75,
    pickupAddress: 'Mercado 3ra y 70, Playa',
    pickupCoords: { lat: 23.1044, lng: -82.4385 },
    deliveryAddress: 'Ave 31 #4402, Marianao',
    deliveryCoords: { lat: 23.0855, lng: -82.4285 },
    customer: {
      id: 'c3',
      name: 'Alejandro Cruz',
      phone: '+53 54444444',
    },
    items: [
      { id: 'p4', name: 'Kit Herramientas', quantity: 1, price: 120.00 },
      { id: 'p5', name: 'Cinta Métrica', quantity: 1, price: 10.00 }
    ],
    distance: '3.1 km',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    weight: '5.0 kg',
    zone: 'Marianao',
    pickupMunicipality: 'Playa',
    deliveryMunicipality: 'Marianao'
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    type: 'earning',
    amount: 12.50,
    status: 'completed',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    orderId: '#WC-9988'
  },
  {
    id: 't2',
    type: 'withdrawal',
    amount: 50.00,
    status: 'completed',
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
  }
];