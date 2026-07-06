# Dream N Decor — Angular + Laravel E-commerce

A full-stack e-commerce site: customers browse and buy products (with or without an account), sellers manage their own product listings, and admins/superadmin oversee orders, products, categories, customers, and staff accounts.

- **Frontend**: Angular 21 (standalone components, signals) + Tailwind CSS — in the repo root
- **Backend**: Laravel 12 API + Sanctum token auth + MySQL — in `/backend`

## Roles & accounts

Login is **username + password** everywhere (email is optional, contact-only). Customers live in their own `customers` table, completely separate from staff (`users` table: superadmin/admin/seller) — and the two have **separate login pages/endpoints**:

- `/login` (`POST /api/login`) — **customers only**. This is also the only public sign-up flow (`/register`) — there's no seller/admin option here anymore.
- `/staff/login` (`POST /api/staff-login`) — **sellers, admins, and superadmins only**, linked from a small "Staff login" link in the footer rather than the main nav. Seller accounts aren't self-serve from the public site anymore; they (and employees) are provisioned by a superadmin.

Roles:
- **Customer** — registers with username/phone/password (email optional); browses, orders, and views their own order history. Can also **check out as a guest** with no account at all — guest orders aren't linked to any customer record.
- **Seller** — manages their own product listings (photo, description, category, price, quantity) and views/updates status on orders containing their products.
- **Admin** (employee) — scoped access to the admin dashboard based on permissions granted by a superadmin: `manage_products`, `manage_categories`, `manage_orders`, `manage_users`, `manage_customers`.
- **Superadmin** — full access to everything, plus the exclusive ability to create/remove employee (admin) accounts and assign their permissions.

## Prerequisites

- Node.js + npm
- PHP 8.2+ and Composer
- MySQL/MariaDB running locally (e.g. via XAMPP)

## Backend setup

```bash
cd backend
composer install
copy .env.example .env      # if .env doesn't already exist
php artisan key:generate
```

Edit `backend/.env` and make sure the DB settings match your local MySQL:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ecommerce
DB_USERNAME=root
DB_PASSWORD=
```

Create the database, then migrate and seed demo data:

```bash
mysql -u root -e "CREATE DATABASE ecommerce"
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

The API runs at `http://localhost:8000`. Seeded accounts (password for all: `password`):

| Role                       | Username          | Permissions              |
|----------------------------|--------------------|---------------------------|
| Superadmin                 | `superadmin`       | All                       |
| Admin (employee example)   | `orders_employee`  | manage_orders only        |
| Seller                     | `demo_seller`      | —                         |
| Customer                   | `demo_customer`    | —                         |

## Frontend setup

From the repo root:

```bash
npm install
ng serve
```

Open `http://localhost:4200`. The app expects the API at `http://localhost:8000/api` (see `src/environments/environment.ts`).

## Golden path to try

1. Log in as `demo_seller` via **Staff login** (footer link), add a product with a name, category, price, quantity, and photo.
2. Browse products **without logging in** and check out as a guest — no account required.
3. Register as a **customer** on the main `/register` page (username + phone + password), place an order, and see it under "My Orders".
4. Log back in as the seller to see the new order and update its status.
5. Log in as `superadmin` (via Staff login) to see all orders, manage categories, manage any seller's products, browse the Customers tab (with each customer's order history), and add a new employee account with scoped permissions (including `manage_customers`).
6. Log in as that new employee (via Staff login) to confirm they only see the admin tabs matching the permissions you granted them.
7. Confirm the split: try logging in as `superadmin` on the main `/login` page (rejected), and as `demo_customer` on `/staff/login` (also rejected).
