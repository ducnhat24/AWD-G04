// 1. Định nghĩa Schema Validation bằng Zod
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_NUMBER,
  PASSWORD_SPECIAL,
  PASSWORD_UPPERCASE,
  VALIDATION_MESSAGES,
} from "@/utils/validation-rules";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import { useSignUpMutation } from "../services/auth.mutation";
import { toast } from "sonner";
import { handleErrorUi } from "@/services/global-exception";
import { useAuthStore } from "@/stores/auth.store";

const formSchema = z
  .object({
    email: z.email({ message: VALIDATION_MESSAGES.emailInvalid }),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, { message: VALIDATION_MESSAGES.passwordMin })
      .regex(PASSWORD_UPPERCASE, {
        message: VALIDATION_MESSAGES.passwordUppercase,
      })
      .regex(PASSWORD_NUMBER, {
        message: VALIDATION_MESSAGES.passwordNumber,
      })
      .regex(PASSWORD_SPECIAL, {
        message: VALIDATION_MESSAGES.passwordSpecial,
      }),
    confirmPassword: z
      .string()
      .min(1, { message: VALIDATION_MESSAGES.confirmPasswordRequired }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: VALIDATION_MESSAGES.passwordNotMatch,
    path: ["confirmPassword"],
  });

export const useSignUp = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const signUpForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { mutateAsync: signUp, isPending: isProcessing } = useSignUpMutation();

  const onSignUp = async (data: z.infer<typeof formSchema>) => {
    try {
      await signUp({
        email: data.email,
        password: data.password,
      });
      toast.success("Sign up successfully! Please log in.");
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleErrorUi(error, toast.error, signUpForm as any);
    }
  };

  const onSignInRedirect = () => {
    navigate("/signin");
  };

  const onGoogleSuccess = (payload: Record<string, unknown>) => {
    const typedPayload = payload as { accessToken?: string; refreshToken?: string };
    if (typedPayload?.accessToken && typedPayload?.refreshToken) {
      login(typedPayload.accessToken, typedPayload.refreshToken, "google");
      toast.success("Sign in successfully!");
      navigate("/");
    } else {
      toast.error("Google sign in failed.");
    }
  };

  return {
    signUpForm,
    isProcessing,
    handlers: {
      onSignUp,
      onSignInRedirect,
      onGoogleSuccess,
    },
  };
};
