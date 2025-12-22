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
import { useSignIn } from "../hooks/useSignIn";

export default function SignInPage() {
  const { signInForm, isProcessing, handlers } = useSignIn();

  const { control, handleSubmit } = signInForm;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Form {...signInForm}>
        <form
          onSubmit={handleSubmit(handlers.onSignIn)}
          className="space-y-4 w-full max-w-sm p-8 border rounded-lg shadow-lg"
        >
          <h2 className="text-2xl font-bold text-center">Sign In</h2>
          {/* Email field [cite: 40] */}
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Password field [cite: 40] */}
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
          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Sign In"}
          </Button>
          <div className="flex items-center justify-center space-x-2">
            <p className="text-muted-foreground text-sm">
              Do not have any accounts?
            </p>
            <Button
              type="button"
              variant="link"
              onClick={handlers.onSignUpRedirect}
              className="cursor-pointer text-blue-600"
            >
              Sign Up
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-6 w-full max-w-sm flex justify-center">
        <OtherMethodLogin
          onGoogleSuccess={handlers.onGoogleSuccess}
          onGoogleError={(err) => {
            console.error("Google OAuth error:", err);
            toast.error("Google sign in failed.");
          }}
        />
      </div>
    </div>
  );
}
