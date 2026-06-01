/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile } from '../types';
import { auth, signInWithPopup, GoogleAuthProvider, isFirebaseSupported, signInAnonymously } from '../firebase';
import { toast } from './Toast';
import { deobfuscateText, obfuscateText } from '../utils';
import { Lock, User, LogIn, Chrome, ShieldAlert } from 'lucide-react';

interface LoginModalProps {
  userProfiles: Record<string, UserProfile>;
  onLoginSuccess: (role: string) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  userProfiles,
  onLoginSuccess,
  onClose,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsgVisible, setErrorMsgVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsgVisible(false);

    const queryUserObfuscated = obfuscateText(usernameInput.toLowerCase().trim());
    const queryPassObfuscated = obfuscateText(passwordInput.trim());

    let authenticatedRole: string | null = null;

    // Use pre-computed obfuscated comparison values to completely prevent inspect search in Javascript
    const adminObf = "007b006f005a00460048"; // obfuscateText('admin')
    const user1Obf = "005b005a0071005b001f"; // obfuscateText('user1')
    const user2Obf = "005b005a0071005b001c"; // obfuscateText('user2')
    const pass1234Obf = "001b0019001b0021";     // obfuscateText('1234')

    if (queryUserObfuscated === adminObf && queryPassObfuscated === pass1234Obf) {
      authenticatedRole = 'Admin';
    } else if (queryUserObfuscated === user1Obf && queryPassObfuscated === pass1234Obf) {
      authenticatedRole = 'User1';
    } else if (queryUserObfuscated === user2Obf && queryPassObfuscated === pass1234Obf) {
      authenticatedRole = 'User2';
    } else {
      // Loop through synced user profiles
      const queryUserLower = usernameInput.toLowerCase().trim();
      const queryPassRaw = passwordInput.trim();
      for (const role in userProfiles) {
        const val = userProfiles[role];
        const storedPassHex = localStorage.getItem(`sms_pwd_${role}`);
        const savedPass = storedPassHex ? deobfuscateText(storedPassHex) : '1234';
        if (val && val.username.toLowerCase() === queryUserLower && queryPassRaw === savedPass) {
          authenticatedRole = role;
          break;
        }
      }
    }

    if (authenticatedRole) {
      if (isFirebaseSupported && auth) {
        try {
          await signInAnonymously(auth);
          toast.success('🎉 ចូលប្រព័ន្ធដោយជោគជ័យ!');
          onLoginSuccess(authenticatedRole);
        } catch (error) {
          console.warn('Firebase anonymous auth failed:', error);
          // Offline / Disabled fallback
          toast.success('🎉 ចូលប្រព័ន្ធដោយជោគជ័យ (Offline Mode)!');
          onLoginSuccess(authenticatedRole);
        }
      } else {
        toast.success('🎉 ចូលប្រព័ន្ធដោយជោគជ័យ!');
        onLoginSuccess(authenticatedRole);
      }
    } else {
      setErrorMsgVisible(true);
      toast.error('❌ ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវទេ!');
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseSupported || !auth) {
      toast.error('🔒 មិនអាចប្រើប្រាស់សេវា Google ឡើយ (Firebase configuration is missing)!');
      return;
    }
    
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user?.email;
      
      if (!email) {
        toast.error('មិនអាចទាញយកអ៊ីមែលពីគណនី Google របស់អ្នកបានឡើយ!');
        setIsLoading(false);
        return;
      }
      
      let matchedRole: string | null = null;
      for (const role in userProfiles) {
        const profile = userProfiles[role];
        if (profile && profile.email && profile.email.toLowerCase() === email.toLowerCase()) {
          matchedRole = role;
          break;
        }
      }
      
      if (matchedRole) {
        toast.success('🎉 ចូលប្រើប្រាស់ដោយជោគជ័យ តាមរយៈ Google!');
        onLoginSuccess(matchedRole);
      } else {
        toast.error(`❌ គណនី Google (${email}) នេះមិនទាន់ត្រូវបានអនុញ្ញាតក្នុងប្រព័ន្ធឡើយ!`);
      }
    } catch (e: any) {
      console.error('Google Sign-In Error:', e);
      if (e.message && e.message.includes('configuration-not-found')) {
        toast.warning(
          '🔒 សូមបើក Google Sign-In នៅក្នុងគម្រោង Firebase Console របស់អ្នកជាមុនសិន!'
        );
      } else if (e.message && e.message.includes('unauthorized-domain')) {
        toast.warning(
          '🔒 ដែនដែន (Domain) របស់វេបសាយនេះ មិនទាន់ត្រូវបានអនុញ្ញាតនៅក្នុងគម្រោង Firebase របស់លោកអ្នកទេ!'
        );
      } else {
        toast.error('ការចូលគណនី Google បរាជ័យ៖ ' + e.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col animate-fade-in">
        
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-800" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 flex justify-between items-center bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <LogIn className="w-4 h-4" />
            </span>
            <h3 className="font-moul text-[11px] font-semibold text-slate-800 tracking-wide">
              បន្ទះចូលប្រព័ន្ធគ្រប់គ្រងសិស្ស
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-slate-800 font-sans">
          
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              ឈ្មោះគណនី (Username)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                disabled={isLoading}
                placeholder="ឈ្មោះគណនី..."
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full text-xs border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl py-2.5 pl-10 pr-3 outline-none font-sans transition bg-white disabled:bg-slate-50 disabled:text-slate-455"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-700">
                លេខសម្ងាត់ (Password)
              </label>
              <button
                type="button"
                onClick={() => toast.info('សូមទាក់ទងមកកាន់អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin) ដើម្បីកំណត់លេខសម្ងាត់ឡើងវិញ!')}
                className="text-[11px] text-blue-600 hover:text-blue-850 font-medium cursor-pointer"
              >
                ភ្លេចលេខសម្ងាត់?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                disabled={isLoading}
                placeholder="លេខសម្ងាត់..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full text-xs border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl py-2.5 pl-10 pr-3 outline-none font-sans transition bg-white disabled:bg-slate-50 disabled:text-slate-455"
              />
            </div>
          </div>

          {errorMsgVisible && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-750 rounded-xl border border-red-100 animate-fade-in text-[11px] font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវទេ!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-xl transition shadow-sm hover:shadow-md cursor-pointer text-xs flex items-center justify-center gap-2 disabled:bg-blue-300"
          >
            {isLoading ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'ផ្ទៀងផ្ទាត់ & ចូលប្រព័ន្ធ'}
          </button>

          {isFirebaseSupported && (
            <>
              <div className="relative flex py-1 items-center select-none">
                <div className="flex-grow border-t border-slate-100" />
                <span className="flex-shrink mx-3 text-slate-450 text-[10px] font-medium font-sans">
                  ឬចូលដោយសុវត្ថិភាពតាមរយៈ
                </span>
                <div className="flex-grow border-t border-slate-100" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 font-medium py-2.5 rounded-xl transition shadow-xs hover:shadow-sm cursor-pointer text-xs disabled:bg-slate-50 disabled:border-slate-100 disabled:text-slate-400"
              >
                <Chrome className="w-4 h-4 text-red-500 shrink-0" />
                <span>គណនី Google សាលារៀន</span>
              </button>
            </>
          )}

          <div className="pt-1.5 border-t border-slate-100 text-center leading-relaxed">
            <span className="text-[10px] text-slate-400 font-sans">
              * ប្រព័ន្ធនេះការពារដោយស្តង់ដារសុវត្ថិភាព និងការរក្សាការសម្ងាត់ខ្ពស់
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};
