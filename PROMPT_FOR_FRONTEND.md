# 📋 Prompt for Frontend Developer / AI Assistant

Copy and paste this prompt to add the Excel upload feature to your frontend:

---

## 🎯 Task: Add Excel Upload Button for Priority Actions

**Context:**
The backend now supports uploading Excel files to automatically create leads and generate priority actions. I need to add an upload button to the frontend.

**Requirements:**

1. **Add an Excel Upload Button** to the Priority Actions page or dashboard
2. **File Upload Functionality:**

   - Accept `.xlsx` and `.xls` files only
   - Maximum file size: 5MB
   - Validate file before upload
   - Show upload progress/loading state

3. **API Integration:**

   - **Endpoint:** `POST https://backoffice-forthandvale-backend.vercel.app/api/leads/upload-excel`
   - **Method:** POST
   - **Content-Type:** `multipart/form-data`
   - **Field Name:** `file`

4. **User Experience:**

   - Show loading spinner during upload
   - Display success message with results breakdown
   - Show error messages if upload fails
   - Auto-refresh priority actions list after successful upload

5. **Success Response Format:**

```json
{
  "success": true,
  "message": "Processed 15 leads from Excel file",
  "results": {
    "processed": 15,
    "leadsCreated": 12,
    "leadsUpdated": 3,
    "actionsCreated": 15,
    "priorityBreakdown": {
      "URGENT": 5,
      "HIGH": 7,
      "MEDIUM": 2,
      "LOW": 1
    },
    "errors": []
  }
}
```

6. **Design Preferences:**

   - Modern, clean button design
   - Option for drag-and-drop (nice to have)
   - Show detailed results after upload
   - Match existing UI design system

7. **Error Handling:**
   - Invalid file type
   - File too large
   - Network errors
   - Backend validation errors

**Example Excel File Format:**
The user will upload an Excel file with columns:

- Company
- Website
- Visitor Count (MW)
- LinkedIn Company
- Suggested Buyer Roles
- Example Contacts (LinkedIn)

**Expected Behavior:**

1. User clicks "Upload Excel" button
2. File picker opens
3. User selects Excel file
4. File uploads to backend
5. Backend processes file and creates priority actions
6. Success message shows: "Created 15 priority actions (5 urgent, 7 high, 2 medium, 1 low)"
7. Priority actions list refreshes automatically

**Location:**
Add this button to the Priority Actions page header, near the "Create Action" or "Filter" buttons.

**Tech Stack:**
[Specify your framework: React, Vue, Angular, etc.]

**Additional Notes:**

- The backend automatically calculates priority based on visitor count, contacts, and buyer roles
- No need to show the scoring algorithm to users
- Focus on simple, intuitive UI
- Reference file: `FRONTEND_INTEGRATION.md` has full React component examples

---

## 📝 Quick Implementation (React)

If using React, here's the minimal code:

```jsx
const ExcelUpload = () => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(
        'https://backoffice-forthandvale-backend.vercel.app/api/leads/upload-excel',
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert(
          `Success! Created ${data.results.actionsCreated} priority actions`
        );
        window.location.reload(); // Refresh the page
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleUpload}
        style={{ display: 'none' }}
        id="excel-upload"
        disabled={uploading}
      />
      <button onClick={() => document.getElementById('excel-upload').click()}>
        {uploading ? 'Uploading...' : '📊 Upload Excel'}
      </button>
    </>
  );
};
```

---

**Questions?** Check `FRONTEND_INTEGRATION.md` for complete component examples with drag-and-drop, error handling, and styling.
