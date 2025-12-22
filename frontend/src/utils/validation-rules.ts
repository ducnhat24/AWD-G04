export const PASSWORD_UPPERCASE = /[A-Z]/;
export const PASSWORD_NUMBER = /[0-9]/;
export const PASSWORD_SPECIAL = /[!@#$%^&*(),.?":{}|<>]/;
export const PASSWORD_MIN_LENGTH = 6;

export const VALIDATION_MESSAGES = {
  emailInvalid: "Invalid email address.",
  passwordRequired: "Please enter your password.",
  passwordMin: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
  passwordUppercase: "Password must contain at least one uppercase letter.",
  passwordNumber: "Password must contain at least one number.",
  passwordSpecial: "Password must contain at least one special character.",
  confirmPasswordRequired: "Please confirm your password.",
  passwordNotMatch: "Passwords do not match.",
};
