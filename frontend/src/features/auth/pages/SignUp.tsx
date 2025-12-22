import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import OtherMethodLogin from "@/components/ui/OtherMethodLogin";
import { useSignUp } from "../hooks/useSignUp";

export default function SignUpPage() {
  const { signUpForm, isProcessing, handlers } = useSignUp();

  const { control, handleSubmit } = signUpForm;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Form {...signUpForm}>
        <form
          onSubmit={handleSubmit(handlers.onSignUp)}
          className="space-y-4 w-full max-w-sm p-8 border rounded-lg shadow-lg"
        >
          <h2 className="text-2xl font-bold text-center">Sign Up</h2>
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage /> {/* Hiển thị lỗi validation [cite: 49] */}
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="******" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="******" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Sign Up"}
          </Button>
          <div className="flex items-center justify-center space-x-2">
            <p className="text-muted-foreground text-sm">
              Already have an account?
            </p>
            <Button
              variant="link"
              onClick={handlers.onSignInRedirect}
              className="cursor-pointer text-blue-600"
            >
              Sign In
            </Button>
          </div>
        </form>
      </Form>
      <div className="mt-6 w-full max-w-sm flex justify-center">
        <OtherMethodLogin
          onGoogleSuccess={handlers.onGoogleSuccess}
          onGoogleError={(err) => {
            console.error("Google OAuth error:", err);
            toast.error("Google sign up failed.");
          }}
        />
      </div>
    </div>
  );
}
