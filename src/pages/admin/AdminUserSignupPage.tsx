import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { FormSelect } from '../../components/forms/FormSelect.tsx';
import { adminApi } from '../../services/api.ts';
import type { UserRole } from '../../types/index.ts';
import toast from 'react-hot-toast';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'admin', label: 'Admin' },
];

interface SignupFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

export function AdminUserSignupPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'student',
    },
  });

  const password = watch('password');

  const onSubmit = async (values: SignupFormValues) => {
    setSubmitting(true);
    try {
      await adminApi.createUser({
        name: values.name,
        email: values.email,
        role: values.role,
        password: values.password,
      });
      toast.success('User signed up successfully.');
      navigate('/admin/users');
    } catch {
      toast.error('Sign up failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Sign up new user">
      <div className="max-w-md">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="rounded-lg bg-primary/10 p-2">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Create new user account</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormInput
              label="Full name"
              placeholder="e.g. John Doe"
              error={errors.name?.message}
              fullWidth
              {...register('name', { required: 'Name is required' })}
            />
            <FormInput
              label="Email"
              type="email"
              placeholder="e.g. john@uni.edu"
              error={errors.email?.message}
              fullWidth
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
            />
            <FormSelect
              label="Role"
              options={roleOptions}
              fullWidth
              {...register('role', { required: 'Role is required' })}
            />
            <FormInput
              label="Password"
              type="password"
              placeholder="Min 6 characters"
              error={errors.password?.message}
              fullWidth
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
            <FormInput
              label="Confirm password"
              type="password"
              placeholder="Re-enter password"
              error={errors.confirmPassword?.message}
              fullWidth
              {...register('confirmPassword', {
                required: 'Please confirm password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
            />
            <div className="flex gap-3 pt-2">
              <Link
                to="/admin/users"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? 'Signing up...' : 'Sign up user'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
