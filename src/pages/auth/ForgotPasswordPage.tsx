import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import toast from 'react-hot-toast';

interface ForgotFormValues {
  email: string;
}

export function ForgotPasswordPage() {
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotFormValues>({
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotFormValues) => {
    try {
      await resetPassword(values.email);
      setSent(true);
      toast.success('If an account exists, we sent a reset link.');
    } catch {
      toast.error('Something went wrong.');
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Check your email</h1>
          <p className="text-sm text-gray-500">
            If an account exists for that email, we sent a password reset link.
          </p>
          <Link
            to="/login"
            className="inline-block rounded-lg bg-primary px-4 py-3 font-medium text-white hover:bg-primary/90"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-xl font-bold text-gray-900 text-center">Forgot password</h1>
        <p className="text-sm text-gray-500 text-center">
          Enter your email and we’ll send a reset link.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            error={errors.email?.message}
            fullWidth
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
            })}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white hover:bg-primary/90 disabled:opacity-60 transition-colors duration-200"
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500">
          <Link to="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
