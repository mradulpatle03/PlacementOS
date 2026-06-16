import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { forgotPasswordSchema } from '@/lib/validators/auth.schema';
import { authAPI } from '@/api/auth.api';
import { showError, showSuccess } from '@/lib/toast';
import { SEO } from '@/components/seo/SEO';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await authAPI.forgotPassword(data);
      showSuccess('If that email exists, an OTP has been sent.');
      navigate(`/reset-password?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      const msg = err.response?.data?.message;
      showError(msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <SEO title="Forgot Password" path="/forgot-password" noindex />
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we'll send you an OTP to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@college.edu" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send OTP
          </Button>
        </form>

        <div className="text-center mt-4">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}