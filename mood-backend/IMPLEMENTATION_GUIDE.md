# Lab Report Analysis Service - Implementation Guide

## Quick Reference

### Key Changes

#### 1. Dynamic Scoring
```javascript
// OLD (Fixed scores)
scoreStatus("normal")    // Always 100
scoreStatus("low")       // Always 55
scoreStatus("not-found") // Always 40

// NEW (Dynamic based on distance from range)
calculateMarkerScore(18, vitaminDConfig)  // Returns 30 (far from 20-50 range)
calculateMarkerScore(35, vitaminDConfig)  // Returns 100 (within range)
calculateMarkerScore(25, vitaminDConfig)  // Returns 100 (within range)
```

#### 2. Weighted Scoring
```javascript
// Configuration
const MARKER_WEIGHTS = {
  "Vitamin D": 0.25,
  TSH: 0.35,
  "Vitamin B12": 0.4,
};

// Calculation ignores missing markers
calculateWeightedScore(markers)
// Only includes markers where score !== null
// Only sums weights of detected markers
```

#### 3. Confidence Score
```javascript
// Before storing report
const detectedCount = markers.filter(m => m.status !== "not-found").length
const total = markers.length
const confidence = (detectedCount / total).toFixed(2)  // e.g., 0.67
```

#### 4. Personalized Recommendations
```javascript
// OLD (Generic)
{
  immediateActions: ["Share with clinician"],
  dailyPractices: ["Sleep schedule", "Meditation"]
}

// NEW (Per-marker specific)
{
  recommendations: [
    "Increase sunlight exposure and Vitamin D-rich food like fish, eggs...",
    "Consider Vitamin D supplementation with your provider...",
    "High TSH may indicate hypothyroidism - discuss symptoms...",
    "Share this report with your healthcare provider..."
  ]
}
```

---

## Usage Examples

### Example 1: Create & Analyze Report

```javascript
import { createLabReportAnalysis } from "./services/labReportService.js";

const report = await createLabReportAnalysis({
  userId: "user123",
  file: {
    path: "/uploads/lab-report.pdf",
    originalname: "lab-report.pdf",
    mimetype: "application/pdf",
  },
});

// Stored in database with new fields:
console.log(report.overallScore);  // e.g., 78
console.log(report.confidence);    // e.g., 0.67
console.log(report.markers[0].score); // e.g., 30
```

### Example 2: Send to Frontend

```javascript
// In controller
const report = await getLabReportDetail(reportId);
const clientReport = toClientReport(report);

// Response includes new fields
{
  overallScore: 78,
  confidence: 0.67,  // NEW
  markers: [
    { name: "Vitamin D", value: 18, status: "low", score: 30 },
    // score is NEW dynamic score
  ],
  recommendations: {
    immediateActions: [
      "Increase sunlight exposure...",
      "Consider Vitamin D supplementation..."
    ],
    dailyPractices: []
  }
}
```

### Example 3: Access Detailed Markers

```javascript
// Full marker details still available
report.markerDetails.forEach(marker => {
  console.log(marker.name);        // "Vitamin D"
  console.log(marker.value);       // 18
  console.log(marker.status);      // "low"
  console.log(marker.score);       // 30 (dynamic)
  console.log(marker.explanation); // User-friendly text
  console.log(marker.confidence);  // "medium" or "high" or "low"
  console.log(marker.reviewNote);  // Special OCR warnings if any
});
```

---

## Database Queries

### Retrieve with Confidence Score

```javascript
// Get single report with all new fields
const report = await LabReport.findById(reportId).lean();
console.log(report.confidence);  // Now available

// Get history
const reports = await LabReport.find({ userId })
  .select("overallScore confidence markers summary")
  .sort({ createdAt: -1 })
  .lean();
```

### Filter by Confidence

```javascript
// Reports with good data completeness
const highConfidenceReports = await LabReport.find({
  userId,
  confidence: { $gte: 0.67 }  // 2 of 3 markers or more
});
```

### Filter by Score

```javascript
// Reports with low overall health scores
const lowScoreReports = await LabReport.find({
  userId,
  overallScore: { $lt: 60 }
});
```

---

## Response Format Walkthrough

### Structure
```javascript
{
  // NEW FIELDS
  overallScore: 78,        // Weighted avg (0-100)
  confidence: 0.67,        // Detection completeness (0-1)
  
  // Simplified markers
  markers: [
    {
      name: "Vitamin D",
      value: 18,
      status: "low",
      score: 30            // NEW: Dynamic score
    }
  ],
  
  // NEW FORMAT (Array)
  recommendations: [
    "Increase sunlight exposure...",
    "Consider supplementation...",
    "Share report with provider..."
  ],
  
  // FOR BACKWARD COMPATIBILITY
  summary: string,
  markerDetails: [         // Full marker objects
    {
      name, value, status,
      score,                // NEW
      confidence,           // OCR confidence
      explanation,
      reviewNote
    }
  ]
}
```

---

## Scoring Detail Examples

### Example: Vitamin D
```
Normal range: 20-50
Range size: 30

Patient value: 18
Distance from boundary: 20 - 18 = 2
Percent: (2 / 30) × 100 = 6.7% ← Score = 75

Patient value: 15
Distance: 20 - 15 = 5
Percent: (5 / 30) × 100 = 16.7% ← Score = 50

Patient value: 10
Distance: 20 - 10 = 10
Percent: (10 / 30) × 100 = 33.3% ← Score = 30
```

### Example: Weighted Calculation
```
Markers detected: Vitamin D (score 30), TSH (score 100)
Missing: Vitamin B12

Weights used: 0.25 + 0.35 = 0.6 (not 1.0!)

Weighted score = (30 × 0.25 + 100 × 0.35) / 0.6
               = (7.5 + 35) / 0.6
               = 42.5 / 0.6
               = 70.8 ≈ 71
```

---

## Testing the Service

### Unit Test Example
```javascript
import { parseAndAnalyzeMarkers } from "./labReportAnalysisService.js";

const testText = `
  Vitamin D: 18 ng/ml
  TSH: 2.5 mIU/L
`;

const result = parseAndAnalyzeMarkers(testText);

console.assert(result.overallScore === 91, "Score should be ~91");
console.assert(result.confidence === 1.0, "Confidence should be 1.0");
console.assert(result.markers[0].score === 30, "D12 score should be 30");
console.assert(result.recommendations.length > 0, "Should have recommendations");
console.assert(
  result.recommendations[0].includes("sunlight"),
  "Should recommend sunlight"
);
```

### Integration Test
```javascript
import { createLabReportAnalysis, toClientReport } 
  from "./services/labReportService.js";

const mockFile = {
  path: "./test-report.pdf",
  originalname: "test.pdf",
  mimetype: "application/pdf",
};

const report = await createLabReportAnalysis({
  userId: "test-user",
  file: mockFile,
});

const clientReport = toClientReport(report);

// Verify new fields
console.assert(clientReport.confidence !== undefined, "Should have confidence");
console.assert(clientReport.overallScore >= 0, "Score should be valid");
console.assert(Array.isArray(clientReport.recommendations?.immediateActions), 
  "Should have recommendation actions");
```

---

## Frontend Integration

### Display Confidence
```jsx
// React component example
function ReportCard({ report }) {
  return (
    <div>
      <h3>{report.originalFileName}</h3>
      <p>Score: {report.overallScore}/100</p>
      
      {/* NEW: Show confidence */}
      <p>
        Data Completeness: {Math.round(report.confidence * 100)}%
        {report.confidence < 0.67 && <WarningIcon />}
      </p>
      
      {/* Show personalized recommendations */}
      <ul>
        {report.recommendations.immediateActions.map((rec, i) => (
          <li key={i}>{rec}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Progress Visualization
```jsx
// Confidence bar
<div className="confidence-bar">
  <div 
    className="confidence-fill"
    style={{ width: `${report.confidence * 100}%` }}
  />
</div>
<span>{Math.round(report.confidence * 100)}% Detected</span>

// Score gauge
<RadialProgress value={report.overallScore} max={100} />
```

---

## Maintenance & Monitoring

### Check for Low Confidence Reports
```javascript
// Cron job: Weekly report
const lowConfidence = await LabReport.find({
  confidence: { $lt: 0.67 },
  createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) }
}).count();

console.log(`Low confidence reports this week: ${lowConfidence}`);
```

### Average Metrics
```javascript
const stats = await LabReport.aggregate([
  {
    $group: {
      _id: null,
      avgScore: { $avg: "$overallScore" },
      avgConfidence: { $avg: "$confidence" },
      totalReports: { $sum: 1 }
    }
  }
]);

console.log(`Average score: ${stats[0].avgScore}`);
console.log(`Average confidence: ${stats[0].avgConfidence}`);
```

---

## Troubleshooting

### Issue: confidenceScore showing 0 or 1
**Cause**: Rounded by toFixed(2) before Number conversion.
**Solution**: Check if all 3 markers were tested. Missing OCR = lower confidence.

### Issue: Score lower than expected
**Cause**: Using weighted formula instead of simple average.
**Solution**: If marker is 100, others are low → weighted average will be lower.

### Issue: Recommendations are generic
**Cause**: No abnormal markers detected (all normal).
**Solution**: This is correct behavior - system returns maintenance recommendations.

---

## Version Notes

- **Version**: 2.0 (March 29, 2026)
- **Breaking Changes**: None
- **Database Migration**: No migration needed (new fields optional)
- **API Compatibility**: Full backward compatibility maintained
