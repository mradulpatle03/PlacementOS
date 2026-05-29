import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { verifyOTPSchema } from '@/lib/validators/auth.schema';
import { authAPI } from '@/api/auth.api';
import { showError, showSuccess } from '@/lib/toast';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(verifyOTPSchema) });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await authAPI.verifyEmail({ email, otp: data.otp });
      showSuccess('Email verified! You can now log in.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message;
      showError(msg || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await authAPI.resendOTP({ email });
      showSuccess('OTP resent! Check your email.');
    } catch (err) {
      const msg = err.response?.data?.message;
      showError(msg || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We sent a 6-digit OTP to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              placeholder="123456"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              {...register('otp')}
            />
            {errors.otp && <p className="text-xs text-destructive">{errors.otp.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Email
          </Button>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">Didn't receive the OTP?</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={resending}
            className="mt-1"
          >
            {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resend OTP
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}