export const ErrorDisplayType = {
  INLINE: "inline",
  TOAST: "toast",
};

export type ErrorDisplayType =
  (typeof ErrorDisplayType)[keyof typeof ErrorDisplayType];

export class CustomError extends Error {
  type: ErrorDisplayType;
  fieldErrors?: Record<string, string>;

  constructor(
    type: ErrorDisplayType,
    message: string,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = "CustomError";
    this.type = type;
    this.fieldErrors = fieldErrors || {};
  }
}
