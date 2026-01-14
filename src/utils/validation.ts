import Joi from 'joi';

export const validateObjectId = (value: string, helpers: any) => {
  if (!/^[0-9a-fA-F]{24}$/.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

export const validateEmail = (value: string, helpers: any) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

export const validatePhone = (value: string, helpers: any) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

export const validateCoordinates = (value: any, helpers: any) => {
  if (!value || typeof value !== 'object') {
    return helpers.error('any.invalid');
  }
  
  const { latitude, longitude } = value;
  
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    return helpers.error('any.invalid');
  }
  
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    return helpers.error('any.invalid');
  }
  
  return value;
};