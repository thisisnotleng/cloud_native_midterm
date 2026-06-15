export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}
