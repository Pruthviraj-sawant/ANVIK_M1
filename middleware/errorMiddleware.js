import { validationResult } from 'express-validator';
import { DatabaseError } from '../utils/errors.js';

// Not Found Handler
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Error Handler
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let validationErrors = [];

  // Handle validation errors from express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    validationErrors = errors.array().map(e => ({
      field: e.param,
      message: e.msg,
      location: e.location,
      value: e.value
    }));
  }
  // Handle other types of errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    
    // Handle Mongoose validation errors
    if (err.errors) {
      validationErrors = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
    }
  } else if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    errorCode = 'RESOURCE_NOT_FOUND';
    message = 'Resource not found';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid or expired token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  } else if (err instanceof DatabaseError) {
    errorCode = err.code || 'DATABASE_ERROR';
    statusCode = 500;
  }

  // Log the error in development
  if (process.env.NODE_ENV === 'development') {
    console.error({
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code,
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(validationErrors.length > 0 && { errors: validationErrors }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

// Async handler to wrap async/await route handlers
export const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};
