# Lab Report Extraction Patterns - v3.0 Reference Guide

## Supported Input Formats

### Basic Formats
```
Format 1: "Vitamin D: 35"
Format 2: "Vitamin D = 35"
Format 3: "Vitamin D - 35"
Format 4: "Vitamin D 35"
Format 5: "Vitamin D  35  ng/ml"
```

### With Units
```
Format 1: "Vitamin D: 35 ng/ml"
Format 2: "Vitamin D = 35 ng/mL"
Format 3: "D 35 ng/ml"
Format 4: "Vit D: 35 ng/ml"
Format 5: "25-OH Vitamin D = 35 ng/ml"
```

### Abbreviated Forms
```
Format 1: "Vit D 35"
Format 2: "VitD 35"
Format 3: "25(OH)D 35"
Format 4: "D 35"
```

### Multiline Formats
```
Format 1:
"Vitamin D
35 ng/ml"

Format 2:
"Vitamin D:
35"

Format 3:
"Test: Vitamin D
Value: 35 ng/ml"
```

### Noisy/OCR Variations
```
Format 1: "Vitamin  D:  35  ng/ml" (extra spaces)
Format 2: "VitaminD:35" (no space)
Format 3: "vltamin d: 35" (OCR error in alias - NOT handled)
Format 4: "Vitamin D 35,00" (European decimal - handled as 35)
Format 5: "Vitamin D (35 ng/ml)" (parentheses - handled)
```

---

## Alias Variations per Marker

### Vitamin D - All Supported Aliases
```javascript
"vitamin d"         // Standard
"vit d"             // Common abbreviation
"vitamin d 25 oh"   // Full technical name
"25-oh vitamin d"   // Technical with hyphen
"25 hydroxy vitamin d" // Fully spelled out
"25(oh)d"           // Compact technical
"25-oh-d"           // Hyphenated compact
```

### TSH - All Supported Aliases
```javascript
"tsh"                       // Standard
"thyroid stimulating hormone" // Full name
"t.s.h"                    // Dotted abbreviation
"thyroid hormone"          // Common name
"tsh level"               // With descriptor
```

### Vitamin B12 - All Supported Aliases
```javascript
"vitamin b12"       // Standard
"b12"               // Common abbreviation
"cobalamin"         // Chemical name
"cyanocobalamin"    // Specific form
"methylcobalamin"   // Alternative form
"b-12"              // Hyphenated
"vitb12"            // Compact
```

---

## Extraction Process Flow

```
1. Input: Raw OCR text
   ↓
2. Normalize: Clean case, whitespace, quotes
   ↓
3. For each biomarker:
   a. Try each alias with flexible patterns
   b. Apply multiple regex patterns per alias
      - Pattern 1: "alias[: = -]number"
      - Pattern 2: "alias spaces number"
      - Pattern 3: "alias\nspaces number" (multiline)
   c. Extract first matching valid number
   ↓
4. Evaluate confidence: high/medium/low
   ↓
5. Return value, status, confidence
```

---

## Real-World Test Cases

### Test Case 1: Standard Format
```
Input: "Vitamin D: 35 ng/ml\nTSH: 2.1 mIU/L\nB12: 450 pg/ml"

Expected Output:
- Vitamin D: value=35, status=normal, confidence=high
- TSH: value=2.1, status=normal, confidence=high
- B12: value=450, status=normal, confidence=high
```

### Test Case 2: Abbreviated Format
```
Input: "Vit D 35\nT.S.H 2.1\nB12 450"

Expected Output:
- Vitamin D: value=35, status=normal, confidence=high
- TSH: value=2.1, status=normal, confidence=high
- B12: value=450, status=normal, confidence=high
```

### Test Case 3: Multiline Format
```
Input: "Vitamin D\n35 ng/ml\n\nTSH\n2.1\n\nB12\n450 pg/ml"

Expected Output:
- Vitamin D: value=35, status=normal, confidence=high
- TSH: value=2.1, status=normal, confidence=high
- B12: value=450, status=normal, confidence=high
```

### Test Case 4: Mixed Format
```
Input: "VITAMIN D = 35 ng/ml | TSH: 2.1 mIU/L | Vitamin B12: 450"

Expected Output:
- Vitamin D: value=35, status=normal, confidence=high
- TSH: value=2.1, status=normal, confidence=high
- B12: value=450, status=normal, confidence=high
```

### Test Case 5: Noisy OCR
```
Input: "Vitamin  D:  35  ng / ml\nTSH\n2.1  miu/l\nVitamin B12 = 450 pg / ml"

Expected Output:
- Vitamin D: value=35, status=normal, confidence=high
- TSH: value=2.1, status=normal, confidence=medium (multiline)
- B12: value=450, status=normal, confidence=high
```

### Test Case 6: Low Vitamin D
```
Input: "Vitamin D Level: 15 ng/ml"

Expected Output:
- Vitamin D: value=15, status=low, confidence=high
- Recommendation: "Sunlight Exposure: Aim for 10-30 minutes..."
```

### Test Case 7: High TSH
```
Input: "TSH: 5.5 mIU/L"

Expected Output:
- TSH: value=5.5, status=high, confidence=high
- Insight: "High TSH may indicate hypothyroidism..."
```

### Test Case 8: Missing Marker
```
Input: "Vitamin D: 35 ng/ml\nTSH: 2.1 mIU/L"
(No B12 value)

Expected Output:
- Vitamin D: value=35, status=normal, confidence=high
- TSH: value=2.1, status=normal, confidence=high
- B12: value=null, status=not-found, confidence=low
- Overall Score: Still calculated from D+TSH (not penalized)
- Confidence: 0.67 (2 of 3 detected)
```

### Test Case 9: Decimal Shift Detection (Medium Confidence)
```
Input: "TSH: 25"  // Likely OCR error (should be 2.5)

Expected Output:
- TSH: value=25, status=high, confidence=medium
- Note: Possible decimal-shift issue detected
```

### Test Case 10: All Missing
```
Input: "Patient health report" (no biomarker values)

Expected Output:
- All markers: status=not-found, confidence=low
- Overall Score: 0
- Confidence: 0.0
- Summary: "No biomarkers could be reliably detected..."
```

---

## Confidence Scoring Logic

### High Confidence
✅ When:
- Value extracted successfully
- Alias clearly found in text
- Value within reasonable range
- No OCR warnings triggered

**Example**: `"Vitamin D: 35 ng/ml"` → confidence=high

### Medium Confidence
⚠️ When:
- Value extracted but potential OCR issue
- Fuzzy matching used (multiline)
- Value slightly unusual but plausible
- Format was unusual but valid

**Examples**:
- `"TSH: 25"` (likely should be 2.5) → confidence=medium
- `"Vitamin D\n35"` (multiline extraction) → confidence=medium
- `"B12 value unclear: 450"` (ambiguous) → confidence=medium

### Low Confidence
❌ When:
- Value not detected
- Marker not found
- Multiple extraction failures

**Examples**:
- `"B12 results pending"` → confidence=low
- `"Vitamin P: 35"` (invalid marker) → confidence=low

---

## Extraction Failure Modes & Recovery

### Failure Mode 1: OCR Mutates Alias
```
Input: "Vitamim D: 35"  // "Vitamin" misspelled
Issue: Alias "vitamin d" won't match "vitamim d"
Recovery: User should upload clearer document
```

### Failure Mode 2: Value in Wrong Position
```
Input: "Patient X, 35 ng/ml, Vitamin D test"
Issue: Number appears before alias
Recovery: Improved pattern matching (attempted)
```

### Failure Mode 3: Multiple Values
```
Input: "Vitamin D: 35\nPrevious: 20"
Recovery: Takes first match (most likely current value)
```

### Failure Mode 4: Unit Confusion
```
Input: "Vitamin D: 140" (possibly nmol/L, not ng/ml)
Issue: No unit conversion performed
Recovery: Flags as potentially unusual (confidence=medium)
```

---

## Configuration: Reference Ranges

Current thresholds (in ng/ml for D, mIU/L for TSH, pg/ml for B12):

```javascript
Vitamin D:
  Low:    < 30
  Normal: 30-100
  High:   > 100

TSH:
  Low:    < 0.4
  Normal: 0.4-4.0
  High:   > 4.0

B12:
  Low:    < 200
  Normal: 200-900
  High:   > 900
```

### To Adjust Ranges
Edit MARKER_CONFIG in labReportAnalysisService.js:
```javascript
MARKER_CONFIG["Vitamin D"] = {
  normalMin: 30,   // Change from 30
  normalMax: 100,  // Change from 100
  // ... rest of config
}
```

---

## Pattern Breakdown

### Pattern 1: Standard Format
```
Regex: "${flexible}[:\\s=\\-]+\\s*(\\d+(?:\\.\\d+)?)"
Matches: "Vitamin D: 35", "Vitamin D = 35", "Vitamin D-35"
```

### Pattern 2: Flexible Spacing
```
Regex: "${flexible}\\s*[\\-\\s=]*\\s*(\\d+(?:\\.\\d+)?)"
Matches: "VitaminD 35", "Vitamin  D  35", "D    35"
```

### Pattern 3: Multiline
```
Regex: "${flexible}[:\\s=\\-]*\\n\\s*(\\d+(?:\\.\\d+)?)"
Matches: "Vitamin D\n35", "Vitamin D:\n  35"
```

---

## Debugging Extraction

### Enable Debug Logs
```javascript
const DEBUG_MODE = true;  // In labReportAnalysisService.js
```

### Check Debug Output
```
[LAB-REPORT] Found Vitamin D with alias "vitamin d": 35
[LAB-REPORT] TSH: value=2.1, status=normal, confidence=high
[LAB-REPORT] Vitamin B12: value=null, status=not-found, confidence=low
```

### Inspect debugInfo in Response
```javascript
response.debugInfo = {
  rawTextLength: 1523,
  extractedMarkers: 2,
  totalMarkers: 3,
  lowConfidenceMarkers: ["B12"],
  extractionDetails: [
    { name: "Vitamin D", value: 35, confidence: "high" },
    { name: "TSH", value: 2.1, confidence: "high" },
    { name: "Vitamin B12", value: null, confidence: "low" }
  ]
}
```

---

## Performance Optimization

### Extraction Speed
- Current: ~5-15ms per report
- Pattern compilation: ~1-2ms
- Multiple alias attempts: ~2-5ms each

### To Speed Up
1. Cache compiled regex patterns (pre-compile)
2. Reduce number of alias patterns
3. Try most common aliases first

### To Improve Accuracy
1. Add more aliases (increases time slightly)
2. Add unit-aware patterns
3. Implement value validation heuristics

---

## Future Improvements

### Planned
1. **Fuzzy matching** for misspelled aliases
2. **Unit conversion** (nmol/L ↔ ng/ml)
3. **Context detection** (test name, date, reference range)
4. **Statistical filtering** (outlier detection)

### Possible
1. **Machine learning** for OCR error detection
2. **Language models** for natural text extraction
3. **Template recognition** for specific lab formats
4. **Historical trending** (compare to previous values)

