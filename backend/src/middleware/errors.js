class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};
function notFound(_req, res) {
  res.status(404).json({ message: "Endpoint not found." });
}
function errorHandler(error, _req, res, _next) {
  let status = error.status || 500,
    message = error.message;
  if (error.code === 11000) {
    status = 409;
    message = "This account, contact, or unfinished session already exists.";
  }
  if (
    error.name === "ValidationError" ||
    error.name === "CastError" ||
    error.type === "entity.parse.failed"
  ) {
    status = 400;
    message = "Invalid request data.";
  }
  if (status === 500) {
    console.error(error);
    message = "Unable to complete the request. Please try again.";
  }
  res.status(status).json({ message });
}
module.exports = { fail, HttpError, notFound, errorHandler };
