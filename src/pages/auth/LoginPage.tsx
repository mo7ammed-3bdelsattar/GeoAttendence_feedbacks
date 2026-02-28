import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, ShieldCheck, Globe, CheckCircle2 } from 'lucide-react';
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
  { value: 'student', label: 'Academic Student' },
  { value: 'faculty', label: 'Faculty Member' },
  { value: 'admin', label: 'System Administrator' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const { register, handleSubmit, formState: { errors, isValid } } = useForm<LoginFormValues>({
    mode: 'onChange',
    defaultValues: { email: '', password: '', role: 'student' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    clearError();
    const loadingToast = toast.loading('Authenticating credentials...');
    try {
      await login(values.email, values.password, values.role);
      toast.success('Access Granted. Welcome back!', { id: loadingToast });
      const base = values.role === 'student' ? '/student' : values.role === 'faculty' ? '/faculty' : '/admin';
      navigate(base, { replace: true });
    } catch {
      toast.error(error ?? 'Authentication failed. Please check your credentials.', { id: loadingToast });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 relative overflow-hidden font-sans">
      
      {/* Dynamic Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_top_right,_#1e3a8a0a,_transparent),_radial-gradient(circle_at_bottom_left,_#1e3a8a0a,_transparent)]"></div>
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] animate-pulse delay-700"></div>

      <div className="w-full max-w-5xl px-4 flex flex-col lg:flex-row items-center gap-12 lg:gap-24 relative z-10">
        
        {/* Visual Brand Side */}
        <div className="hidden lg:flex flex-col flex-1 space-y-10 py-12">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-white/10 shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                 <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <div>
                 <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase">GeoAttend</h1>
                 <p className="text-xs font-bold text-primary tracking-[0.3em] mt-1 ml-0.5 opacity-80 uppercase">University Ecosystem</p>
              </div>
           </div>

           <div className="space-y-6">
              <h2 className="text-5xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
                 Smart Attendance <br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Simplified Legacy.</span>
              </h2>
              <p className="text-lg text-gray-500 max-w-md leading-relaxed">
                 Experience the first-ever geo-fenced attendance system designed for modern academic excellence. Secure, fast, and automated.
              </p>
           </div>

           <div className="grid grid-cols-2 gap-6 pt-6">
              {[
                { label: 'Uptime', value: '99.9%', icon: Globe },
                { label: 'Security', value: 'AES-256', icon: ShieldCheck },
              ].map((stat, i) => (
                <div key={i} className="bg-white/40 backdrop-blur-3xl border border-white p-5 rounded-[2rem] shadow-xl shadow-primary/5">
                   <div className="flex items-center gap-3 mb-2">
                      <stat.icon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                   </div>
                   <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                </div>
              ))}
           </div>
        </div>

        {/* Auth Interaction Side */}
        <div className="w-full max-w-md">
           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] p-10 md:p-14 relative group overflow-hidden">
              
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>

              <div className="text-center mb-10">
                 <div className="lg:hidden flex flex-col items-center mb-6">
                    <GraduationCap className="h-10 w-10 text-primary mb-2" />
                    <h1 className="text-2xl font-black text-gray-900">GeoAttend</h1>
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Portal Gateway</h3>
                 <p className="text-sm text-gray-400 mt-2 font-medium">Verify your identity to proceed</p>
              </div>

              <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <FormInput
                  label="Organizational Email"
                  type="email"
                  placeholder="e.g. name@uni.edu"
                  icon={Mail}
                  error={errors.email?.message}
                  fullWidth
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Organizational format required"
                    },
                  })}
                />
                
                <FormInput
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  icon={Lock}
                  error={errors.password?.message}
                  fullWidth
                  {...register('password', { required: 'Password is required' })}
                />

                <FormSelect
                  label="Select Role Pool"
                  options={roleOptions}
                  fullWidth
                  error={errors.role?.message}
                  {...register('role', { required: 'Access level target is required' })}
                />

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !isValid}
                    className="group w-full rounded-2xl bg-gray-900 py-4 px-6 font-bold text-sm text-white hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all duration-300 shadow-xl shadow-gray-200 disabled:opacity-30 disabled:cursor-not-allowed scale-[1.01] active:scale-95"
                  >
                    <div className="flex items-center justify-center gap-2">
                       {isLoading ? (
                         <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                       ) : (
                         <>
                           <span>Unlock Dashboard</span>
                           <CheckCircle2 className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </>
                       )}
                    </div>
                  </button>
                </div>
              </form>

              <div className="mt-10 pt-8 border-t border-gray-50 text-center">
                 <Link 
                   to="/forgot-password" 
                   className="text-xs font-bold text-gray-400 hover:text-primary transition-colors tracking-wide uppercase"
                 >
                   Trouble accessing account?
                 </Link>
              </div>

           </div>
           
           <p className="text-[10px] text-center text-gray-300 mt-8 font-medium uppercase tracking-[0.2em]">
              Authorized Use Only • © 2026 GeoAttend
           </p>
        </div>

      </div>
    </div>
  );
}
