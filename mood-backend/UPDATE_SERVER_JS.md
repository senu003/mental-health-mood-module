# How to Update server.js

Your current `server.js` is already set up with routes for moods and lab reports. Here's how to add the biomarker admin routes:

## Current State

Your `server.js` probably has these routes:

```javascript
// Existing routes
const moodRoutes = require('./routes/moodRoutes');
const moodFixRoutes = require('./routes/moodFixRoutes');
const labReportRoutes = require('./routes/labReportRoutes');

app.use('/api/moods', moodRoutes);
app.use('/api/mood-fixes', moodFixRoutes);
app.use('/api/lab-reports', labReportRoutes);
```

## What to Add

At the end of your route imports, add:

```javascript
// Add this new import
const biomarkerRoutes = require('./routes/biomarkerRoutes');

// Add this new route (can go after lab report routes)
app.use('/api/admin/biomarkers', biomarkerRoutes);
```

## Full Example (Updated server.js snippet)

```javascript
// ... other imports ...

// Route imports
const moodRoutes = require('./routes/moodRoutes');
const moodFixRoutes = require('./routes/moodFixRoutes');
const labReportRoutes = require('./routes/labReportRoutes');
const biomarkerRoutes = require('./routes/biomarkerRoutes');  // NEW

// ... MongoDB connection ...

// Routes
app.use('/api/moods', moodRoutes);
app.use('/api/mood-fixes', moodFixRoutes);
app.use('/api/lab-reports', labReportRoutes);
app.use('/api/admin/biomarkers', biomarkerRoutes);  // NEW

// ... error handling middleware ...

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## After Adding Routes

1. **Restart your server**

2. **Run the seed script** to add initial biomarkers:
   ```bash
   node scripts/seedBiomarkers.js
   ```

3. **Test the API**:
   ```bash
   curl http://localhost:5000/api/admin/biomarkers
   ```

That's it! All endpoints in the biomarker routes file will now be available.

## File Dependencies

Make sure you have these files (they should be created already):

✓ `routes/biomarkerRoutes.js` - Route definitions  
✓ `controllers/biomarkerController.js` - Business logic  
✓ `models/biomarker.js` - Database schema  
✓ `scripts/seedBiomarkers.js` - Initial data setup  

If any are missing, they'll be provided separately.

---

**Note**: This is a *non-breaking change*. Your existing mood and lab report routes will continue to work exactly as before. You're just adding a new `/api/admin/biomarkers` endpoint family.
