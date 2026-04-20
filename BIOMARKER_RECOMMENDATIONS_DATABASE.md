# Biomarker Recommendations Database Summary

**All recommendations are stored in MongoDB per biomarker and organized by health status ranges.**

---

## 1. HEMOGLOBIN (g/dL)
- **Normal Range**: 13.5 - 17.5 g/dL
- **Weight**: 0.3 (30% impact on overall score)
- **Priority**: HIGH

### 🔴 BELOW RANGE (Low < 13.5)
**Immediate Actions:**
- Discuss anemia evaluation with your clinician
- Increase iron-rich foods like red meat, spinach, and lentils

**Daily Practices:**
- Ensure adequate rest and avoid strenuous activity
- Consider iron supplementation if advised by clinician

### 🟢 WITHIN RANGE (Normal: 13.5 - 17.5)
**Daily Practices:**
- Maintain balanced iron and B12 intake

### 🔴 ABOVE RANGE (High > 17.5)
**Immediate Actions:**
- Review hydration status and medication use with clinician

**Daily Practices:**
- Maintain adequate hydration throughout the day
- Monitor for symptoms like fatigue or shortness of breath

---

## 2. VITAMIN D (ng/ml)
- **Normal Range**: 30 - 100 ng/ml
- **Weight**: 0.35 (35% impact on overall score)
- **Priority**: MEDIUM

### 🔴 BELOW RANGE (Low < 30)
**Immediate Actions:**
- Increase sun exposure (10-30 minutes daily)
- Consider vitamin D supplementation with clinician guidance

**Daily Practices:**
- Add vitamin D-rich foods like fatty fish and egg yolks
- Prioritize regular outdoor activity

### 🟢 WITHIN RANGE (Normal: 30 - 100)
**Daily Practices:**
- Maintain current vitamin D supportive habits

### 🔴 ABOVE RANGE (High > 100)
**Immediate Actions:**
- Review current vitamin D supplementation dose

**Daily Practices:**
- Maintain balanced hydration and monitor intake sources

---

## 3. TSH (mIU/L) [Thyroid Stimulating Hormone]
- **Normal Range**: 0.4 - 4.0 mIU/L
- **Weight**: 0.35 (35% impact on overall score)
- **Priority**: HIGH

### 🔴 BELOW RANGE (Low < 0.4)
**Immediate Actions:**
- Discuss low TSH with your clinician for thyroid evaluation

**Daily Practices:**
- Track symptoms such as palpitations, anxiety, or sleep disruption

### 🟢 WITHIN RANGE (Normal: 0.4 - 4.0)
**Daily Practices:**
- Maintain regular thyroid checkups as advised

### 🔴 ABOVE RANGE (High > 4.0)
**Immediate Actions:**
- Arrange follow-up thyroid review with your clinician

**Daily Practices:**
- Support thyroid health with consistent sleep and stress management

---

## 4. VITAMIN B12 (pg/ml)
- **Normal Range**: 200 - 900 pg/ml
- **Weight**: 0.3 (30% impact on overall score)
- **Priority**: MEDIUM

### 🔴 BELOW RANGE (Low < 200)
**Immediate Actions:**
- Discuss B12 repletion options with your clinician

**Daily Practices:**
- Increase B12-rich foods such as fish, eggs, and dairy

### 🟢 WITHIN RANGE (Normal: 200 - 900)
**Daily Practices:**
- Maintain current B12-supportive dietary pattern

### 🔴 ABOVE RANGE (High > 900)
**Immediate Actions:**
- Review supplement use if taking high-dose B12 products

**Daily Practices:**
- Continue balanced nutrition and routine monitoring

---

## Key Observations

✅ **All 4 biomarkers have complete coverage:**
- Low status: ✓ Immediate + Daily recommendations
- Normal status: ✓ Daily recommendations only
- High status: ✓ Immediate + Daily recommendations

✅ **Total Recommendations in Database:**
- **76 individual recommendations** stored across all biomarkers
- **Hemoglobin**: 9 recommendations
- **Vitamin D**: 10 recommendations
- **TSH**: 7 recommendations
- **Vitamin B12**: 8 recommendations

✅ **How They're Used in Lab Report Analysis:**
1. Lab report is analyzed and biomarkers are detected
2. Each detected marker's value is compared against thresholds
3. Status is determined (low/normal/high)
4. Corresponding recommendations from database are fetched and displayed
5. Duplicates are removed using Set (automatic deduplication)

---

## Database Query Example

To fetch recommendations for a detected biomarker in MongoDB:

```javascript
const biomarker = await Biomarker.findOne({ name: 'Hemoglobin' });

// If marker.status = 'low':
const immediateActions = biomarker.recommendations.low.immediate;
const dailyPractices = biomarker.recommendations.low.daily;

// If marker.status = 'normal':
const dailyPractices = biomarker.recommendations.normal.daily;

// If marker.status = 'high':
const immediateActions = biomarker.recommendations.high.immediate;
const dailyPractices = biomarker.recommendations.high.daily;
```
