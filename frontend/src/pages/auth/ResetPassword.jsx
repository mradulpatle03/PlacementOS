import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { resetPasswordSchema } from '@/lib/validators/auth.schema';
import { authAPI } from '@/api/auth.api';
import { showError, showSuccess } from '@/lib/toast';
import { SEO } from '@/components/seo/SEO';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await authAPI.resetPassword({ email, otp: data.otp, newPassword: data.newPassword });
      showSuccess('Password reset successful. Please log in.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message;
      showError(msg || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <SEO title="Reset Password" path="/reset-password" noindex />
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Enter the OTP sent to <strong>{email}</strong> and choose a new password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="otp">OTP</Label>
            <Input
              id="otp"
              placeholder="123456"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              {...register('otp')}
            />
            {errors.otp && <p className="text-xs text-destructive">{errors.otp.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" placeholder="Min 6 characters" {...register('newPassword')} />
            {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" type="password" placeholder="Repeat password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}