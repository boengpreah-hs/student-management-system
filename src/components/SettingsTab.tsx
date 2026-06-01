/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SchoolSettings, UserProfile, Student, Teacher } from '../types';
import { toast } from './Toast';
import { obfuscateText, deobfuscateText } from '../utils';
import { Database, Download, Upload, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';

interface SettingsTabProps {
  schoolSettings: SchoolSettings;
  userProfiles: Record<string, UserProfile>;
  currentRole: string;
  onSaveSettings: (settings: SchoolSettings) => Promise<void>;
  onSaveProfile: (role: string, profile: UserProfile) => Promise<void>;
  onTriggerRoleReload: (role: string) => void;
  students: Student[];
  teachers: Teacher[];
  onImportBackup: (
    students: Student[],
    teachers: Teacher[],
    schoolSettings: SchoolSettings,
    userProfiles: Record<string, UserProfile>,
    passwords?: Record<string, string>
  ) => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  schoolSettings,
  userProfiles,
  currentRole,
  onSaveSettings,
  onSaveProfile,
  onTriggerRoleReload,
  students,
  teachers,
  onImportBackup,
}) => {
  // Local Settings form state
  const [schoolName, setSchoolName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');

  // Selected config profile state
  const [editRole, setEditRole] = useState('Admin');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');

  // drag state
  const [isDragOver, setIsDragOver] = useState(false);

  // Backup & Restore states
  const [importingFile, setImportingFile] = useState<File | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackupExport = () => {
    try {
      // Collect passwords
      const passwords: Record<string, string> = {};
      ['Admin', 'User1', 'User2'].forEach((role) => {
        const pwd = localStorage.getItem(`sms_pwd_${role}`);
        if (pwd) {
          passwords[role] = pwd;
        }
      });

      const backupObj = {
        version: 1,
        backupDate: new Date().toISOString(),
        students,
        teachers,
        schoolSettings,
        userProfiles,
        passwords,
      };

      const dataStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const yearClean = schoolSettings.academicYear.replace(/[\s-/\\:]/g, '_');
      const exportFileDefaultName = `sms_backup_year_${yearClean}_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      URL.revokeObjectURL(url);

      toast.success('ទាញយកឯកសារចម្លងទុក (Backup) ដោយជោគជ័យ!');
    } catch (err) {
      console.error(err);
      toast.error('មានបញ្ហាក្នុងការទាញយកការចម្លងទុក!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.students || !parsed.teachers || !parsed.schoolSettings) {
          toast.error('ឯកសារចម្លងទុកនេះមិនត្រឹមត្រូវ ឬខូចទ្រង់ទ្រាយ!');
          setImportingFile(null);
          setParsedBackupData(null);
          return;
        }

        setParsedBackupData(parsed);
      } catch (err) {
        console.error(err);
        toast.error('កំហុសក្នុងការការអានឯកសារ JSON!');
        setImportingFile(null);
        setParsedBackupData(null);
      }
    };
    reader.readAsText(file);
  };

  const executeRestore = async () => {
    if (!parsedBackupData) return;
    setIsRestoring(true);
    try {
      await onImportBackup(
        parsedBackupData.students,
        parsedBackupData.teachers,
        parsedBackupData.schoolSettings,
        parsedBackupData.userProfiles || userProfiles,
        parsedBackupData.passwords
      );

      // Reload setting state variables locally
      setSchoolName(parsedBackupData.schoolSettings.name);
      setAcademicYear(parsedBackupData.schoolSettings.academicYear);
      setSchoolPhone(parsedBackupData.schoolSettings.phone);
      setSchoolAddress(parsedBackupData.schoolSettings.address);
      setSchoolLogo(parsedBackupData.schoolSettings.logo || '');

      toast.success('បានទាញចូលទិន្នន័យពីឯកសារចម្លងទុកឡើងវិញដោយជោគជ័យ!');
      setImportingFile(null);
      setParsedBackupData(null);
    } catch (err) {
      console.error(err);
      toast.error('ការសង្គ្រោះទិន្នន័យបានបរាជ័យ!');
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cancelRestore = () => {
    setImportingFile(null);
    setParsedBackupData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (schoolSettings) {
      setSchoolName(schoolSettings.name);
      setAcademicYear(schoolSettings.academicYear);
      setSchoolPhone(schoolSettings.phone);
      setSchoolAddress(schoolSettings.address);
      setSchoolLogo(schoolSettings.logo || '');
    }
  }, [schoolSettings]);

  useEffect(() => {
    const profile = userProfiles[editRole];
    if (profile) {
      setUserName(profile.username);
      // Retrieve stored password and deobfuscate securely
      const stored = localStorage.getItem(`sms_pwd_${editRole}`);
      if (stored) {
        setPassword(deobfuscateText(stored));
      } else {
        setPassword('1234');
      }
      setAvatar(profile.avatar || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
    }
  }, [editRole, userProfiles]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: SchoolSettings = {
      name: schoolName,
      academicYear,
      phone: schoolPhone,
      address: schoolAddress,
      logo: schoolLogo,
    };
    await onSaveSettings(payload);
    toast.success('រក្សាទុកការកំណត់ដោយជោគជ័យ!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSchoolLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const existingProfile = userProfiles[editRole];
    if (!existingProfile) return;

    const payload: UserProfile = {
      ...existingProfile,
      username: userName,
      avatar: avatar,
      email: email.trim(),
      phone: phone.trim(),
      customConfigured: true,
    };

    // Store local passwords securely with hex obfuscation
    localStorage.setItem(`sms_pwd_${editRole}`, obfuscateText(password));

    await onSaveProfile(editRole, payload);
    toast.success(`រក្សាទុកព័ត៌មានគណនី ${existingProfile.label} បានជោគជ័យ!`);

    if (currentRole === editRole) {
      onTriggerRoleReload(editRole);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setAvatar(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setAvatar(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto items-start text-[14px]">
      {/* School configuration form panel */}
      <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
        <h3 className="font-moul text-[#0f62ac] text-xs tracking-wide border-b pb-3 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#0f62ac]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>កំណត់ព័ត៌មានសាលារៀន</span>
        </h3>
        <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block font-medium text-gray-750 mb-1">ឈ្មោះសាលារៀន</label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full border rounded-lg p-2.5 outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-750 mb-1">ឆ្នាំសិក្សា (ឧ. ២០២៥ - ២០២៦)</label>
            <input
              type="text"
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full border rounded-lg p-2.5 outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-750 mb-1">លេខទូរស័ព្ទសាលា</label>
            <input
              type="text"
              required
              value={schoolPhone}
              onChange={(e) => setSchoolPhone(e.target.value)}
              className="w-full border rounded-lg p-2.5 outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-750 mb-1">អាសយដ្ឋាន / ព័ត៌មានបន្ថែម</label>
            <input
              type="text"
              required
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
              className="w-full border rounded-lg p-2.5 outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-750 mb-1 font-moul" style={{ fontSize: '14px' }}>
              រូបសញ្ញាសាលា (Logo)
            </label>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full border rounded-lg p-2" />
            {schoolLogo && (
              <div className="mt-2 flex items-center gap-4">
                <img src={schoolLogo} alt="Logo" className="w-16 h-16 rounded-full object-cover border border-yellow-400 p-0.5" />
                <button type="button" onClick={() => setSchoolLogo('')} className="text-xs text-red-500 hover:underline">
                  លុបរូបសញ្ញាចេញ
                </button>
              </div>
            )}
          </div>
          
          <button type="submit" className="w-full bg-[#0f62ac] hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition shadow flex items-center justify-center gap-1.5 cursor-pointer font-sans text-xs">
            រក្សាទុកការកំណត់
          </button>
        </form>
      </div>

      {/* Accounts credential settings panel */}
      <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
        <h3 className="font-moul text-indigo-600 text-xs tracking-wide border-b pb-3 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>គ្រប់គ្រងគណនី និងរូបភាពអ្នកប្រើប្រាស់</span>
        </h3>
        <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block font-bold text-gray-700 mb-1">ជ្រើសរើសគណនីដើម្បីកែប្រែ</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full border rounded-lg p-2.5 outline-none font-sans"
            >
              <option value="Admin">អ្នកគ្រប់គ្រង (Admin)</option>
              <option value="User1">បុគ្គលិករដ្ឋបាល (User 1)</option>
              <option value="User2">គ្រូបង្រៀន (User 2)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">ឈ្មោះគណនី (Username)</label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full border rounded-lg p-2.5 outline-none font-sans"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">អ៊ីមែល Google (សម្រាប់ការចូលដោយសុវត្ថិភាព)</label>
            <input
              type="email"
              placeholder="ឧទាហរណ៍៖ example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-2.5 outline-none font-sans"
            />
            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
              * បញ្ចូលអ៊ីមែល Google ដើម្បីអាចចូលប្រព័ន្ធតាមរយៈគណនី Google (Google Sign-In) បានដោយផ្ទាល់ និងមានសុវត្ថិភាពខ្ពស់។
            </p>
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">លេខទូរស័ព្ទ OTP (សម្រាប់ការចូលដោយសុវត្ថិភាព)</label>
            <input
              type="text"
              placeholder="ឧទហរណ៍៖ +85596123456 (ត្រូវតែមានលេខកូដប្រទេស +855)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded-lg p-2.5 outline-none font-sans"
            />
            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
              * បញ្ចូលលេខទូរស័ព្ទពេញលេញ រួមទាំងលេខកូដប្រទេស (ឧ. <strong>+855XXXXXXXX</strong>) ដើម្បីអាចឲ្យម្ចាស់គណនីនេះធ្វើការចូលប្រព័ន្ធតាមរយៈលេខទូរស័ព្ទ (Phone Security OTP) បានដោយជោគជ័យ។
            </p>
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">ពាក្យសម្ងាត់ថ្មី (Password)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-2.5 outline-none"
            />
          </div>

          {/* Drap-and-drop file interface */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">រូបភាពគណនី (Drag & Drop Avatar)</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition relative ${
                isDragOver ? 'border-indigo-500 bg-slate-100' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <input type="file" accept="image/*" onChange={handleAvatarFileSelection} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <p className="text-gray-500 font-sans">អូសនិងទម្លាក់រូបភាពនៅទីនេះ ឬចុចដើម្បីជ្រើសរើស</p>
              {avatar && (
                <div className="mt-2 flex justify-center">
                  <img src={avatar} className="w-16 h-16 rounded-full object-cover border border-slate-300" alt="Profile avatar preview" />
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition shadow flex items-center justify-center gap-1.5 cursor-pointer font-sans text-xs">
            រក្សាទុកព័ត៌មានគណនី
          </button>
        </form>
      </div>

      {/* Backup and Restore panel */}
      <div className="bg-white p-6 rounded-xl shadow border border-slate-200 lg:col-span-2">
        <h3 className="font-moul text-[#10b981] text-xs tracking-wide border-b pb-3 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-[#10b981]" />
          <span>ការចម្លងទុក និងទាញយកទិន្នន័យឡើងវិញ (Backup & Restore)</span>
        </h3>
        
        <p className="text-gray-650 text-xs mb-6 font-sans leading-relaxed">
          មុខងារនេះអនុញ្ញាតឱ្យលោកអ្នករក្សាសុវត្ថិភាពទិន្នន័យទាំងអស់ (ព័ត៌មានសិស្ស គ្រូបង្រៀន ការកំណត់សាលា និងគណនី) ដោយចម្លងទុកជាឯកសារក្នុងទូរស័ព្ទ ឬកុំព្យូទ័រ ដើម្បីអាចទាញយកមកសង្គ្រោះប្រើប្រាស់ឡើងវិញបានគ្រប់ពេលវេលា ដោយមិនបាត់បង់ព័ត៌មានឡើយ។
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Export Action Card */}
          <div className="border border-slate-100 rounded-lg p-5 bg-slate-50/50 hover:bg-slate-50 transition">
            <h4 className="font-bold text-gray-800 text-sm mb-2 font-sans flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>ចម្លងទិន្នន័យទុក (Export Backup File)</span>
            </h4>
            <p className="text-xs text-gray-500 mb-4 font-sans leading-relaxed">
              ទាញយកឯកសារចម្លងទុកជាទ្រង់ទ្រាយជេហ្វាយល៍ (JSON) ដែលមានទិន្នន័យគ្រប់យ៉ាងរបស់សាលារៀន និងរក្សាទុកក្នុងឧបករណ៍របស់លោកអ្នកជាប្រចាំ។
            </p>
            <button
              type="button"
              onClick={handleBackupExport}
              className="px-4 py-2 bg-[#10b981] hover:bg-[#0da473] text-white font-bold rounded-lg transition shadow-sm text-xs font-sans cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              បង្កើតនិងទាញយកឯកសារចម្លងទុក
            </button>
          </div>

          {/* Import Action Card */}
          <div className="border border-slate-100 rounded-lg p-5 bg-slate-50/50 hover:bg-slate-50 transition relative">
            <h4 className="font-bold text-gray-800 text-sm mb-2 font-sans flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>ទាញយកទិន្នន័យមកវិញ (Import Backup File)</span>
            </h4>
            <p className="text-xs text-gray-500 mb-4 font-sans leading-relaxed">
              ជ្រើសរើសឯកសារចម្លងទុក (.json) ពីមុនមក ដើម្បីបញ្ចូលព័ត៌មានឡើងវិញ។ រាល់ទិន្នន័យបច្ចុប្បន្ននឹងត្រូវជំនួសដោយស្វ័យប្រវត្ត។
            </p>
            
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-sm text-xs font-sans cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                ជ្រើសរើសឯកសារដើម្បីសង្គ្រោះ
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation banner layout for interactive restoring */}
        {importingFile && parsedBackupData && (
          <div className="mt-6 border border-amber-200 bg-amber-50 rounded-lg p-5 animate-fadeIn">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-bold text-gray-800 font-sans text-sm mb-1">ផ្ទៀងផ្ទាត់ការសង្គ្រោះទិន្នន័យ</h5>
                <p className="text-xs text-gray-600 font-sans leading-relaxed mb-4">
                  ប្រព័ន្ធបានរកឃើញឯកសារចម្លងទុក៖ <strong className="text-amber-800">{importingFile.name}</strong>។
                  <br />
                  សូមពិនិត្យមើលខ្លឹមសារមាតិកាដែលនឹងត្រូវសង្គ្រោះដូចខាងក្រោម៖
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/70 backdrop-blur-sm p-4 rounded-md border border-amber-100 text-xs font-sans mb-4">
                  <div>
                    <span className="text-gray-500 block font-sans">សាលារៀន៖</span>
                    <strong className="text-gray-800 block truncate">{parsedBackupData.schoolSettings?.name || 'មិនស្គាល់'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-sans">ឆ្នាំសិក្សា៖</span>
                    <strong className="text-gray-800 block">{parsedBackupData.schoolSettings?.academicYear || 'មិនស្គាល់'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-sans">សិស្សសរុប៖</span>
                    <strong className="text-gray-800 block">{parsedBackupData.students?.length || 0} នាក់</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-sans">គ្រូបង្រៀនសរុប៖</span>
                    <strong className="text-gray-800 block">{parsedBackupData.teachers?.length || 0} នាក់</strong>
                  </div>
                </div>

                <div className="p-3 bg-red-50 border border-red-100 rounded text-[11px] text-red-700 mb-4 font-sans leading-relaxed">
                  ⚠️ <strong>ការព្រមាន៖</strong> នៅពេលចុចយល់ព្រម ទិន្នន័យបច្ចុប្បន្នទាំងអស់នឹងត្រូវជំនួសដោយគ្មានការផ្លាស់ប្តូរត្រឡប់ថយក្រោយវិញបានឡើយ!
                </div>

                <div className="flex flex-wrap items-center gap-3 font-sans text-xs">
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={executeRestore}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold rounded-md shadow transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isRestoring ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    {isRestoring ? 'កំពុងបញ្ចូលទិន្នន័យ...' : 'យល់ព្រម សរសេរជាន់លើទិន្នន័យ'}
                  </button>
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={cancelRestore}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md transition cursor-pointer"
                  >
                    បោះបង់
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
