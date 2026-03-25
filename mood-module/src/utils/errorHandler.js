const fallbackMessage = "Something went wrong";

export const getErrorMessage = (err) => {
  if (!err) return fallbackMessage;

  if (err.type === "NetworkError") {
    return "Cannot connect to server. Please ensure backend is running on http://localhost:5000 and MongoDB is connected.";
  }

  if (err.type === "ValidationError") {
    if (Array.isArray(err.details) && err.details.length > 0) {
      return err.details[0];
    }

    if (err.details && typeof err.details === "object") {
      const first = Object.values(err.details)[0];
      if (typeof first === "string") return first;
    }

    return err.message || "Please check your input and try again.";
  }

  if (err.type === "ServerError") {
    return "Server error. Please try again in a moment.";
  }

  return err.message || fallbackMessage;
};

export const logError = (err, context = "app") => {
  console.error(`[${context}]`, err);
};

export const handleError = (err, context) => {
  logError(err, context);
  return getErrorMessage(err);
};