import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Mail, Lock, User as UserIcon, Sparkles } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { FormInput } from '../../components/forms/FormInput.tsx';
import { FormSelect } from '../../components/forms/FormSelect.tsx';
import { adminApi } from '../../services/api.ts';
import type { UserRole } from '../../types/index.ts';
import toast from 'react-hot-toast';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'Student Access' },
  { value: 'faculty', label: 'Faculty Access' },
  { value: 'admin', label: 'System Administrator' },
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
    formState: { errors, isValid },
  } = useForm<SignupFormValues>({
    mode: 'onChange',
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
    const loadingToast = toast.loading('Synchronizing with Firebase...');
    try {
      await adminApi.createUser({
        name: values.name,
        email: values.email,
        role: values.role,
        password: values.password,
      });
      toast.success('Registration successful: User added to system.', { id: loadingToast });
      navigate('/admin/users');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'System error: Data synchronization failed.', { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="System Registration">
      <div className="max-w-4xl mx-auto py-8">
        <Link
          to="/admin/users"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-primary mb-8 transition-colors"
        >
          <div className="p-1.5 rounded-lg border border-gray-100 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </div>
          Back to User Directory
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
          <div className="lg:col-span-2 bg-gray-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
             
             <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-3xl flex items-center justify-center mb-8 border border-white/10 shadow-xl">
                   <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-3xl font-bold leading-tight mb-4">Register New<br />Portal Entry</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                   Accounts created here are automatically synchronized with:
                </p>
                
                <ul className="mt-8 space-y-4">
                   {[
                     {label: 'Firebase Security', desc: 'Encrypted authentication layer'},
                     {label: 'Firestore Database', desc: 'Role-based profile storage'},
                     {label: 'Cloud Infrastructure', desc: 'Instant access across platforms'}
                   ].map((item, i) => (
                     <li key={i} className="flex gap-4">
                        <div className="mt-1 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                           <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                        </div>
                        <div>
                           <p className="text-sm font-bold text-gray-100">{item.label}</p>
                           <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                     </li>
                   ))}
                </ul>
             </div>

             <div className="relative z-10 pt-10 border-t border-white/5">
                <div className="flex items-center gap-3">
                   <ShieldCheck className="h-5 w-5 text-emerald-500" />
                   <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Secured by Admin SDK</span>
                </div>
             </div>
          </div>

          <div className="lg:col-span-3 p-10 md:p-14">
            <div className="mb-10 text-center lg:text-left">
              <h3 className="text-xl font-bold text-gray-900">Personal Information</h3>
              <p className="text-sm text-gray-400 mt-1">Details will be visible to students and faculty.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormInput
                  label="Full Legal Name"
                  placeholder="e.g. Professor Robert Brown"
                  icon={UserIcon}
                  error={errors.name?.message}
                  fullWidth
                  {...register('name', { required: 'Full name is strictly required' })}
                />
                
                <FormInput
                  label="Academic Email"
                  type="email"
                  placeholder="name@university.edu"
                  icon={Mail}
                  error={errors.email?.message}
                  fullWidth
                  {...register('email', {
                    required: 'Email identity is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Must be a valid organizational email address',
                    },
                  })}
                />

                <FormSelect
                  label="Access Privileges"
                  options={roleOptions}
                  fullWidth
                  {...register('role', { required: 'Please assign a system role' })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Initial Password"
                    type="password"
                    placeholder="••••••••"
                    icon={Lock}
                    error={errors.password?.message}
                    fullWidth
                    {...register('password', {
                      required: 'A security key is required',
                      minLength: { value: 6, message: 'Minimum 6 characters' },
                    })}
                  />
                  <FormInput
                    label="Verify Password"
                    type="password"
                    placeholder="••••••••"
                    icon={Lock}
                    error={errors.confirmPassword?.message}
                    fullWidth
                    {...register('confirmPassword', {
                      required: 'Re-entry is required',
                      validate: (v) => v === password || 'Passwords mismatch detected',
                    })}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-50">
                <Link
                  to="/admin/users"
                  className="flex-1 rounded-2xl border border-gray-200 px-6 py-4 text-center text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Discard Changes
                </Link>
                <button
                  type="submit"
                  disabled={submitting || !isValid}
                  className="flex-[2] rounded-2xl bg-gray-900 px-6 py-4 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-gray-200 active:scale-95"
                >
                  {submitting ? 'Registering...' : 'Finalize & Create Account'}
                </button>
              </div>
              
              <p className="text-[10px] text-center text-gray-400 font-medium px-4">
                 By clicking create, you confirm that this user has been authorized to access the system under the selected role.
              </p>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
