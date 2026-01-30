/**
 * catchAsync - Global wrapper for async route handlers to ensure all errors
 * are passed to the global error middleware.
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
