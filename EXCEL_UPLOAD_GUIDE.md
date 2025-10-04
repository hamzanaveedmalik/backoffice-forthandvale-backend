# Excel Upload Guide - Automated Priority Actions

## 📊 Overview

Upload an Excel file containing lead data, and the backend will automatically:

1. Parse the Excel file
2. Create or update leads in the database
3. Calculate priority scores based on visitor count, contacts, and buyer roles
4. Generate priority actions with appropriate urgency levels

---

## 🎯 API Endpoint

**URL:** `POST /api/leads/upload-excel`

**Content-Type:** `multipart/form-data`

**File Field Name:** `file`

**Accepted Formats:** `.xlsx`, `.xls`

**Max File Size:** 5MB

---

## 📋 Required Excel Columns

Your Excel file should have these columns (case-insensitive):

| Column Name                   | Description                                   | Example                                                                                |
| ----------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Company`                     | Company name                                  | Geiger (GeigerBTC)                                                                     |
| `Website`                     | Company website URL                           | https://www.btcgroup.co.uk                                                             |
| `Visitor Count (MW)`          | Number of website visits                      | 7                                                                                      |
| `LinkedIn Company`            | LinkedIn company page URL                     | https://uk.linkedin.com/company/geigeruk                                               |
| `Suggested Buyer Roles`       | Semicolon-separated roles                     | Head of Merchandise; Procurement Manager                                               |
| `Example Contacts (LinkedIn)` | Contact info (format: Name – URL, Name – URL) | Vicky Kinasz–https://linkedin.com/in/vicky, Frank Murphy–https://linkedin.com/in/frank |

---

## 🧮 Priority Scoring Algorithm

**Total Score: 0-100 points**

### 1. Visitor Count (40 points max)

- 7+ visits: **40 points** → URGENT
- 4-6 visits: **30 points** → HIGH
- 1-3 visits: **20 points** → MEDIUM
- 0 visits: **10 points** → LOW

### 2. Contact Information (30 points max)

- Has named contacts: **+15 points**
- Has LinkedIn company page: **+15 points**

### 3. Buyer Role Quality (20 points max)

- C-level (CEO, CFO, etc.): **+20 points**
- Head/Director roles: **+15 points**
- Manager roles: **+10 points**
- Other roles: **+5 points**

### 4. Company Information (10 points max)

- Has website: **+5 points**
- Has LinkedIn page: **+5 points**

---

## 📈 Priority Levels & Action Types

| Score Range | Priority   | Action Type       | Due Date |
| ----------- | ---------- | ----------------- | -------- |
| 80-100      | **URGENT** | FOLLOW_UP         | Today    |
| 60-79       | **HIGH**   | NEW_LEAD_RESPONSE | +2 days  |
| 40-59       | **MEDIUM** | FOLLOW_UP         | +5 days  |
| 20-39       | **LOW**    | FOLLOW_UP         | +7 days  |

---

## 🚀 How to Use

### Using cURL:

```bash
curl -X POST https://backoffice-forthandvale-backend.vercel.app/api/leads/upload-excel \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/leads.xlsx"
```

### Using Postman:

1. Create a new POST request
2. URL: `https://backoffice-forthandvale-backend.vercel.app/api/leads/upload-excel`
3. Go to "Body" tab
4. Select "form-data"
5. Add key: `file` (type: File)
6. Choose your Excel file
7. Click "Send"

### Using Frontend (JavaScript):

```javascript
const uploadExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    'https://backoffice-forthandvale-backend.vercel.app/api/leads/upload-excel',
    {
      method: 'POST',
      body: formData,
    }
  );

  const result = await response.json();
  console.log(result);
};

// In your React component:
<input
  type="file"
  accept=".xlsx,.xls"
  onChange={(e) => uploadExcel(e.target.files[0])}
/>;
```

---

## ✅ Success Response

```json
{
  "success": true,
  "message": "Processed 15 leads from Excel file",
  "results": {
    "processed": 15,
    "leadsCreated": 12,
    "leadsUpdated": 3,
    "actionsCreated": 15,
    "errors": [],
    "priorityBreakdown": {
      "URGENT": 5,
      "HIGH": 7,
      "MEDIUM": 2,
      "LOW": 1
    }
  }
}
```

---

## ❌ Error Response

```json
{
  "error": "Failed to parse Excel file",
  "details": "Invalid column headers"
}
```

---

## 💡 Tips

1. **Use the exact column names** from the template above
2. **Visitor count** can include "MW" suffix (e.g., "7 MW" or just "7")
3. **Contacts** should be formatted as: `Name1 – URL1, Name2 – URL2`
4. **Buyer roles** should be separated by semicolons
5. **Duplicate companies** will be updated, not duplicated
6. **Priority actions** are automatically created for ALL leads

---

## 🔍 What Happens Behind the Scenes

1. **File Upload** → Validates file type and size
2. **Parse Excel** → Extracts data from all rows
3. **For Each Lead:**
   - Check if company already exists
   - Create new lead OR update existing
   - Calculate priority score (0-100)
   - Determine priority level (URGENT/HIGH/MEDIUM/LOW)
   - Generate action title and description
   - Create priority action with due date
4. **Return Summary** → Shows what was processed

---

## 📞 Support

If priority actions don't appear on your frontend:

1. Check the API response for errors
2. Verify organization slug is 'default'
3. Check priority actions endpoint: `GET /api/priority-actions`
4. Ensure frontend is fetching from the correct endpoint

---

**Endpoint:** `POST /api/leads/upload-excel`

**Production URL:** `https://backoffice-forthandvale-backend.vercel.app/api/leads/upload-excel`
