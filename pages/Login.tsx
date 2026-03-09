
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../store';
import { Mail, ShieldCheck, Lock, ArrowLeft, CheckCircle2, Info } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (user && !hasRedirected.current) {
      hasRedirected.current = true;
      onSuccess();
    }
  }, [user, onSuccess]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    setIsLoading(true);

    if (isSignUpMode) {
      try {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setAuthError(error);
        } else {
          setAuthMessage('Dogrulama e-postasi gonderildi. Lutfen gelen kutunuzu kontrol edin.');
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const { error, needsVerification } = await signInWithEmail(email, password);
      if (error) {
        setAuthError(error);
      } else if (needsVerification) {
        setAuthMessage('E-posta dogrulamaniz gerekiyor. Lutfen gelen kutunuzu kontrol edin.');
      } else {
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthMessage('');
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError(error);
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    setIsLoading(true);

    try {
      const { error } = await sendPasswordReset(email);
      if (error) {
        setAuthError(error);
      } else {
        setResetSent(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSent) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 bg-gray-50 py-12">
        <div className="bg-white p-10 md:p-16 w-full max-w-lg shadow-sm border border-gray-100 rounded-sm text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
          </div>
          <h1 className="text-3xl serif mb-4">E-posta Gonderildi</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-10">
            Sifre sifirlama talimatlarini <strong>{email}</strong> adresine gonderdik. Lutfen gelen kutunuzu kontrol edin.
          </p>
          <button 
            onClick={() => {
              setResetSent(false);
              setIsResetMode(false);
            }}
            className="w-full bg-black text-white py-4 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-gray-900 transition-all"
          >
            GIRIS EKRANINA DON
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-gray-50 py-12">
      <div className="bg-white p-10 md:p-16 w-full max-w-lg shadow-sm border border-gray-100 rounded-sm">
        {/* Test Hint */}
        <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-sm flex items-start gap-3">
          <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 leading-relaxed uppercase tracking-widest">
            <strong>Admin Test Notu:</strong> Icinde "admin" kelimesi gecen bir e-posta ile giris yaparsaniz (orn: admin@site.com), sag altta <strong>Yonetici Paneli</strong> butonu gorunecektir.
          </p>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl serif mb-4">
            {isResetMode ? 'Sifre Sifirlama' : isSignUpMode ? 'Yeni Hesap Olusturun' : 'Hesabiniza Giris Yapin'}
          </h1>
          <p className="text-gray-500 text-[10px] tracking-widest uppercase">
            {isResetMode ? 'Guvenliginiz bizim icin onemli' : 'Isis Dunyasina Hos Geldiniz'}
          </p>
        </div>

        {isResetMode ? (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-2">E-POSTA ADRESI</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-black transition-colors"
                  placeholder="ornek@mail.com"
                />
                <Mail className="absolute right-0 top-3 text-gray-400" size={18} />
              </div>
            </div>

            {authError && (
              <p className="text-[10px] uppercase tracking-widest text-red-500">{authError}</p>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white py-4 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-gray-900 transition-all disabled:opacity-60"
            >
              SIFIRLAMA LINKI GONDER
            </button>

            <button 
              type="button"
              onClick={() => setIsResetMode(false)}
              className="w-full flex items-center justify-center gap-2 text-[10px] tracking-widest text-gray-400 uppercase hover:text-black transition-colors"
            >
              <ArrowLeft size={14} /> Geri Don
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div>
              <label className="block text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-2">E-POSTA ADRESI</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-black transition-colors"
                  placeholder="ornek@mail.com"
                />
                <Mail className="absolute right-0 top-3 text-gray-400" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] tracking-[0.1em] uppercase text-gray-500 mb-2">SIFRE</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-black transition-colors"
                  placeholder="********"
                />
                <Lock className="absolute right-0 top-3 text-gray-400" size={18} />
              </div>
              {!isSignUpMode && (
                <div className="mt-2 text-right">
                  <button 
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-[10px] tracking-tighter uppercase text-gray-400 hover:text-black transition-colors"
                  >
                    Sifremi Unuttum?
                  </button>
                </div>
              )}
            </div>

            {authError && (
              <p className="text-[10px] uppercase tracking-widest text-red-500">{authError}</p>
            )}
            {authMessage && (
              <p className="text-[10px] uppercase tracking-widest text-green-600">{authMessage}</p>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white py-4 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-gray-900 transition-all disabled:opacity-60"
            >
              {isLoading ? (isSignUpMode ? 'KAYIT OLUYOR...' : 'GIRIS YAPILIYOR...') : (isSignUpMode ? 'KAYIT OL' : 'GIRIS YAP')}
            </button>

            {!isSignUpMode && (
              <>
                <div className="relative my-10">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-4 text-gray-400 tracking-widest">VEYA</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 border border-gray-300 py-4 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-gray-50 transition-all disabled:opacity-60"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                  GOOGLE ILE DEVAM ET
                </button>
              </>
            )}

            <div className="text-center text-[10px] uppercase tracking-widest text-gray-400">
              {isSignUpMode ? 'Zaten hesabiniz var mi?' : 'Hesabin yok mu?'}
              <button
                type="button"
                onClick={() => setIsSignUpMode((prev) => !prev)}
                className="ml-2 text-black hover:opacity-60"
              >
                {isSignUpMode ? 'Giris yap' : 'Kayit ol'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-12 flex items-start gap-3 text-gray-400 text-[10px] leading-relaxed">
          <ShieldCheck size={16} className="shrink-0" />
          <p>
            Verileriniz guvende. Giris yaparak Kullanim Kosullari ve Gizlilik Politikasi'ni kabul etmis olursunuz. 
            Isis, kisisel verilerinizi asla ucuncu taraflarla paylasmaz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
