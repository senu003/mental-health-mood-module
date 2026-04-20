# Database-Driven Lab Report Analysis System - Implementation Guide

## Overview

The system has been upgraded to be **fully database-driven**. You can now:
- ✅ Add, edit, delete biomarkers without code changes
- ✅ Dynamically detect ANY biomarker from lab reports
- ✅ Manage weights, thresholds, and recommendations via API
- ✅ Build an admin panel for non-technical users

---

## Part 1: Database Setup

### 1.1 New Database Model: `Biomarker`

Located in: `models/biomarker.js`

```javascript
{
  name: String,                      // Canonical name (e.g., "Vitamin D")
  aliases: [String],                 // Alternative names for extraction
  unit: String,                      // ng/ml, mIU/L, pg/ml, etc.
  minValue: Number,                  // Lower reference range
  maxValue: Number,                  // Upper reference range
  weight: Number,                    // Importance for health score (0-1)
  recommendationsLow: [String],      // Actions when value < min
  recommendationsHigh: [String],     // Actions when value > max
  recommendationsNormal: [String],   // Actions when value in range
  messageNotFound: String,           // Message if not extracted
  isActive: Boolean,                 // Enable/disable biomarker
  description: String,               // Admin reference
  createdAt: Date,
  updatedAt: Date
}
```

### 1.2 Seed Initial Biomarkers

```bash
node scripts/seedBiomarkers.js
```

This creates default biomarkers:
- Vitamin D
- TSH
- Vitamin B12

---

## Part 2: API Routes

### 2.1 Add routes to `server.js`

```javascript
const biomarkerRoutes = require('./routes/biomarkerRoutes');
app.use('/api/admin/biomarkers', biomarkerRoutes);
```

### 2.2 Available Endpoints

#### GET all biomarkers
```
GET /api/admin/biomarkers
Response: { biomarkers: [...] }
```

#### GET single biomarker
```
GET /api/admin/biomarkers/:id
Response: { biomarker: {...} }
```

#### CREATE biomarker
```
POST /api/admin/biomarkers
Body: {
  name: "Hemoglobin",
  aliases: ["hemoglobin", "hgb", "hb"],
  unit: "g/dL",
  minValue: 12,
  maxValue: 17,
  weight: 0.33,
  recommendationsLow: ["Increase iron intake", "Take iron supplements"],
  recommendationsHigh: ["Reduce iron intake", "Stay hydrated"],
  recommendationsNormal: ["Maintain current diet"],
  messageNotFound: "Hemoglobin not found in report",
  description: "Oxygen-carrying protein in red blood cells"
}
Response: { biomarker: {...} }
```

#### UPDATE biomarker
```
PUT /api/admin/biomarkers/:id
Body: { weight: 0.4, maxValue: 18, ... }
Response: { biomarker: {...} }
```

#### DELETE biomarker (soft)
```
DELETE /api/admin/biomarkers/:id
Response: { biomarker: {...} }  // isActive set to false
```

#### DELETE biomarker (permanent)
```
DELETE /api/admin/biomarkers/:id/permanent
Response: {}
```

#### BULK UPDATE weights
```
POST /api/admin/biomarkers/weights/bulk-update
Body: {
  weightUpdates: [
    { biomarkerId: "id1", newWeight: 0.4 },
    { biomarkerId: "id2", newWeight: 0.35 }
  ]
}
Response: { updated: [...] }
```

---

## Part 3: Updated Analysis Service

### 3.1 New Service: `dynamicLabReportAnalysisService.js`

**Key Functions:**

```javascript
analyzeLabReportDynamic(text)
  // Main analysis function
  // Returns: { overallScore, confidence, markers, insights, summaryText, recommendations }

normalizeText(text)
  // Cleans OCR artifacts and normalizes whitespace

extractBiomarkerValue(text, config)
  // Smart extraction using multiple patterns
  // Returns: { value, confidence, matched_text }

calculateWeightedScore(markers)
  // Weighted average of detected markers only
  // Uses biomarker weights from database

generateCombinedInsights(markers)
  // Multi-marker interaction detection
  // Returns: [insight1, insight2, ...]

generateSummaryText(markers, score, confidence)
  // Human-readable 2-3 sentence summary
```

### 3.2 How It Works

1. **Load biomarkers from database** (queries all active ones)
2. **Normalize lab report text** (fix OCR artifacts)
3. **Extract all biomarkers** (using aliases from database)
4. **Calculate status** (low/normal/high based on reference ranges)
5. **Calculate scores** (dynamic scoring, only for detected markers)
6. **Generate insights** (multi-marker patterns)
7. **Create recommendations** (from database)

---

## Part 4: Integration with Lab Report Upload

### 4.1 Update `labReportController.js`

Replace the old hardcoded analysis with the new dynamic service:

```javascript
const { analyzeLabReportDynamic } = require('../services/dynamicLabReportAnalysisService');

exports.createLabReportAnalysis = async (req, res) => {
  try {
    const { extractedText } = req.body;
    
    // Use new dynamic service
    const analysis = await analyzeLabReportDynamic(extractedText);
    
    if (!analysis.success) {
      return sendErrorResponse(res, 400, analysis.error);
    }

    // Save to database
    const labReport = new LabReport({
      userId: req.user.id,
      extracts: analysis.markers,
      overallScore: analysis.overallScore,
      confidence: analysis.confidence,
      summary: analysis.summaryText,
      recommendations: analysis.recommendations,
    });

    await labReport.save();
    
    sendApiResponse(res, 201, { 
      report: labReport,
      insights: analysis.insights 
    }, 'Analysis complete');
  } catch (error) {
    sendErrorResponse(res, 500, 'Analysis failed', error);
  }
};
```

---

## Part 5: Output Format

The system returns standardized JSON:

```javascript
{
  success: true,
  overallScore: 75,           // 0-100
  confidence: 0.67,           // 0-1 (detected / total)
  markers: [
    {
      name: "Vitamin D",
      value: 45,
      unit: "ng/ml",
      status: "normal",       // low | normal | high | not-found
      explanation: "Your Vitamin D is normal."
    },
    ...
  ],
  insight: "Primary multi-marker insight goes here",
  insights: ["insight 1", "insight 2", ...],
  summaryText: "2-3 sentence human readable summary",
  recommendations: {
    immediateActions: ["action 1", "action 2"],
    dailyPractices: ["practice 1", "practice 2"]
  },
  detectedMarkers: 3,
  totalMarkers: 3
}
```

---

## Part 6: Admin Panel (Frontend)

Create admin pages for managing biomarkers:

### 6.1 Biomarkers List Page

```javascript
// pages/admin/BiomarkersPage.jsx
const [biomarkers, setBiomarkers] = useState([]);

useEffect(() => {
  fetch('/api/admin/biomarkers')
    .then(r => r.json())
    .then(d => setBiomarkers(d.biomarkers));
}, []);

return (
  <div>
    <h1>Manage Biomarkers</h1>
    <button onClick={() => goTo('/admin/biomarkers/new')}>+ Add Biomarker</button>
    
    <table>
      <tr>
        <th>Name</th>
        <th>Unit</th>
        <th>Min - Max</th>
        <th>Weight</th>
        <th>Actions</th>
      </tr>
      {biomarkers.map(b => (
        <tr key={b._id}>
          <td>{b.name}</td>
          <td>{b.unit}</td>
          <td>{b.minValue} - {b.maxValue}</td>
          <td>{b.weight}</td>
          <td>
            <button onClick={() => editBiomarker(b._id)}>Edit</button>
            <button onClick={() => deleteBiomarker(b._id)}>Delete</button>
          </td>
        </tr>
      ))}
    </table>
  </div>
);
```

### 6.2 Biomarker Edit Form

```javascript
// pages/admin/BiomarkerEditPage.jsx
const [form, setForm] = useState({
  name: '',
  aliases: [],
  unit: '',
  minValue: null,
  maxValue: null,
  weight: 0.33,
  recommendationsLow: [],
  recommendationsHigh: [],
  recommendationsNormal: [],
  messageNotFound: '',
  description: ''
});

const handleSave = async () => {
  const response = await fetch(`/api/admin/biomarkers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form)
  });
  
  if (response.ok) {
    alert('Biomarker updated!');
    navigate('/admin/biomarkers');
  }
};

return (
  <form>
    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
    {/* ... other fields ... */}
    <button onClick={handleSave}>Save</button>
  </form>
);
```

---

## Part 7: Testing

### 7.1 Test with cURL

```bash
# Get all biomarkers
curl http://localhost:5000/api/admin/biomarkers

# Create new biomarker
curl -X POST http://localhost:5000/api/admin/biomarkers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hemoglobin",
    "aliases": ["hemoglobin", "hgb"],
    "unit": "g/dL",
    "minValue": 12,
    "maxValue": 17,
    "weight": 0.33,
    "recommendationsLow": ["Increase iron", "Eat red meat"],
    "recommendationsHigh": ["Reduce iron"],
    "recommendationsNormal": ["Maintain diet"],
    "messageNotFound": "Not found",
    "description": "Blood oxygen carrier"
  }'

# Update biomarker
curl -X PUT http://localhost:5000/api/admin/biomarkers/:id \
  -H "Content-Type: application/json" \
  -d '{"weight": 0.4}'

# Delete biomarker
curl -X DELETE http://localhost:5000/api/admin/biomarkers/:id
```

### 7.2 Test Analysis

```bash
curl -X POST http://localhost:5000/api/lab-reports/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "extractedText": "Vitamin D: 45 ng/ml. TSH: 2.5 mIU/L. B12: 500 pg/ml."
  }'
```

---

## Part 8: Migration from Old System

If you have existing reports with hardcoded markers:

1. Keep the old `labReportAnalysisService.js` as fallback
2. Gradually migrate reports using new service
3. Point new uploads to `analyzeLabReportDynamic`
4. Query database instead of hardcoded `MARKER_CONFIG`

---

## Part 9: Benefits

✅ **No code changes needed** - Add/edit biomarkers via API  
✅ **Flexible extraction** - Supports any biomarker  
✅ **Admin-friendly** - Non-technical users can manage biomarkers  
✅ **Scalable** - Add 10 or 100 biomarkers  
✅ **Maintainable** - All logic in service layer  
✅ **Fair scoring** - Only detected markers counted  
✅ **Smart extraction** - Handles OCR variations  
✅ **Personalized** - Database-driven recommendations  

---

## Next Steps

1. ✅ Add routes to `server.js`
2. ✅ Run seed script: `node scripts/seedBiomarkers.js`
3. ✅ Update lab report controller to use new service
4. ✅ Build admin panel UI (optional but recommended)
5. ✅ Test with real lab reports
6. ✅ Deploy to production

---

**Troubleshooting:**

- **Biomarkers not found**: Check `isActive` flag in database
- **Scores too low**: Adjust weights in biomarker config
- **Extraction failing**: Add more aliases to biomarker
- **No database entry**: Run seed script first

Questions? Check the service file comments for detailed logic.
