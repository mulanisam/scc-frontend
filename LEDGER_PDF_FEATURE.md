# Customer Ledger PDF Download Feature

## 🎯 Overview

Added **PDF Download** functionality to the Customer Ledger view with a **professional standard ledger format** including company details and proper formatting.

---

## ✨ Features

### PDF Contents

1. **Company Header**
   - Company name (large, bold, centered)
   - Company address
   - Contact details (phone & email)
   - Website

2. **Document Title**
   - "CUSTOMER LEDGER REPORT" (bold, centered)

3. **Customer Information**
   - Customer name
   - Shop name
   - Mobile number
   - Report period (date range or "All Transactions")
   - Current balance (highlighted in red for debit, green for credit)

4. **Transaction Table**
   - Date
   - Transaction Type (SALE, PAYMENT, etc.)
   - Description
   - Debit Amount (Sales)
   - Credit Amount (Payments)
   - Running Balance (with Dr/Cr indicator)
   - Payment Mode

5. **Summary Section**
   - Total Debit (Total Sales)
   - Total Credit (Total Payments)
   - Net Balance (highlighted)

6. **Footer on Every Page**
   - Page numbers (Page X of Y)
   - Generation timestamp
   - Company website

---

## 📋 PDF Format Details

### Layout
- **Page Size:** A4
- **Orientation:** Portrait
- **Margins:** 15mm on all sides
- **Font:** Helvetica

### Colors
- **Header Background:** Blue (#2980b9)
- **Debit (Sales):** Red (#dc2626)
- **Credit (Payments):** Green (#2e7d32)
- **Alternate Row Background:** Light Gray (#f5f5f5)

### Structure
```
┌─────────────────────────────────────────────────────┐
│                  COMPANY NAME                       │
│              Company Address Line                   │
│         Phone: XXX | Email: XXX                     │
│                                                     │
│          CUSTOMER LEDGER REPORT                     │
├─────────────────────────────────────────────────────┤
│  Customer Details:            Period: XX to YY      │
│  Name: John Doe               Balance: ₹10,000 (Dr) │
│  Shop: ABC Store                                    │
│  Mobile: 9876543210                                 │
├─────────────────────────────────────────────────────┤
│ Date  │ Type │ Desc │ Debit │ Credit │ Bal │ Mode │
├───────┼──────┼──────┼───────┼────────┼─────┼──────┤
│ 01/01 │ SALE │ ...  │ 5000  │   -    │ 5K  │ CASH │
│ 02/01 │ PAY  │ ...  │  -    │  2000  │ 3K  │ UPI  │
│  ...  │ ...  │ ...  │  ...  │   ...  │ ... │ ...  │
├─────────────────────────────────────────────────────┤
│  Summary:                                           │
│  Total Debit (Sales): ₹50,000                      │
│  Total Credit (Payments): ₹40,000                  │
│  Net Balance: ₹10,000 (Dr)                         │
├─────────────────────────────────────────────────────┤
│ Page 1 of 2    Generated: DD/MM/YY    website.com  │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 UI Changes

### Download Button Location
- **Position:** Next to customer balance display
- **Icon:** Download icon (⬇)
- **Label:** "Download PDF"
- **State:** Disabled when no data available

### Button Appearance
```
┌─────────────────────────────────────────────────┐
│ Customer              Balance        Download   │
│ John Doe              ₹10,000 (Dr)   [📥 PDF]  │
│ ABC Store                                       │
└─────────────────────────────────────────────────┘
```

---

## 💻 Technical Implementation

### Libraries Used
- **jsPDF** - PDF generation (v2.5.1)
- **jspdf-autotable** - Table generation (v3.8.2)

### Company Configuration
Company details are imported from:
```javascript
import { getCompanyConfig } from '../../config/companyConfig';
```

### Company Config Structure
```javascript
{
  name: "SOHEL CHICKEN CENTRE",
  address: "Address Line 1, City, State, PIN",
  contactNumber: "+91-XXXXXXXXXX",
  email: "info@company.com",
  website: "www.company.com"
}
```

### PDF Generation Function
```javascript
const downloadLedgerPDF = () => {
  // Get company config
  const companyConfig = getCompanyConfig();
  
  // Create PDF document
  const doc = new jsPDF();
  
  // Add company header
  // Add customer details
  // Add transaction table
  // Add summary
  // Add footer
  
  // Download
  doc.save(`Ledger_${customerName}_${date}.pdf`);
}
```

---

## 📁 Files Modified

### Updated:
- `/app/src/components/ledger/CustomerLedgerView.jsx`
  - Added imports: jsPDF, jspdf-autotable, DownloadIcon, companyConfig
  - Added `downloadLedgerPDF()` function
  - Added Download PDF button to UI
  - Updated grid layout for button placement

---

## 🚀 Usage

### For Users

1. **Navigate to Ledger:**
   - Click "Ledger" in navbar
   - Select a customer
   - View transactions

2. **Apply Filters (Optional):**
   - Select date range
   - Click "Apply Filter"

3. **Download PDF:**
   - Click "Download PDF" button
   - PDF will be generated and downloaded
   - File name format: `Ledger_CustomerName_YYYY-MM-DD.pdf`

### PDF Features
- ✅ Professional format with company branding
- ✅ Complete transaction history
- ✅ Color-coded for easy reading
- ✅ Automatic page breaks for large data
- ✅ Page numbers on every page
- ✅ Summary with totals
- ✅ Timestamp of generation

---

## 🎯 PDF Content Details

### Header Section
- Company name (18pt, bold, centered)
- Address (10pt, centered)
- Contact details (9pt, centered)
- Horizontal line separator

### Customer Details Section
- Left side:
  - Customer name
  - Shop name
  - Mobile number
  
- Right side:
  - Report period
  - Current balance (color-coded)

### Transaction Table
**Columns:**
1. Date (22mm width)
2. Type (25mm) - SALE, PAYMENT, etc.
3. Description (45mm) - Transaction details
4. Debit (25mm) - Sales amounts (right-aligned)
5. Credit (25mm) - Payment amounts (right-aligned)
6. Balance (28mm) - Running balance (bold, right-aligned)
7. Mode (20mm) - Payment mode

**Styling:**
- Header: Blue background, white text
- Alternate rows: Light gray background
- Grid lines for clarity
- Auto-wrap for long descriptions

### Summary Section
- Total Debit (all sales)
- Total Credit (all payments)
- Net Balance (bold, color-coded)

### Footer Section
- Left: Generation timestamp
- Center: Page numbers
- Right: Company website

---

## 🧪 Testing

### Test Scenarios

1. **Basic Download**
   - Select customer
   - Click Download PDF
   - Verify PDF opens correctly
   - Check all sections present

2. **Date Filter**
   - Apply date range filter
   - Download PDF
   - Verify period shown correctly
   - Check only filtered transactions included

3. **Large Data**
   - Select customer with many transactions
   - Download PDF
   - Verify multiple pages generated
   - Check page numbers correct

4. **No Data**
   - Select customer with no transactions
   - Download button should be disabled

5. **Different Balances**
   - Customer with debit balance → Red color
   - Customer with credit balance → Green color
   - Customer with zero balance → Black color

---

## 📊 Sample PDF Output

### File Name Examples
```
Ledger_John_Doe_2024-01-21.pdf
Ledger_ABC_Store_2024-01-21.pdf
```

### Company Header Example
```
         SOHEL CHICKEN CENTRE
    Shop No. 5, Market Road, City
  Phone: +91-1234567890 | Email: info@scc.com
_____________________________________________

      CUSTOMER LEDGER REPORT
```

### Transaction Table Example
```
Date       Type     Description      Debit    Credit   Balance    Mode
------------------------------------------------------------------------
20/01/24   SALE     100 birds, 50kg  ₹9,090      -     ₹9,090 Dr  CASH
21/01/24   PAYMENT  Payment received    -    ₹5,000   ₹4,090 Dr  UPI
22/01/24   SALE     80 birds, 40kg   ₹7,200      -    ₹11,290 Dr  CASH
```

---

## 💡 Features Breakdown

### Automatic Calculations
- ✅ Running balance calculation
- ✅ Total debit sum
- ✅ Total credit sum
- ✅ Net balance

### Professional Formatting
- ✅ Currency formatting (₹ symbol, thousands separator)
- ✅ Date formatting (DD/MM/YYYY)
- ✅ Debit/Credit indicators (Dr/Cr)
- ✅ Color coding for amounts

### User-Friendly
- ✅ Clear section headers
- ✅ Easy-to-read table
- ✅ Summary for quick overview
- ✅ Professional appearance

### Technical Excellence
- ✅ Responsive PDF generation
- ✅ Handles large datasets
- ✅ Automatic page breaks
- ✅ Consistent formatting across pages

---

## 🔧 Configuration

### Customize Company Details
Edit `/app/src/config/companyConfig.js`:

```javascript
export const getCompanyConfig = () => ({
  name: "YOUR COMPANY NAME",
  address: "Your Address",
  contactNumber: "+91-XXXXXXXXXX",
  email: "your@email.com",
  website: "www.yourwebsite.com"
});
```

### Customize PDF Colors
In `downloadLedgerPDF()` function:

```javascript
// Header color
headStyles: { fillColor: [41, 128, 185] } // Blue

// Change to green: [46, 125, 50]
// Change to red: [220, 38, 38]
```

---

## 📋 Checklist

- [x] jsPDF installed and imported
- [x] jspdf-autotable installed and imported
- [x] Company config imported
- [x] Download button added to UI
- [x] PDF generation function implemented
- [x] Company header with logo space
- [x] Customer details section
- [x] Transaction table with proper columns
- [x] Summary section with totals
- [x] Footer with page numbers
- [x] Color coding for balances
- [x] Date and currency formatting
- [x] File naming convention
- [x] Error handling
- [x] Disabled state for no data

---

## 🎉 Summary

✅ **PDF Download** button added to Customer Ledger view  
✅ **Professional format** with company branding  
✅ **Complete transaction history** in table format  
✅ **Color-coded** for easy reading  
✅ **Summary section** with totals  
✅ **Multi-page support** for large datasets  
✅ **Company details** from config file  
✅ **Automatic calculations** and formatting  

**File Ready:** `/app/src/components/ledger/CustomerLedgerView.jsx`  
**Status:** ✅ Implemented and ready to test

---

**Professional ledger reports at your fingertips! 📄**
