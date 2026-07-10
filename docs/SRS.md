# PGPOS - Software Requirements Specification

## System Modules, Features, and Functions

---

# 1. Authentication Module

## Pages
- Login
- Forgot Password
- Reset Password

## Features
- Secure user sign-in using email and password credentials.
- Password recovery flow for users who forget their password.
- Role-based redirection after successful authentication.
- Persistent session handling with token refresh and logout support.
- User permission loading for access-controlled pages and actions.

## Functions

### Login
- Authenticate using email and password.
- Show or hide password input.
- Support Remember Me option.
- Validate login form fields.
- Display authentication errors.
- Redirect user based on role.
- Save user session.
- Load user permissions.

### Forgot Password
- Send password reset email.
- Validate email address.
- Display success notification.

### Reset Password
- Verify reset token.
- Update password.
- Validate password strength.

### Session
- Refresh token.
- Logout.
- Automatically validate session.
- Automatically log out user when token expires.

---

# 2. Dashboard Module

## Features
- High-level sales performance overview.
- Business analytics graphs for revenue, profit, and sales trends.
- Product performance statistics.
- Inventory status monitoring.
- Recent transaction and activity visibility.

## Functions

### Sales Summary
- Daily sales.
- Weekly sales.
- Monthly sales.
- Annual sales.

### Analytics
- Sales graph.
- Revenue graph.
- Profit graph.
- Hourly sales.
- Weekly sales.
- Monthly sales.

### Product Statistics
- Top selling products.
- Slow moving products.
- Best selling categories.

### Inventory Statistics
- Low stocks.
- Out of stocks.
- Expiring medicines.
- Recently added products.

### Transactions
- Today's transactions.
- Cancelled transactions.
- Recent activities.

---

# 3. POS Cashiering Module

## Features
- Fast cashier workflow for barcode-based and search-based selling.
- Shopping cart management with quantity and discount controls.
- Checkout using supported payment methods.
- Receipt generation, printing, and reprinting.
- Transaction history, cancellation, and admin voiding.
- Sales validation to protect inventory accuracy and product safety.

## Functions

### Product Search
- Barcode scanner.
- Barcode input.
- Product search.
- Category filter.
- Brand filter.

### Shopping Cart
- Add item.
- Remove item.
- Update quantity.
- Clear cart.
- Item discount.
- Overall discount.

### Checkout
- Cash payment.
- Card payment.
- GCash.
- Maya.
- Multiple payment methods in future release.

### Receipt
- Print receipt.
- Reprint receipt.
- Email receipt in future release.

### Transaction
- Save transaction.
- View transaction history.
- Search receipt.
- View receipt details.
- Cancel transaction.
- Void transaction with admin permission.

### Validation
- Prevent negative stock.
- Prevent selling expired medicines.
- Validate stock availability.

---

# 4. Inventory Module

## Features
- Centralized product catalog management.
- Product search and filtering for fast inventory lookup.
- Product import and export for bulk maintenance and reporting.
- Product image management.
- Product archiving to preserve historical records without active selling.

## Functions

### Product Management
- Add product.
- Edit product.
- Delete product.
- View product.
- Archive product.

### Search
- Search by barcode.
- Search by product name.
- Search by brand.
- Search by category.

### Filter
- Category.
- Supplier.
- Stock status.
- Expiration status.

### Import and Export
- Import Excel.
- Export Excel.
- Export PDF.

### Product Images
- Upload image.
- Change image.
- Delete image.

---

# 5. Item Receiving Module

## Features
- Supplier delivery receiving workflow.
- Receiving slip generation for documentation.
- Barcode-assisted receiving item entry.
- Batch and expiration tracking during stock intake.
- Automatic inventory updates after receiving completion.

## Functions

### Receiving
- Create receiving transaction.
- Edit receiving.
- View receiving.
- Print receiving slip.

### Supplier
- Select supplier.
- Search supplier.

### Receiving Items
- Barcode scan.
- Add item.
- Remove item.
- Update quantity.
- Batch number.
- Expiration date.

### Inventory Update
- Automatically increase stock.
- Update average cost.
- Create inventory log.
- Save batch information.

---

# 6. Reports Module

## Features
- Sales reporting by date period and custom range.
- Product performance and profit reporting.
- Inventory condition reporting.
- Receiving and supplier delivery reporting.
- Printable and exportable report outputs.

## Functions

### Sales Reports
- Daily sales.
- Weekly sales.
- Monthly sales.
- Annual sales.
- Date range.

### Product Reports
- Product sales.
- Best sellers.
- Slow moving items.
- Profit report.

### Inventory Reports
- Current stock.
- Low stock.
- Out of stock.
- Expiring products.

### Receiving Reports
- Receiving history.
- Supplier deliveries.

### Export
- Print.
- Export PDF.
- Export Excel.

---

# 7. User Management Module

## Features
- User account lifecycle management.
- Role assignment and permission visibility.
- User security controls.
- User activity monitoring for accountability.

## Functions

### User Accounts
- Add user.
- Edit user.
- Delete user.
- Activate user.
- Deactivate user.

### Roles
- Assign role.
- Change role.
- View permissions.

### Security
- Reset password.
- Lock user.
- Unlock user.

### User Activity
- Login history.
- Audit trail.
- User status.

---

# 8. Settings Module

## Features
- Company profile configuration.
- POS receipt, tax, currency, and numeric display setup.
- Inventory threshold and barcode configuration.
- User preference configuration.
- System maintenance controls.

## Functions

### Company
- Company name.
- Logo.
- Address.
- Contact number.
- Tax information.

### POS Settings
- Receipt header.
- Receipt footer.
- VAT settings.
- Currency.
- Decimal places.

### Inventory Settings
- Low stock threshold.
- Barcode format.
- Default unit.

### User Preferences
- Theme.
- Language.
- Time zone.

### System
- Backup database.
- Restore database.
- Clear cache.
- View system logs.

---

# 9. Supplier Management Module

## Features
- Supplier profile management.
- Supplier contact information tracking.
- Supplier search for inventory and receiving workflows.
- Supplier purchase history visibility.

## Functions
- Add supplier.
- Edit supplier.
- Delete supplier.
- Search supplier.
- View supplier purchase history.
- Manage supplier contact information.

---

# 10. Category Management Module

## Features
- Product category maintenance.
- Category archiving for inactive classifications.
- Category-to-product visibility.

## Functions
- Add category.
- Edit category.
- Delete category.
- View category products.
- Archive category.

---

# 11. Audit Log Module

## Features
- Automatic recording of critical user and system events.
- Searchable audit history for compliance and troubleshooting.
- Exportable audit records.

## Functions

### Automatic Recording
- User login.
- User logout.
- Product creation.
- Product update.
- Product deletion.
- Receiving transactions.
- Sales transactions.
- Void transactions.
- User management changes.
- Settings changes.

### Search
- Search by user.
- Search by module.
- Search by date.
- Search by action type.

### Export
- Export PDF.
- Export Excel.

---

# 12. Notification Module

## Features
- Inventory status alerts.
- Expiration and stock safety notifications.
- Operational reminders.
- Security and system error alerts.

## Functions
- Low stock alert.
- Expiring medicines alert.
- Out of stock alert.
- New receiving notification.
- Backup reminder.
- Failed login alert.
- System error notification.

---

# 13. Database Maintenance Module

## Features
- Database backup and restoration.
- Database optimization.
- Log cleanup.
- Database size monitoring.

## Functions
- Backup database.
- Restore database.
- Optimize database.
- Clean logs.
- Monitor database size.

---

# 14. Activity Dashboard

## Features
- Real-time operational status display.
- Active user and cashier visibility.
- Current sales and inventory value overview.
- System health and error monitoring.
- Latest activity tracking.

## Functions
- Display active users.
- Display current cashier.
- Display open transactions.
- Display total sales today.
- Display total inventory value.
- Display system health.
- Display latest activities.
- Display recent errors.

---

# Pharmacy-Specific Features and Functions

## Features
- Batch-level medicine tracking.
- Expiration-aware inventory management.
- FEFO stock selection for pharmacy sales.
- Medicine recall support.
- Optional controlled medicine tagging.
- Automatic expiration monitoring.

## Functions
- Manage batch numbers.
- Track expiration dates.
- Apply FEFO stock selection.
- Track medicine recalls.
- Tag controlled medicines when enabled.
- Send automatic expiration alerts.

---

# Grocery-Specific Features and Functions

## Features
- Fast barcode checkout for grocery operations.
- Weight-based product support in future release.
- Promotional pricing support.
- Bundle and BOGO promotion handling.
- Bulk receiving support.
- Scheduled price changes.

## Functions
- Fast barcode checkout.
- Support weight-based products in future release.
- Apply promotional discounts.
- Configure bundle pricing.
- Configure Buy One Get One promotions.
- Configure seasonal promotions.
- Process bulk receiving.
- Schedule price changes.

---

*This document serves as the complete Software Requirements Specification (SRS) for the PGPOS system.*
