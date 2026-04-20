import mongoose from "mongoose";
import Mood from "../models/mood.js";
import LabReport from "../models/labReport.js";
import Biomarker from "../models/biomarker.js";
import { createLabReportAnalysis } from "../services/labReportService.js";
import dotenv from "dotenv";

dotenv.config();

const TEST_USER_ID = "testuser001";

const MOCK_BIOMARKERS = [
  { name: "Cortisol", ranges: { normalMin: 10, normalMax: 20 }, unit: "µg/dL", isActive: true },
  { name: "Blood Glucose", ranges: { normalMin: 70, normalMax: 100 }, unit: "mg/dL", isActive: true },
  { name: "HDL Cholesterol", ranges: { normalMin: 40, normalMax: 200 }, unit: "mg/dL", isActive: true },
  { name: "LDL Cholesterol", ranges: { normalMin: 0, normalMax: 100 }, unit: "mg/dL", isActive: true },
  { name: "Magnesium", ranges: { normalMin: 1.7, normalMax: 2.2 }, unit: "mEq/L", isActive: true },
];

const MOCK_LAB_REPORT_1 = {
  userId: TEST_USER_ID,
  originalFileName: "HealthReport_Dec2024.pdf",
  filePath: "/uploads/HealthReport_Dec2024.pdf",
  extractedText: "Sample lab report text...",
  markers: [
    {
      name: "Cortisol",
      value: 15,
      unit: "µg/dL",
      normalMin: 10,
      normalMax: 20,
      normalRange: "10 - 20 µg/dL",
      explanation: "Cortisol level is normal, indicating good stress management",
      status: "normal",
    },
    {
      name: "Blood Glucose",
      value: 85,
      unit: "mg/dL",
      normalMin: 70,
      normalMax: 100,
      normalRange: "70 - 100 mg/dL",
      explanation: "Blood glucose is in healthy range",
      status: "normal",
    },
    {
      name: "HDL Cholesterol",
      value: 55,
      unit: "mg/dL",
      normalMin: 40,
      normalMax: 200,
      normalRange: "40 - 200 mg/dL",
      explanation: "HDL (good cholesterol) is at healthy level",
      status: "normal",
    },
  ],
  overallScore: 78,
  confidence: 0.95,
  summary: "Overall health markers show good metabolic health. Continue current lifestyle habits.",
  dataQuality: 92,
  analysisCoverage: { analyzed: 3, available: 4, percentage: 75 },
  reportBiomarkers: ["Cortisol", "Blood Glucose", "HDL Cholesterol"],
  keyIssues: [],
  recommendations: {
    immediateActions: [
      "Continue regular exercise routine",
      "Maintain balanced diet with adequate minerals",
    ],
    dailyPractices: [
      "Stay hydrated throughout the day",
      "Practice stress management techniques",
      "Get 7-9 hours of sleep",
    ],
  },
  explanation: "This is not a medical diagnosis. Please consult a doctor.",
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
};

const MOCK_LAB_REPORT_2 = {
  userId: TEST_USER_ID,
  originalFileName: "BloodWork_Jan2025.pdf",
  filePath: "/uploads/BloodWork_Jan2025.pdf",
  extractedText: "Sample lab report text...",
  markers: [
    {
      name: "Cortisol",
      value: 22,
      unit: "µg/dL",
      normalMin: 10,
      normalMax: 20,
      normalRange: "10 - 20 µg/dL",
      explanation: "Cortisol level is slightly elevated. Consider stress management techniques.",
      status: "high",
    },
    {
      name: "Blood Glucose",
      value: 98,
      unit: "mg/dL",
      normalMin: 70,
      normalMax: 100,
      normalRange: "70 - 100 mg/dL",
      explanation: "Blood glucose is near upper range",
      status: "normal",
    },
    {
      name: "LDL Cholesterol",
      value: 85,
      unit: "mg/dL",
      normalMin: 0,
      normalMax: 100,
      normalRange: "0 - 100 mg/dL",
      explanation: "LDL (bad cholesterol) is at acceptable level",
      status: "normal",
    },
    {
      name: "Magnesium",
      value: 1.5,
      unit: "mEq/L",
      normalMin: 1.7,
      normalMax: 2.2,
      normalRange: "1.7 - 2.2 mEq/L",
      explanation: "Magnesium is low. Consider dietary supplements or foods rich in magnesium.",
      status: "low",
    },
  ],
  overallScore: 65,
  confidence: 0.92,
  summary: "Recent reports show mild stress indicators and low magnesium levels. Increase mineral intake.",
  dataQuality: 88,
  analysisCoverage: { analyzed: 4, available: 5, percentage: 80 },
  reportBiomarkers: ["Cortisol", "Blood Glucose", "LDL Cholesterol", "Magnesium"],
  keyIssues: ["Elevated cortisol", "Low magnesium"],
  recommendations: {
    immediateActions: [
      "Consider magnesium supplementation",
      "Schedule stress management consultation",
      "Reduce caffeine intake",
    ],
    dailyPractices: [
      "Practice meditation for 10 minutes daily",
      "Eat magnesium-rich foods (spinach, almonds, pumpkin seeds)",
      "Maintain consistent sleep schedule",
      "Light exercise like walking or yoga",
    ],
  },
  explanation: "This is not a medical diagnosis. Please consult a doctor.",
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/mood-se";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

const seedBiomarkers = async () => {
  console.log("📊 Seeding biomarkers...");
  for (const biomarker of MOCK_BIOMARKERS) {
    await Biomarker.updateOne(
      { name: biomarker.name },
      { $set: biomarker },
      { upsert: true, runValidators: true }
    );
  }
  console.log("✅ Biomarkers seeded");
};

const seedTestUserReports = async () => {
  console.log(`📝 Seeding lab reports for user: ${TEST_USER_ID}`);

  // Clear existing reports for test user
  await LabReport.deleteMany({ userId: TEST_USER_ID });

  // Insert new reports
  const result1 = await LabReport.create(MOCK_LAB_REPORT_1);
  const result2 = await LabReport.create(MOCK_LAB_REPORT_2);

  console.log("✅ Lab reports created:");
  console.log(`   - Report 1: ${result1._id}`);
  console.log(`   - Report 2: ${result2._id}`);

  return [result1._id, result2._id];
};

const main = async () => {
  try {
    await connectDB();
    await seedBiomarkers();
    await seedTestUserReports();

    console.log("\n✅ Seeding completed successfully!");
    console.log(`📱 Mobile app will now show reports for user: "${TEST_USER_ID}"`);
    console.log("\nTo use these reports, make sure your mobile app is configured with:");
    console.log(`   EXPO_PUBLIC_USER_ID=testuser001`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

main();
