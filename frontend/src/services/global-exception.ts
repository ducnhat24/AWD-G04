import { isAxiosError } from "axios";

import { CustomError, ErrorDisplayType } from "./custom-error";
import { ServerError } from "./error-type";

export const catchGlobalAxiosError = (error: unknown): CustomError => {
  if (isAxiosError(error) && error.response) {
    const code = error.response.data.errorCode;
    const message = error.response.data.message;
    console.log(code, message);

    return new CustomError(
      ErrorDisplayType.TOAST,
      ServerError.SERVER_UNHANDLED
    );
  }

  console.error(error);

  return new CustomError(ErrorDisplayType.TOAST, ServerError.CONNECTION_FAILED);
};

export const handleErrorUi = (
  error: unknown,
  notifyCallback: (message: string) => void,
  form?: { setError: (field: string, error: { message: string }) => void }
): void => {
  if (error instanceof CustomError) {
    console.log("Setting form errors: ", error.fieldErrors);
    if (error.type === ErrorDisplayType.TOAST) {
      notifyCallback(error.message);
      return;
    }

    if (!form) {
      notifyCallback(error.message);
      return;
    }

    if (error.fieldErrors) {
      console.log("Field Errors:", error.fieldErrors);
      for (const field in error.fieldErrors) {
        //Kiểm tra field đó có tồn tại trong form không trước khi gọi setError
        if (field in form.getValues()) {
          form.setError(field as keyof typeof form, {
            type: "manual",
            message: error.fieldErrors[field],
          });
        }
      }
      return;
    }

    for (const field of Object.keys(form.getValues())) {
      form.setError(field as keyof typeof form, {
        type: "manual",
        message: error.message,
      });
    }
  }
};
