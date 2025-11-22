// Base Error Class
export class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode || 500;
    this.code = code || 'INTERNAL_ERROR';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Database Errors
export class DatabaseError extends AppError {
  constructor(message, code = 'DATABASE_ERROR') {
    super(message || 'Database operation failed', 500, code);
  }
}

// Validation Errors
export class ValidationError extends AppError {
  constructor(errors, message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = Array.isArray(errors) ? errors : [errors];
  }
}

// Authentication & Authorization Errors
export class AuthenticationError extends AppError {
  constructor(message = 'Not authenticated') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 403, 'UNAUTHORIZED');
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid or expired token') {
    super(message, 401, 'INVALID_TOKEN');
  }
}

// Resource Errors
export class NotFoundError extends AppError {
  constructor(resource, id) {
    const message = id 
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    super(message, 404, 'RESOURCE_NOT_FOUND');
  }
}

// Rate Limiting
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// API Errors
export class ExternalApiError extends AppError {
  constructor(service, message = 'External API error') {
    super(`${service} ${message}`, 502, 'EXTERNAL_API_ERROR');
    this.service = service;
  }
}

// Utility function to handle async/await errors
// This is now moved to errorMiddleware.js as asyncHandler
// and can be imported from there
