import { useLoginWithGoogleMutation } from "@/features/auth/services/auth.mutation";

export const useGoogleCallBack = () => {
  const { mutateAsync, isPending: isLoginGoogle } =
    useLoginWithGoogleMutation();
  const loginWithGoogle = async (code: string) => {
    await mutateAsync({ code });
  };

  return {
    isLoginGoogle,
    handlers: {
      loginWithGoogle,
    },
  };
};
