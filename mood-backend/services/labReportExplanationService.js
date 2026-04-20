const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const USE_OLLAMA = String(process.env.USE_OLLAMA_EXPLANATIONS || "false").toLowerCase() === "true";

const sanitizeModelText = (text = "") => {
  return String(text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
};

const buildPrompt = (marker) => {
  return [
    "You are writing health education text.",
    "Write 1-2 short neutral sentences for a patient-facing app.",
    `Marker: ${marker.name}`,
    `Value: ${marker.value ?? "not found"}`,
    `Status: ${marker.status}`,
    "Do NOT provide diagnosis.",
    "Do NOT provide treatment plans or medication advice.",
    "Use cautious, general, informational language only.",
  ].join("\n");
};

const generateWithOllama = async (marker) => {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: buildPrompt(marker),
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama call failed with status ${response.status}`);
  }

  const payload = await response.json();
  return sanitizeModelText(payload?.response || "");
};

export const enrichMarkerExplanations = async (markers = []) => {
  if (!USE_OLLAMA) return markers;

  const enriched = await Promise.all(
    markers.map(async (marker) => {
      try {
        const explanation = await generateWithOllama(marker);
        if (!explanation) return marker;
        return { ...marker, explanation };
      } catch (_error) {
        return marker;
      }
    })
  );

  return enriched;
};
