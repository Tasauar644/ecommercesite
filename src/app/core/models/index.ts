export type Role = 'superadmin' | 'admin' | 'employee' | 'customer';

// 'manage_users' does not exist as a grantable permission — the Users tab is role-gated
// (admin/superadmin only), never permission-gated, so an employee can never reach it.
export type Permission =
  | 'manage_products'
  | 'manage_categories'
  | 'manage_orders'
  | 'manage_customers'
  | 'manage_delivery';

export const ALL_PERMISSIONS: { value: Permission; label: string }[] = [
  { value: 'manage_products', label: 'Manage Products' },
  { value: 'manage_categories', label: 'Manage Categories' },
  { value: 'manage_orders', label: 'Manage Orders' },
  { value: 'manage_customers', label: 'Manage Customers' },
  { value: 'manage_delivery', label: 'Manage Delivery Charges' },
];

export interface User {
  id: number;
  name: string;
  username: string;
  phone: string;
  email?: string | null;
  avatar_url?: string | null;
  role: Role;
  permissions?: Permission[] | null;
  is_active?: boolean;
  created_at?: string;
}

export interface Customer {
  id: number;
  name: string;
  username: string;
  phone: string;
  email?: string | null;
  created_at?: string;
  orders_count?: number;
  orders_sum_total?: string | null;
  orders_max_created_at?: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface ProductImage {
  id: number;
  url: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  color_name: string;
  color_hex: string | null;
  price: string;
  quantity: number;
  images: ProductImage[];
}

export interface Product {
  id: number;
  seller_id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  price: string;
  quantity: number;
  image_url: string | null;
  images: ProductImage[];
  variants?: ProductVariant[];
  seller?: { id: number; name: string };
  category?: { id: number; name: string };
  created_at?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'bkash';

export interface Banner {
  id: number;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

export interface District {
  id: number;
  name: string;
  delivery_charge: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_variant_id: number | null;
  variant_color_name: string | null;
  product_name: string | null;
  product_image: string | null;
  seller_id: number;
  quantity: number;
  unit_price: string;
  product?: Product | null;
  variant?: ProductVariant | null;
}

export interface Order {
  id: number;
  customer_id: number | null;
  district_id: number | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_transaction_id: string | null;
  shipping_name: string;
  shipping_address: string;
  shipping_phone: string;
  total: string;
  delivery_charge: string;
  items: OrderItem[];
  customer?: { id: number; name: string; phone: string; email: string | null } | null;
  district?: District | null;
  created_at?: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface CartItem {
  product: Product;
  variant?: ProductVariant | null;
  quantity: number;
}
