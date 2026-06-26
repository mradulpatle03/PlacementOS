import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/lib/validators/auth.schema";
import { authAPI } from "@/api/auth.api";
import { setCredentials } from "@/store/authSlice";
import { showError } from "@/lib/toast";
import { SEO } from "@/components/seo/SEO";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const res = await authAPI.login(data);
      const { user, accessToken } = res.data;
      queryClient.clear();
      localStorage.setItem("accessToken", accessToken);
      dispatch(setCredentials(user));
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message;
      // if unverified, redirect to verify page
      if (err.response?.status === 403 && msg?.includes("verify")) {
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
        return;
      }
      showError(Array.isArray(msg) ? msg.join(", ") : msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <SEO title="Login" path="/login" noindex />
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your PlacementOS account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@college.edu"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
