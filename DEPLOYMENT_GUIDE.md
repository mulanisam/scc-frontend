# 🚀 Complete Deployment Guide - Sales Module Upgrade

## 📋 Pre-Deployment Checklist

- [ ] Database backup completed
- [ ] Current application version documented
- [ ] Backend code reviewed
- [ ] Frontend code reviewed
- [ ] Test environment ready
- [ ] Rollback plan prepared

---

## 🗄️ Step 1: Database Backup

### MySQL Backup
```bash
# Full database backup
mysqldump -u root -p poultry_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql

# Optional: Backup specific tables
mysqldump -u root -p poultry_db customer sale > backup_critical_tables.sql
```

### Restore Command (if needed)
```bash
mysql -u root -p poultry_db < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📦 Step 2: Backend Deployment

### Option A: Manual Deployment

1. **Stop the backend application**
```bash
# If using supervisor
sudo supervisorctl stop backend

# If using systemd
sudo systemctl stop backend

# If manual process
kill $(ps aux | grep 'java.*backend' | awk '{print $2}')
```

2. **Backup current backend**
```bash
cp -r /path/to/scc-backend /path/to/scc-backend-backup-$(date +%Y%m%d)
```

3. **Copy upgraded files**
```bash
# Copy all Java files from upgraded backend
cp -r /tmp/scc-backend-upgraded/src/main/java/com/app/* /path/to/scc-backend/src/main/java/com/app/

# Copy pom.xml if dependencies changed
cp /tmp/scc-backend-upgraded/pom.xml /path/to/scc-backend/
```

4. **Build the application**
```bash
cd /path/to/scc-backend

# Clean and build
./mvnw clean package -DskipTests

# Or with Maven
mvn clean package -DskipTests
```

5. **Start the application**
```bash
# If using supervisor
sudo supervisorctl start backend

# If using systemd
sudo systemctl start backend

# If manual
java -jar target/backend-0.0.1-SNAPSHOT.jar &
```

### Option B: Using Git (Recommended)

1. **Commit changes to your repository**
```bash
cd /path/to/scc-backend
git add .
git commit -m "Upgrade: Added Ledger Management System"
git push origin main
```

2. **Pull on server**
```bash
git pull origin main
./mvnw clean package -DskipTests
sudo supervisorctl restart backend
```

---

## 🎨 Step 3: Frontend Deployment

### Copy New Files

1. **Copy service files**
```bash
cp /app/src/components/service/PaymentService.js /path/to/frontend/src/components/service/
cp /app/src/components/service/LedgerService.js /path/to/frontend/src/components/service/
```

2. **Copy component files**
```bash
# Create directories if needed
mkdir -p /path/to/frontend/src/components/payment
mkdir -p /path/to/frontend/src/components/ledger

# Copy components
cp /app/src/components/sale/SingleSaleEntry.jsx /path/to/frontend/src/components/sale/
cp /app/src/components/payment/PaymentEntry.jsx /path/to/frontend/src/components/payment/
cp /app/src/components/ledger/CustomerLedgerView.jsx /path/to/frontend/src/components/ledger/
```

3. **Update existing files**
- Update `SalesService.js` with new `createSingleSale` method
- Update `App.js` with new routes
- Update `Navbar.jsx` with new menu items

4. **Install dependencies (if any new)**
```bash
cd /path/to/frontend
yarn install  # or npm install
```

5. **Build and restart**
```bash
# Development
yarn start

# Production build
yarn build
```

---

## 🗃️ Step 4: Database Migration

### Auto-Migration (Spring Boot Hibernate)

The new tables will be created automatically when backend starts:
- `customer_ledger`
- `customer_payment`
- `customer` table will have new columns added

**Verify tables created:**
```sql
USE poultry_db;

SHOW TABLES LIKE 'customer_ledger';
SHOW TABLES LIKE 'customer_payment';

DESCRIBE customer;
-- Should show credit_limit_enabled and credit_limit columns
```

### Manual Table Creation (if auto-migration disabled)

```sql
USE poultry_db;

-- Create customer_ledger table
CREATE TABLE customer_ledger (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    debit_amount DOUBLE NOT NULL DEFAULT 0,
    credit_amount DOUBLE NOT NULL DEFAULT 0,
    running_balance DOUBLE NOT NULL,
    description VARCHAR(500),
    payment_mode VARCHAR(50),
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    is_backdated BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customer(id),
    INDEX idx_customer_date (customer_id, transaction_date),
    INDEX idx_transaction_date (transaction_date)
);

-- Create customer_payment table
CREATE TABLE customer_payment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    payment_date DATE NOT NULL,
    amount DOUBLE NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(255),
    remarks VARCHAR(500),
    received_by VARCHAR(100),
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customer(id),
    INDEX idx_customer_payment_date (customer_id, payment_date)
);

-- Add new columns to customer table
ALTER TABLE customer 
ADD COLUMN credit_limit_enabled BOOLEAN DEFAULT 0,
ADD COLUMN credit_limit DOUBLE DEFAULT NULL;
```

---

## 📊 Step 5: Data Migration to Ledger

### Run Migration Endpoint

**Using cURL:**
```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  | jq -r '.token')

# Run migration
curl -X POST http://localhost:8080/admin/migration/ledger \
  -H "Authorization: Bearer $TOKEN"
```

**Using Postman:**
1. POST `http://localhost:8080/auth/login` with admin credentials
2. Copy the token from response
3. POST `http://localhost:8080/admin/migration/ledger`
4. Add header: `Authorization: Bearer <token>`

**Expected Response:**
```json
{
  "success": true,
  "message": "Migration completed successfully",
  "customersProcessed": 150,
  "salesMigrated": 5420,
  "ledgerEntriesCreated": 5570,
  "error": null
}
```

### Verify Migration

```bash
# Check migration status
curl -X GET http://localhost:8080/admin/migration/status \
  -H "Authorization: Bearer $TOKEN"
```

**Verify in Database:**
```sql
-- Check ledger entries count
SELECT COUNT(*) FROM customer_ledger;

-- Check sample ledger entries
SELECT * FROM customer_ledger LIMIT 10;

-- Verify balances match
SELECT 
    c.id,
    c.name,
    c.balance_amount as customer_balance,
    (SELECT running_balance 
     FROM customer_ledger 
     WHERE customer_id = c.id 
     ORDER BY transaction_date DESC, id DESC 
     LIMIT 1) as ledger_balance
FROM customer c
LIMIT 10;
```

---

## 🧪 Step 6: Testing

### 1. Backend API Testing

**Test Single Sale Entry:**
```bash
curl -X POST http://localhost:8080/user/sales/single \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-21",
    "customerId": 1,
    "routeId": 1,
    "vehicleId": 1,
    "driverId": 1,
    "kilograms": 50.5,
    "rate": 180.0,
    "birds": 100,
    "amount": 9090,
    "payment": 5000,
    "paymentMode": "CASH",
    "description": "Test sale"
  }'
```

**Test Payment Entry:**
```bash
curl -X POST http://localhost:8080/user/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "paymentDate": "2024-01-21",
    "amount": 2000.0,
    "paymentMode": "UPI",
    "transactionReference": "UPI123456",
    "remarks": "Test payment",
    "receivedBy": "Admin"
  }'
```

**Test Ledger View:**
```bash
curl -X GET "http://localhost:8080/user/ledger/customer/1" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Frontend Testing

1. **Single Sale Entry**
   - Navigate to `/sale/single`
   - Fill form and submit
   - Verify success message
   - Check ledger shows entry

2. **Payment Entry**
   - Navigate to `/payment-entry`
   - Select customer
   - Enter payment
   - Verify balance updates

3. **Customer Ledger**
   - Navigate to `/ledger`
   - Select customer
   - Verify all transactions visible
   - Test date filter

### 3. Backdate Testing

1. Create a sale with yesterday's date
2. Check ledger for "Backdated" indicator
3. Verify all future balances recalculated
4. Compare customer balance before/after

---

## 📈 Step 7: Monitoring

### Application Logs

```bash
# Backend logs
tail -f /var/log/supervisor/backend.*.log

# Or application logs
tail -f /path/to/backend/logs/application.log

# Check for errors
grep -i error /var/log/supervisor/backend.*.log
```

### Database Monitoring

```sql
-- Monitor ledger growth
SELECT DATE(created_at) as date, COUNT(*) as entries
FROM customer_ledger
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;

-- Check for balance discrepancies
SELECT 
    c.id,
    c.name,
    c.balance_amount,
    cl.running_balance
FROM customer c
LEFT JOIN (
    SELECT customer_id, running_balance
    FROM customer_ledger
    WHERE (customer_id, id) IN (
        SELECT customer_id, MAX(id)
        FROM customer_ledger
        GROUP BY customer_id
    )
) cl ON c.id = cl.customer_id
WHERE ABS(c.balance_amount - COALESCE(cl.running_balance, 0)) > 0.01;
```

---

## 🔄 Step 8: Rollback Plan (if needed)

### Immediate Rollback

1. **Stop services**
```bash
sudo supervisorctl stop all
```

2. **Restore database**
```bash
mysql -u root -p poultry_db < backup_YYYYMMDD_HHMMSS.sql
```

3. **Restore backend code**
```bash
rm -rf /path/to/scc-backend
cp -r /path/to/scc-backend-backup-YYYYMMDD /path/to/scc-backend
```

4. **Restart services**
```bash
sudo supervisorctl start all
```

### Partial Rollback (Keep Ledger Data)

If ledger data is valuable but feature has issues:

```sql
-- Disable new endpoints in code or
-- Keep running but use old entry methods
-- Ledger data remains for future use
```

---

## ✅ Post-Deployment Checklist

- [ ] Backend started successfully
- [ ] No errors in backend logs
- [ ] Frontend loads correctly
- [ ] Migration completed successfully
- [ ] Sample sale entry works
- [ ] Sample payment entry works
- [ ] Ledger view displays correctly
- [ ] Backdate handling tested
- [ ] Customer balances verified
- [ ] Performance is acceptable
- [ ] Users notified of new features
- [ ] Documentation updated

---

## 📞 Support & Troubleshooting

### Common Issues

**1. Migration fails with "Ledger already contains data"**
- Already migrated, check status endpoint
- If duplicate migration needed, clear ledger table first (⚠️ data loss)

**2. Balance mismatch after migration**
```sql
-- Recalculate for specific customer
-- Use backend endpoint or run recalculation
```

**3. Backend won't start**
- Check logs for errors
- Verify database connectivity
- Check port availability (8080)

**4. Frontend components not loading**
- Clear browser cache
- Check console for errors
- Verify all imports correct

---

## 📚 Additional Resources

- Backend README: `/tmp/scc-backend-upgraded/UPGRADE_README.md`
- Frontend Guide: `/app/FRONTEND_INTEGRATION_GUIDE.md`
- API Documentation: Available after deployment at `/swagger-ui.html`

---

## 🎉 Success Criteria

✅ All new tables created  
✅ Data migrated successfully  
✅ Single sale entry working  
✅ Payment entry working  
✅ Ledger view displaying  
✅ Backdate handling functional  
✅ No balance discrepancies  
✅ Performance acceptable  
✅ Users trained on new features  

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Version:** 2.0  
**Status:** ⬜ Success ⬜ Partial ⬜ Rollback Required

---

**For support, contact the development team or refer to the documentation.**
