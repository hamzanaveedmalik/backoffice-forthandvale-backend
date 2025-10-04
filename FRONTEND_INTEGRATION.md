# Frontend Integration Guide - Excel Upload Button

This guide provides React components and code to add an Excel upload feature to your frontend.

---

## 🎨 Option 1: Simple Upload Button

### Basic Implementation

```jsx
import React, { useState } from 'react';

const ExcelUploadButton = () => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        'https://backoffice-forthandvale-backend.vercel.app/api/leads/upload-excel',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        alert(`Success! Processed ${data.results.processed} leads and created ${data.results.actionsCreated} priority actions!`);
        // Refresh priority actions list
        window.location.reload(); // Or call your data refresh function
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  return (
    <div className="excel-upload-container">
      <label htmlFor="excel-upload" className="upload-button">
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => document.getElementById('excel-upload').click()}
          disabled={uploading}
          className="btn btn-primary"
        >
          {uploading ? '⏳ Uploading...' : '📊 Upload Excel File'}
        </button>
      </label>

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="alert alert-success">
          ✅ Success! Created {result.results.actionsCreated} priority actions
          <ul>
            <li>🔴 Urgent: {result.results.priorityBreakdown.URGENT}</li>
            <li>🟠 High: {result.results.priorityBreakdown.HIGH}</li>
            <li>🟡 Medium: {result.results.priorityBreakdown.MEDIUM}</li>
            <li>🟢 Low: {result.results.priorityBreakdown.LOW}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExcelUploadButton;
```

---

## 🎯 Option 2: Drag & Drop Upload Component

### Advanced Implementation with Drag & Drop

```jsx
import React, { useState, useRef } from 'react';

const ExcelUploadDropzone = () => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        'https://backoffice-forthandvale-backend.vercel.app/api/leads/upload-excel',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        // Optionally refresh your priority actions list here
        // refreshPriorityActions();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="excel-upload-container">
      <form
        onDragEnter={handleDrag}
        onSubmit={(e) => e.preventDefault()}
        className="upload-form"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`dropzone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
          style={{
            border: '2px dashed #ccc',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: dragActive ? '#e8f5e9' : '#fafafa',
          }}
          onClick={onButtonClick}
        >
          {uploading ? (
            <>
              <div className="spinner">⏳</div>
              <p>Uploading and processing...</p>
            </>
          ) : (
            <>
              <div className="icon" style={{ fontSize: '48px', marginBottom: '16px' }}>
                📊
              </div>
              <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                {dragActive ? 'Drop your Excel file here' : 'Upload Excel File'}
              </p>
              <p style={{ color: '#666', marginBottom: '16px' }}>
                Drag and drop or click to browse
              </p>
              <p style={{ fontSize: '12px', color: '#999' }}>
                Supported formats: .xlsx, .xls (Max 5MB)
              </p>
            </>
          )}
        </div>
      </form>

      {error && (
        <div className="alert alert-error" style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          color: '#c62828',
        }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="alert alert-success" style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          color: '#2e7d32',
        }}>
          <h3 style={{ marginTop: 0 }}>✅ Upload Successful!</h3>
          <p><strong>Processed:</strong> {result.results.processed} leads</p>
          <p><strong>Leads Created:</strong> {result.results.leadsCreated}</p>
          <p><strong>Leads Updated:</strong> {result.results.leadsUpdated}</p>
          <p><strong>Priority Actions Created:</strong> {result.results.actionsCreated}</p>
          
          <div style={{ marginTop: '16px' }}>
            <strong>Priority Breakdown:</strong>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px' }}>
              <li>🔴 Urgent: {result.results.priorityBreakdown.URGENT}</li>
              <li>🟠 High: {result.results.priorityBreakdown.HIGH}</li>
              <li>🟡 Medium: {result.results.priorityBreakdown.MEDIUM}</li>
              <li>🟢 Low: {result.results.priorityBreakdown.LOW}</li>
            </ul>
          </div>

          <button
            onClick={() => {
              setResult(null);
              window.location.reload(); // Or refresh your priority actions
            }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            View Priority Actions
          </button>
        </div>
      )}
    </div>
  );
};

export default ExcelUploadDropzone;
```

---

## 📍 Where to Add the Component

### In Your Priority Actions Page:

```jsx
import ExcelUploadButton from './components/ExcelUploadButton';
// or
import ExcelUploadDropzone from './components/ExcelUploadDropzone';

const PriorityActionsPage = () => {
  return (
    <div className="priority-actions-page">
      <div className="page-header">
        <h1>Priority Actions</h1>
        <ExcelUploadButton />
        {/* or <ExcelUploadDropzone /> */}
      </div>

      {/* Your existing priority actions list */}
      <PriorityActionsList />
    </div>
  );
};
```

---

## 🎨 CSS Styles (Optional)

```css
/* Excel Upload Styles */
.excel-upload-container {
  margin: 20px 0;
}

.upload-button button {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transition: transform 0.2s, box-shadow 0.2s;
}

.upload-button button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.upload-button button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dropzone {
  transition: all 0.3s ease;
}

.dropzone.drag-active {
  border-color: #4caf50 !important;
  background-color: #e8f5e9 !important;
}

.dropzone.uploading {
  pointer-events: none;
  opacity: 0.7;
}

.alert {
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  animation: slideIn 0.3s ease;
}

.alert-error {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ef5350;
}

.alert-success {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #66bb6a;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 🔄 Integration with Existing State Management

### If using React Context or Redux:

```jsx
// After successful upload, dispatch action to refresh priority actions
const handleFileUpload = async (file) => {
  // ... upload code ...
  
  if (response.ok) {
    setResult(data);
    
    // Refresh priority actions
    dispatch(fetchPriorityActions()); // Redux
    // or
    refreshPriorityActions(); // Context API
    // or
    queryClient.invalidateQueries(['priorityActions']); // React Query
  }
};
```

---

## 🧪 Testing the Upload

1. **Test with your Excel file:**
   - Make sure columns match: Company, Website, Visitor Count (MW), etc.
   - Upload via the button
   - Check browser console for errors

2. **Verify priority actions appear:**
   - Navigate to priority actions page
   - Verify new actions are visible
   - Check priority levels match visitor counts

3. **Test error handling:**
   - Try uploading wrong file type
   - Try file > 5MB
   - Test with empty Excel file

---

## 📱 Mobile Responsive Version

```jsx
const ResponsiveExcelUpload = () => {
  // ... same logic as above ...

  return (
    <div className="excel-upload-responsive">
      {/* Mobile: Show compact button */}
      <div className="mobile-only">
        <button onClick={onButtonClick} className="btn-mobile">
          📊 Upload Leads
        </button>
      </div>

      {/* Desktop: Show full dropzone */}
      <div className="desktop-only">
        <ExcelUploadDropzone />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};
```

---

## 🔗 API Endpoint Details

**Endpoint:** `POST /api/leads/upload-excel`

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- Accepted: `.xlsx`, `.xls`
- Max size: 5MB

**Response:**
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

---

## ✨ Quick Start

1. Copy one of the components above
2. Add to your priority actions page
3. Style to match your design
4. Test with your Excel file
5. Watch priority actions auto-populate! 🎉

---

## 💡 Pro Tips

- Show a success notification after upload
- Auto-refresh priority actions list after upload
- Add loading spinner during processing
- Show detailed breakdown of created actions
- Allow re-upload if errors occur
- Add "Download Template" button for correct format

---

**Need help?** Check `EXCEL_UPLOAD_GUIDE.md` for backend details and scoring algorithm.

