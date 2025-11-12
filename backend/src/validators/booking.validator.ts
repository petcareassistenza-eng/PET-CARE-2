/**
 * Booking Validation Rules
 * Input validation for booking endpoints
 */

import { body, ValidationChain } from 'express-validator';

/**
 * Validation for POST /api/bookings/hold
 */
export const holdSlotValidation: ValidationChain[] = [
  body('proId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Professional ID is required'),
  
  body('dateISO')
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format'),
  
  body('start')
    .isString()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  
  body('end')
    .isString()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
];

/**
 * Validation for POST /api/bookings/release
 */
export const releaseSlotValidation: ValidationChain[] = [
  body('proId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Professional ID is required'),
  
  body('dateISO')
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format'),
  
  body('start')
    .isString()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
];

/**
 * Validation for POST /api/bookings (create booking)
 */
export const createBookingValidation: ValidationChain[] = [
  body('proId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Professional ID is required'),
  
  body('serviceName')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be 2-100 characters'),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format'),
  
  body('timeStart')
    .isString()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  
  body('timeEnd')
    .isString()
    .trim()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  
  body('price')
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Price must be a positive number up to 10000'),
  
  body('appFee')
    .isFloat({ min: 0, max: 1000 })
    .withMessage('App fee must be a positive number up to 1000'),
  
  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),
  
  body('totalPaid')
    .isFloat({ min: 0 })
    .withMessage('Total paid must be a positive number'),
  
  body('couponCode')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Coupon code must be max 50 characters'),
  
  body('petIds')
    .optional()
    .isArray()
    .withMessage('Pet IDs must be an array'),
  
  body('petIds.*')
    .optional()
    .isString()
    .withMessage('Each pet ID must be a string'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be max 500 characters'),
];

/**
 * Validation for POST /api/bookings/:bookingId/confirm
 */
export const confirmBookingValidation: ValidationChain[] = [
  body('paymentIntentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Payment intent ID is required'),
];
