# Restaurant Menu & Customer Ordering

This updated version adds customer ordering to the restaurant/canteen menu manager.

## Customer features
- Browse only available food items
- Search food items
- Filter by category
- Add items to cart
- Increase/decrease quantities
- View cart total
- Checkout
- Enter customer name and phone
- Select dine-in or takeaway
- Enter table number for dine-in
- Add special instructions
- Place an order and receive an order number

## Admin features
- Add food item
- Edit food item
- Delete food item
- Add/delete categories
- Set prices in INR
- Mark food available/unavailable

Orders, menu items, categories, and cart data are stored in browser localStorage.

## Run
Open `index.html` in a modern browser.

## Production upgrade
For a real restaurant system, connect this frontend to a backend/database so customers and restaurant staff can access orders from different devices. A suitable next version would use Node.js + Express + MySQL/PostgreSQL and an admin order dashboard.


## Admin login added

The frontend now includes a protected Admin Login screen. The Admin Menu tab opens the login form when no admin session exists, and the logout button clears the session.

Default credentials for the backend version:
- Username: `admin`
- Password: `admin123`

For production, change the default password and use a strong JWT secret on the server.

The frontend expects these API endpoints:
- `POST /api/admin/login`
- `GET /api/categories`
- `POST /api/categories` (admin)
- `DELETE /api/categories/:id` (admin)
- `GET /api/menu`
- `POST /api/menu` (admin)
- `PUT /api/menu/:id` (admin)
- `DELETE /api/menu/:id` (admin)
- `PATCH /api/menu/:id/availability` (admin)
- `POST /api/orders`

The original version stored menu, cart, and orders in browser localStorage; this updated frontend is prepared to use the Node.js + Express + MySQL backend instead.
