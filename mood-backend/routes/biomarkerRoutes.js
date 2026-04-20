import express from "express";
import {
  getAllBiomarkers,
  getBiomarkerById,
  createBiomarker,
  updateBiomarker,
  deleteBiomarker,
  hardDeleteBiomarker,
  updateAllWeights,
} from "../controllers/biomarkerController.js";

const router = express.Router();

// GET all biomarkers
router.get('/', getAllBiomarkers);

// GET single biomarker
router.get('/:id', getBiomarkerById);

// POST create new biomarker
router.post('/', createBiomarker);

// PUT update biomarker
router.put('/:id', updateBiomarker);

// DELETE (soft) biomarker
router.delete('/:id', deleteBiomarker);

// DELETE (hard) biomarker
router.delete('/:id/permanent', hardDeleteBiomarker);

// POST update multiple weights
router.post('/weights/bulk-update', updateAllWeights);

export default router;
