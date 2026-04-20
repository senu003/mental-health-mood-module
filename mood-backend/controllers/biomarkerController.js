import Biomarker from "../models/biomarker.js";
import { apiSuccess, apiFail } from "../utils/apiResponse.js";

const normalizePayload = (body = {}) => {
  return {
    name: body.name,
    aliases: body.aliases || [],
    unit: body.unit,
    ranges: body.ranges,
    thresholds: body.thresholds,
    weight: body.weight,
    recommendations: body.recommendations,
    explanations: body.explanations,
    priority: body.priority,
    isActive: body.isActive,
  };
};

export const getAllBiomarkers = async (req, res) => {
  try {
    const biomarkers = await Biomarker.find({ isActive: true }).sort({ name: 1 }).lean();
    return res.json(apiSuccess({ biomarkers }, "Biomarkers retrieved successfully"));
  } catch (error) {
    return res.status(500).json(apiFail("Failed to retrieve biomarkers", error.message));
  }
};

export const getBiomarkerById = async (req, res) => {
  try {
    const biomarker = await Biomarker.findById(req.params.id).lean();

    if (!biomarker) {
      return res.status(404).json(apiFail("Biomarker not found"));
    }

    return res.json(apiSuccess({ biomarker }, "Biomarker retrieved successfully"));
  } catch (error) {
    return res.status(500).json(apiFail("Failed to retrieve biomarker", error.message));
  }
};

export const createBiomarker = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);

    if (
      !payload.name ||
      !payload.unit ||
      payload?.ranges?.normalMin === undefined ||
      payload?.ranges?.normalMax === undefined ||
      payload?.thresholds?.low === undefined ||
      payload?.thresholds?.high === undefined
    ) {
      return res.status(400).json(
        apiFail("Missing required fields: name, unit, ranges(normalMin/normalMax), thresholds(low/high)")
      );
    }

    const existing = await Biomarker.findOne({ name: payload.name });
    if (existing) {
      return res.status(409).json(apiFail("Biomarker with this name already exists"));
    }

    const biomarker = await Biomarker.create(payload);
    return res.status(201).json(apiSuccess({ biomarker }, "Biomarker created successfully"));
  } catch (error) {
    return res.status(500).json(apiFail("Failed to create biomarker", error.message));
  }
};

export const updateBiomarker = async (req, res) => {
  try {
    const updates = normalizePayload(req.body);
    const biomarker = await Biomarker.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!biomarker) {
      return res.status(404).json(apiFail("Biomarker not found"));
    }

    return res.json(apiSuccess({ biomarker }, "Biomarker updated successfully"));
  } catch (error) {
    return res.status(500).json(apiFail("Failed to update biomarker", error.message));
  }
};

export const deleteBiomarker = async (req, res) => {
  try {
    const biomarker = await Biomarker.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!biomarker) {
      return res.status(404).json(apiFail("Biomarker not found"));
    }

    return res.json(apiSuccess({ biomarker }, "Biomarker deactivated successfully"));
  } catch (error) {
    return res.status(500).json(apiFail("Failed to delete biomarker", error.message));
  }
};

export const hardDeleteBiomarker = async (req, res) => {
  try {
    const biomarker = await Biomarker.findByIdAndDelete(req.params.id);

    if (!biomarker) {
      return res.status(404).json(apiFail("Biomarker not found"));
    }

    return res.json(apiSuccess({}, "Biomarker permanently deleted"));
  } catch (error) {
    return res.status(500).json(apiFail("Failed to delete biomarker", error.message));
  }
};

export const updateAllWeights = async (req, res) => {
  try {
    const { weightUpdates } = req.body;

    if (!Array.isArray(weightUpdates)) {
      return res.status(400).json(apiFail("weightUpdates must be an array"));
    }

    const updated = [];

    for (const { biomarkerId, newWeight } of weightUpdates) {
      const biomarker = await Biomarker.findByIdAndUpdate(
        biomarkerId,
        { weight: newWeight },
        { new: true, runValidators: true }
      );

      if (biomarker) updated.push(biomarker);
    }

    return res.json(apiSuccess({ updated }, "Weights updated successfully"));
  } catch (error) {
    return res.status(500).json(apiFail("Failed to update weights", error.message));
  }
};
