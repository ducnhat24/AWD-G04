import { useForm } from "react-hook-form";
import { useSignInMutation } from "../services/auth.mutation";
import { toast } from "sonner";
import { handleErrorUi } from "@/services/global-exception";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import * as z from "zod";
import { VALIDATION_MESSAGES } from "@/utils/validation-rules";

const formSchema = z.object({
  email: z.email({ message: VALIDATION_MESSAGES.emailInvalid }),
  password: z
    .string()
    .min(1, { message: VALIDATION_MESSAGES.passwordRequired }),
});

export const useSignIn = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const signInForm = useForm<z.infer<typeof formSchema>>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { mutateAsync: signIn, isPending: isProcessing } = useSignInMutation();

  const onSignIn = async (data: z.infer<typeof formSchema>) => {
    try {
      await signIn({
        email: data.email,
        password: data.password,
      });
      toast.success("Sign in successfully!");
    } catch (error) {
      handleErrorUi(error, toast.error, signInForm);
    }
  };

  const onSignUpRedirect = () => {
    navigate("/signup");
  };

  const onGoogleSuccess = (payload: any) => {
    if (payload?.accessToken && payload?.refreshToken) {
      login(payload.accessToken, payload.refreshToken, "google");
      toast.success("Sign in successfully!");
      navigate("/");
    } else {
      toast.error("Google sign in failed.");
    }
  };

  return {
    signInForm,
    isProcessing,
    handlers: {
      onSignIn,
      onSignUpRedirect,
      onGoogleSuccess,
    },
  };
};
