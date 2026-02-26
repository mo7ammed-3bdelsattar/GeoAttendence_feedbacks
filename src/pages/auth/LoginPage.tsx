import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.ts';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { FormSelect } from '../../components/forms/FormSelect.tsx';
import type { UserRole } from '../../types/index.ts';
import toast from 'react-hot-toast';

interface LoginFormValues {
  email: string;
  password: string;
  role: UserRole;
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'admin', label: 'Admin' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '', role: 'student' },
  });

  const [, setRole] = useState<UserRole>('student');

  const onSubmit = async (values: LoginFormValues) => {
    clearError();
    try {
      await login(values.email, values.password, values.role);
      toast.success('Welcome back!');
      const base = values.role === 'student' ? '/student' : values.role === 'faculty' ? '/faculty' : '/admin';
      navigate(base, { replace: true });
    } catch {
      toast.error(error ?? 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">University</h1>
          <p className="text-sm text-gray-500">Geo-Attendance & Feedback</p>
        </div>

        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <FormInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            error={errors.email?.message}
            fullWidth
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Invalid email format"
              },
            })}
          />
          <FormInput
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password?.message}
            fullWidth
            {...register('password', { required: 'Password is required' })}
          />
          <FormSelect
            label="Role"
            options={roleOptions}
            fullWidth
            error={errors.role?.message}
            {...register('role', {
              required: 'Role is required',
              onChange: (e) => setRole(e.target.value as UserRole),
            })}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 transition-colors duration-200"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
