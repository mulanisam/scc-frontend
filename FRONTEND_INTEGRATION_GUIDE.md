# Frontend Integration Guide

## 🎯 New Components Created

### 1. SingleSaleEntry.jsx
**Location:** `/app/src/components/sale/SingleSaleEntry.jsx`

**Features:**
- Single sale entry form
- Auto-calculation of amount based on kg × rate
- Customer dropdown filtered by route
- Real-time validation
- Automatic ledger entry creation on backend

**Route to Add:**
```javascript
<Route path="/sale/single" element={<SingleSaleEntry />} />
```

---

### 2. PaymentEntry.jsx
**Location:** `/app/src/components/payment/PaymentEntry.jsx`

**Features:**
- Standalone payment recording
- Customer search with autocomplete
- Shows current customer balance
- Multiple payment modes
- Transaction reference tracking

**Route to Add:**
```javascript
<Route path="/payment-entry" element={<PaymentEntry />} />
```

---

### 3. CustomerLedgerView.jsx
**Location:** `/app/src/components/ledger/CustomerLedgerView.jsx`

**Features:**
- Complete customer transaction history
- Date range filtering
- Shows debit (sales) and credit (payments)
- Running balance display
- Color-coded transaction types
- Backdated entry indicators

**Route to Add:**
```javascript
<Route path="/ledger" element={<CustomerLedgerView />} />
```

---

## 🔧 Services Updated

### 1. SalesService.js
**New Export:** `createSingleSale`

```javascript
import { createSingleSale } from '../service/SalesService';

// Usage
const sale = await createSingleSale({
  date: "2024-01-21",
  customerId: 1,
  routeId: 1,
  vehicleId: 1,
  driverId: 1,
  kilograms: 50.5,
  rate: 180,
  birds: 100,
  amount: 9090,
  payment: 5000,
  paymentMode: "CASH",
  description: "Sale"
});
```

### 2. PaymentService.js (NEW)
**Location:** `/app/src/components/service/PaymentService.js`

**Methods:**
- `createPayment(paymentData, token)`
- `getCustomerPayments(customerId, token)`
- `getPaymentsByDateRange(startDate, endDate, token)`
- `getPaymentById(paymentId, token)`
- `deletePayment(paymentId, token)`

### 3. LedgerService.js (NEW)
**Location:** `/app/src/components/service/LedgerService.js`

**Methods:**
- `getCustomerLedger(customerId, startDate, endDate, token)`
- `getCurrentBalance(customerId, token)`

---

## 📝 Update App.js

Add these imports:
```javascript
import SingleSaleEntry from './components/sale/SingleSaleEntry';
import PaymentEntry from './components/payment/PaymentEntry';
import CustomerLedgerView from './components/ledger/CustomerLedgerView';
```

Add these routes inside `<Routes>` (inside authenticated section):
```javascript
{isAuthenticated && !isDriver && (
  <>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/sale" element={<SalesEntry />} />
    <Route path="/sale/single" element={<SingleSaleEntry />} />
    <Route path="/payment-entry" element={<PaymentEntry />} />
    <Route path="/ledger" element={<CustomerLedgerView />} />
    <Route path="/purchase" element={<PurchaseEntryPage />} />
    <Route path="/reports" element={<Reports />} />
    <Route path="/master-data" element={<MasterData />} />
    
    {isAdmin && (
      <>
        <Route path="/trading" element={<TradingPage />} />
        <Route path="/admin/user-management" element={<UserManagementPage />} />
        <Route path="/admin/update-user/:userId" element={<UpdateUser />} />
      </>
    )}
  </>
)}
```

---

## 🧭 Update Navbar

Add these menu items in your navbar:

```javascript
// In Navbar component
const menuItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { 
    label: 'Sales',
    submenu: [
      { path: '/sale', label: 'Bulk Sale Entry' },
      { path: '/sale/single', label: 'Single Sale Entry' }, // NEW
    ]
  },
  { path: '/payment-entry', label: 'Payment Entry' }, // NEW
  { path: '/ledger', label: 'Customer Ledger' }, // NEW
  { path: '/purchase', label: 'Purchase' },
  { path: '/reports', label: 'Reports' },
  { path: '/master-data', label: 'Master Data' },
  // ... rest of menu
];
```

---

## 🎨 Styling Notes

All components use Material-UI (MUI) v5 consistent with your existing design:
- Theme colors from `theme/theme.js`
- Responsive grid layouts
- Proper spacing and elevation
- Alert messages for feedback
- Loading states with CircularProgress

---

## 🧪 Testing Steps

### 1. Test Single Sale Entry
1. Navigate to `/sale/single`
2. Fill in all fields
3. Click "Create Sale"
4. Verify success message
5. Check sale appears in reports
6. Check ledger shows the sale

### 2. Test Payment Entry
1. Navigate to `/payment-entry`
2. Select a customer (shows current balance)
3. Enter payment amount and details
4. Submit
5. Verify balance reduces
6. Check ledger shows payment

### 3. Test Customer Ledger
1. Navigate to `/ledger`
2. Select a customer
3. View all transactions
4. Apply date filters
5. Verify running balance is correct
6. Check backdated entries are marked

### 4. Test Backdate Handling
1. Create a sale with yesterday's date
2. Check ledger - should show "Backdated" chip
3. Verify all subsequent balances recalculated
4. Compare customer balance before/after

---

## 🔗 API Endpoints Used

### Sales
- `POST /user/sales/single` - Create single sale
- `POST /user/sales/bulk` - Existing bulk entry

### Payments
- `POST /user/payments` - Create payment
- `GET /user/payments/customer/{id}` - Get customer payments

### Ledger
- `GET /user/ledger/customer/{id}` - Get ledger
- `GET /user/ledger/customer/{id}?startDate=X&endDate=Y` - Filtered ledger

### Master Data (Existing)
- `GET /user/customers` - All customers
- `GET /user/customers/byRoute/{id}` - Customers by route
- `GET /user/routes` - All routes
- `GET /user/drivers` - All drivers
- `GET /user/vehicles` - All vehicles

---

## 📊 Data Flow

### Single Sale Entry Flow:
```
User fills form → Validate → POST to /user/sales/single 
→ Backend creates Sale → Creates Ledger Entry 
→ Checks if backdated → Recalculates balances if needed 
→ Returns success → Frontend shows message
```

### Payment Entry Flow:
```
User selects customer → Shows current balance 
→ Enters payment → POST to /user/payments 
→ Backend creates Payment → Creates Ledger Entry 
→ Updates customer balance → Returns success
```

### Ledger View Flow:
```
User selects customer → GET /user/ledger/customer/{id} 
→ Backend fetches all transactions → Sorted by date 
→ Frontend displays in table → Shows running balance
```

---

## 🚀 Deployment Checklist

Frontend:
- [ ] All components added
- [ ] Services imported
- [ ] Routes added to App.js
- [ ] Navbar updated with new menu items
- [ ] Test all forms
- [ ] Verify API calls work

Backend:
- [ ] Updated backend deployed
- [ ] Database migrations run
- [ ] Migration endpoint called once
- [ ] Verify ledger entries created
- [ ] Test all new endpoints

Integration:
- [ ] Single sale creates ledger entry
- [ ] Payment updates balance
- [ ] Ledger shows all transactions
- [ ] Backdate handling works
- [ ] Credit limit validation works (if enabled)

---

## 💡 Usage Tips

1. **Single Sale vs Bulk Sale:**
   - Use Single Sale for individual quick entries
   - Use Bulk Sale for route-wise complete entry

2. **Payment Entry:**
   - Can be used independently of sales
   - Useful for receiving advance payments
   - Shows customer balance for reference

3. **Customer Ledger:**
   - Complete audit trail
   - Use date filters for period analysis
   - Backdated entries clearly marked
   - Running balance shows in real-time

4. **Backdate Handling:**
   - System automatically detects backdated entries
   - All subsequent balances recalculated
   - No manual intervention needed

---

## 🔍 Common Issues & Solutions

**Issue:** Customer dropdown empty in Single Sale
- **Solution:** Select Route first, customers load based on route

**Issue:** Amount not calculating
- **Solution:** Enter both Kilograms and Rate, calculation is automatic

**Issue:** Payment exceeds balance warning
- **Solution:** This is just a warning, payment can still be recorded (allows advance)

**Issue:** Ledger not showing
- **Solution:** Ensure backend migration completed successfully

**Issue:** Balance mismatch
- **Solution:** Run migration endpoint again or contact admin

---

## 📞 Support

For any issues during integration:
1. Check browser console for errors
2. Check backend logs
3. Verify all imports are correct
4. Ensure backend API is running
5. Test with Postman first

---

**Happy Coding! 🎉**
