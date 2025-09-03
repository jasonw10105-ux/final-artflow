import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import '@/styles/app.css';

interface VaultAccessPageProps {
  onVerified: () => void;
}

const VaultAccessPage: React.FC<VaultAccessPageProps> = ({ onVerified }) => {
  const { user } = useAuth();
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-vault-otp');
      if (error) throw error;
      toast.success(data.message);
      setOtpSent(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const { error } = await supabase.functions.invoke('verify-vault-otp', {
        body: { token: otp },
      });
      if (error) throw new Error(error.data.error || 'Verification failed.');
      toast.success('Access granted.');
      onVerified();
    } catch (error: any) {
      toast.error(error.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="page-container flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="card text-center max-w-md w-full p-8">
        <ShieldCheck size={48} className="mx-auto text-primary" />
        <h1 className="text-2xl font-bold mt-4">Secure Vault Access</h1>
        <p className="text-muted-foreground mt-2">
          For your security, please verify your identity to access your collection vault and certificates.
        </p>

        {!otpSent ? (
          <button onClick={handleSendOtp} disabled={isSending} className="button button-primary w-full mt-6">
            {isSending ? 'Sending Code...' : `Send Secure Code to ${user?.email}`}
          </button>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6">
            <p className="text-sm">A 6-digit code has been sent to your email. Please enter it below.</p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              className="input text-center text-2xl tracking-widest mt-4"
              placeholder="_ _ _ _ _ _"
              maxLength={6}
              required
            />
            <button type="submit" disabled={isVerifying || otp.length < 6} className="button button-primary w-full mt-4">
              {isVerifying ? 'Verifying...' : 'Unlock Vault'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default VaultAccessPage;