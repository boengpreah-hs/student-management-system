/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Student, Teacher, SchoolSettings, UserProfile } from './types';
import { auth, signOut as firebaseSignOut, isFirebaseSupported } from './firebase';
import {
  subscribeToStudents,
  subscribeToTeachers,
  subscribeToSettings,
  subscribeToProfiles,
  writeStudent,
  writeBulkStudents,
  removeStudent,
  removeBulkStudents,
  writeTeacher,
  removeTeacher,
  writeSettings,
  writeUserProfile,
  loadLocalStudents,
  loadLocalTeachers,
  loadLocalSettings,
  loadLocalProfiles,
  importBackupData,
} from './data/store';
import { DashboardTab } from './components/DashboardTab';
import { StudentsTab } from './components/StudentsTab';
import { TeachersTab } from './components/TeachersTab';
import { AllocationTab } from './components/AllocationTab';
import { PromotionTab } from './components/PromotionTab';
import { ReportsTab } from './components/ReportsTab';
import { SettingsTab } from './components/SettingsTab';
import { LoginModal } from './components/LoginModal';
import { ToastContainer, ToastMessage, toast } from './components/Toast';
import {
  LayoutDashboard,
  GraduationCap,
  UserCheck,
  Layers,
  TrendingUp,
  Printer,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function App() {
  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsub = toast.subscribe((message, type, duration = 4000) => {
      const id = Math.random().toString();
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    });
    return unsub;
  }, []);

  // Sync Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => loadLocalSettings());
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>(() => loadLocalProfiles());

  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRole, setCurrentRole] = useState('Admin');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  // Monitor Google Authentication state change (registers only once on mount)
  useEffect(() => {
    if (isFirebaseSupported && auth) {
      const unsub = auth.onAuthStateChanged((user: any) => {
        setFirebaseUser(user);
      });
      return unsub;
    }
  }, []);

  // Set the login state when userProfiles have loaded or updated, and a firebaseUser is signed in
  useEffect(() => {
    if (firebaseUser && firebaseUser.email) {
      for (const role in userProfiles) {
        const profile = userProfiles[role];
        if (profile && profile.email && profile.email.toLowerCase() === firebaseUser.email.toLowerCase()) {
          setCurrentRole(role);
          setIsLoggedIn(true);
        }
      }
    }
  }, [firebaseUser, userProfiles]);

  // Subscriptions to live database (real-time sync)
  useEffect(() => {
    // Dynamically registers active listeners
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubTeachers = subscribeToTeachers(setTeachers);
    const unsubSettings = subscribeToSettings(setSchoolSettings);
    const unsubProfiles = subscribeToProfiles(setUserProfiles);

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubSettings();
      unsubProfiles();
    };
  }, [firebaseUser]);

  // បង្ហាញ Logo សាលាលើ Browser Tab (Favicon)
  useEffect(() => {
    if (schoolSettings?.logo) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = schoolSettings.logo;
    }
  }, [schoolSettings?.logo]);

  const handleTabTrigger = (tabId: string) => {
    if (tabId !== 'dashboard' && !isLoggedIn) {
      toast.warning('🔑 សូមចូលគណនីរបស់អ្នកជាមុនសិន ដើម្បីប្រើប្រាស់មុខងារនេះ!');
      setIsLoginModalOpen(true);
      return;
    }
    setActiveTab(tabId);
    setIsMobileSidebarOpen(false);
  };

  // Login handler
  const handleLoginSuccess = (role: string) => {
    setCurrentRole(role);
    setIsLoggedIn(true);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    if (isFirebaseSupported && auth) {
      firebaseSignOut(auth).catch((e) => console.error('Sign-out error:', e));
    }
    setIsLoggedIn(false);
    setCurrentRole('Admin');
    setActiveTab('dashboard');
  };

  // Actions mutation handlers
  const handleSaveStudent = async (student: Student) => {
    await writeStudent(student, students);
  };

  const handleSaveBulkStudents = async (list: Student[]) => {
    await writeBulkStudents(list);
  };

  const handleRemoveStudent = async (id: string) => {
    await removeStudent(id, students);
  };

  // Bulk remove students based on selection parameters
  const handleBulkRemoveStudents = async (scope: string, type: string, targetGrade?: string, selectedIDs?: string[]) => {
    if (type === 'permanent') {
      let idsToDelete: string[] = [];

      if (scope === 'all') {
        idsToDelete = students.map((s) => s.id);
      } else if (scope === 'grade') {
        if (!targetGrade) {
          toast.warning('សូមជ្រើសរើសកម្រិតថ្នាក់ជាក់លាក់ណាមួយ!');
          return;
        }
        idsToDelete = students
          .filter((s) => {
            const gGroup = (s.grade === '11' || s.grade === '12') && s.classType !== 'ទូទៅ'
              ? `${s.grade} (${s.classType})`
              : s.grade;
            return gGroup === targetGrade;
          })
          .map((s) => s.id);
      } else if (scope === 'dropout') {
        idsToDelete = students.filter((s) => s.other === 'បោះបង់').map((s) => s.id);
      } else if (scope === 'selected') {
        if (!selectedIDs || selectedIDs.length === 0) {
          toast.warning('សូមជ្រើសរើសសិស្សដែលត្រូវលុប!');
          return;
        }
        idsToDelete = selectedIDs;
      }

      if (idsToDelete.length > 0) {
        await removeBulkStudents(idsToDelete, students);
      }
    } else {
      // Type is 'dropout'
      let updatedList = [...students];

      if (scope === 'all') {
        updatedList = updatedList.map((s) => ({ ...s, other: 'បោះបង់' }));
      } else if (scope === 'grade') {
        if (!targetGrade) {
          toast.warning('សូមជ្រើសរើសកម្រិតថ្នាក់ជាក់លាក់ណាមួយ!');
          return;
        }
        updatedList = updatedList.map((s) => {
          const gGroup = (s.grade === '11' || s.grade === '12') && s.classType !== 'ទូទៅ'
            ? `${s.grade} (${s.classType})`
            : s.grade;
          return gGroup === targetGrade ? { ...s, other: 'បោះបង់' } : s;
        });
      } else if (scope === 'selected') {
        if (!selectedIDs || selectedIDs.length === 0) {
          toast.warning('សូមជ្រើសរើសសិស្សដែលត្រូវកំណត់ជាបោះបង់!');
          return;
        }
        updatedList = updatedList.map((s) =>
          selectedIDs.includes(s.id) ? { ...s, other: 'បោះបង់' } : s
        );
      }

      await handleSaveBulkStudents(updatedList);
    }

    toast.success('ការលុបសិស្សជាក្រុមត្រូវបានបញ្ចប់!');
  };

  const handleSaveTeacher = async (teacher: Teacher) => {
    await writeTeacher(teacher, teachers);
  };

  const handleRemoveTeacher = async (id: string) => {
    await removeTeacher(id, teachers);
  };

  const handleSaveSettings = async (settings: SchoolSettings) => {
    await writeSettings(settings);
  };

  const handleSaveUserProfile = async (role: string, profile: UserProfile) => {
    await writeUserProfile(role, profile, userProfiles);
  };

  const handleImportBackup = async (
    backupStudents: Student[],
    backupTeachers: Teacher[],
    backupSettings: SchoolSettings,
    backupProfiles: Record<string, UserProfile>,
    backupPasswords?: Record<string, string>
  ) => {
    await importBackupData(backupStudents, backupTeachers, backupSettings, backupProfiles, backupPasswords);
  };

  const activeProfile = userProfiles[currentRole];
  const userAvatar = isLoggedIn && activeProfile?.avatar
    ? activeProfile.avatar
    : 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=80&auto=format&fit=crop&q=60';

  const userLabel = isLoggedIn && activeProfile?.label ? activeProfile.label : 'ភ្ញៀវ';
  const roleLabel = isLoggedIn ? activeProfile?.username : 'មិនទាន់ចូលគណនី';

  // Compute active counts of children records
  const activeStudentsCount = students.filter((s) => s && s.other !== 'បោះបង់').length;

  // Evaluate structural sidebar permissions per active user session role
  const isTeacherView = isLoggedIn && currentRole === 'User2';
  const isOfficeStaffView = isLoggedIn && currentRole === 'User1';

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div className="bg-[#f4f6f9] min-h-screen h-screen flex flex-col font-sans overflow-hidden select-none">
      {/* Top Header Navigation bar */}
      <header className="bg-[#0f62ac] text-white flex items-center justify-between px-4 py-1.5 h-14 shadow-md no-print sticky top-0 z-40">
        
        {/* Left side: Logo & School System Title left-aligned */}
        <div className="flex items-center gap-3 min-w-0 flex-1 py-0.5 select-none text-left">
          {schoolSettings?.logo ? (
            <img src={schoolSettings.logo} className="w-10 h-10 object-cover rounded-full border border-yellow-300 bg-white shrink-0 shadow-sm" />
          ) : (
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border border-yellow-400 p-1 shrink-0 shadow-sm">
              <svg viewBox="0 0 1024 1024" fill="currentColor" className="w-7 h-7 text-blue-900 leading-none">
                <path d="M512 128L128 320v384l384 192 384-192V320L512 128zm0 128l256 128-256 128-256-128 256-128zm-256 256v128l256 128 256-128v-128L512 640 256 512z" />
              </svg>
            </div>
          )}
          <div className="flex flex-col justify-center min-w-0 py-0.5 leading-normal">
            <h1 className="text-white font-normal tracking-wide whitespace-nowrap leading-normal font-moul" style={{ fontFamily: 'Moul, "Times New Roman", serif', fontSize: '13px' }}>
              {schoolSettings?.name || 'វិទ្យាល័យបឹងព្រះ'}
            </h1>
            <span className="text-yellow-450 font-normal leading-normal select-none whitespace-nowrap font-sans" style={{ fontFamily: 'Battambang, Inter, sans-serif', fontSize: '12px' }}>
              ប្រព័ន្ធគ្រប់គ្រងទិន្នន័យសិស្ស
            </span>
          </div>
        </div>

        {/* Right Session options */}
        <div className="flex items-center gap-2 relative z-50 shrink-0">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 bg-transparent hover:bg-white/10 pl-2 pr-3 py-1 rounded transition h-10 cursor-pointer"
          >
            <div className="relative w-8 h-8 shrink-0">
              <img
                src={userAvatar}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover border border-white/60"
              />
              <span className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ${isLoggedIn ? 'bg-emerald-500' : 'bg-rose-455'} ring-1 ring-blue-800`}></span>
            </div>
            <div className="text-left leading-tight hidden md:block">
              <span className="text-slate-100 font-bold text-[10px] sm:text-[11px] block no-min-font">{userLabel}</span>
              <span className="text-slate-300 text-[8px] sm:text-[9px] block font-mono no-min-font">{roleLabel}</span>
            </div>
            <svg className="w-3.5 h-3.5 text-slate-300 ml-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* User profile dropdown list */}
          {isUserDropdownOpen && (
            <div className="absolute right-0 top-11 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-xl border border-slate-200 py-1 text-[13px] z-50 font-sans">
              {isLoggedIn ? (
                <>
                  <div className="px-4 py-2 text-slate-500 bg-slate-50 border-b select-none">
                    ប្រើប្រាស់ជា៖ <strong className="text-blue-900 block">{userLabel}</strong>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-650 font-semibold cursor-pointer"
                  >
                    ចាកចេញពីគណនី
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setIsLoginModalOpen(true);
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-[#0f62ac] font-bold cursor-pointer"
                >
                  ចូលប្រើប្រាស់ប្រព័ន្ធ
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Structural Body */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Side Navigation Pane */}
        <aside
          className={`group bg-[#20272F] text-slate-300 h-full flex-shrink-0 flex flex-col no-print absolute lg:relative inset-y-0 left-0 lg:left-auto w-64 transition-all duration-300 z-40 ${
            isSidebarCollapsed ? 'lg:w-[70px]' : 'lg:w-64'
          } ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
        >
          {/* Floating Sidebar Collapse Toggle Button */}
          <button
            onClick={handleToggleSidebar}
            className="absolute top-1/2 -translate-y-1/2 left-full z-50 bg-yellow-400 hover:bg-yellow-500 text-slate-950 rounded-r-full shadow-lg border-y border-r border-yellow-500 flex items-center justify-center transition-all duration-200 cursor-pointer lg:opacity-0 lg:group-hover:opacity-100 w-8 lg:w-6 h-16 lg:h-14"
            style={{ marginLeft: '-1px' }}
          >
            <span className="lg:hidden flex items-center justify-center">
              {isMobileSidebarOpen ? (
                <ChevronLeft className="w-5 h-5 stroke-[3]" />
              ) : (
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              )}
            </span>
            <span className="hidden lg:flex items-center justify-center">
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              )}
            </span>
          </button>

          {/* Nav buttons */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto text-[13px] font-sans">
            <button
              onClick={() => handleTabTrigger('dashboard')}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition relative cursor-pointer ${
                activeTab === 'dashboard' ? `text-white font-bold ${isSidebarCollapsed ? 'lg:pl-3 pl-7' : 'pl-7'}` : 'hover:bg-slate-750 text-slate-350'
              } ${isSidebarCollapsed ? 'lg:justify-center justify-start gap-3' : 'justify-start gap-3'}`}
            >
              {activeTab === 'dashboard' && (
                <div
                  className="absolute left-1 w-1 bg-yellow-400 top-[1px] bottom-[1px] z-10"
                  style={{ clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)' }}
                />
              )}
              <LayoutDashboard className={`w-[21px] h-[21px] shrink-0 transition ${activeTab === 'dashboard' ? 'text-yellow-400' : 'text-slate-400'}`} />
              <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>ផ្ទាំងគ្រប់គ្រង</span>
            </button>

            <button
              onClick={() => handleTabTrigger('students')}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition relative cursor-pointer ${
                activeTab === 'students' ? `text-white font-bold ${isSidebarCollapsed ? 'lg:pl-3 pl-7' : 'pl-7'}` : 'hover:bg-slate-750 text-slate-350'
              } ${isSidebarCollapsed ? 'lg:justify-center justify-start gap-3' : 'justify-start gap-3'}`}
            >
              {activeTab === 'students' && (
                <div
                  className="absolute left-1 w-1 bg-yellow-400 top-[1px] bottom-[1px] z-10"
                  style={{ clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)' }}
                />
              )}
              <GraduationCap className={`w-[21px] h-[21px] shrink-0 transition ${activeTab === 'students' ? 'text-yellow-400' : 'text-slate-400'}`} />
              <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>គ្រប់គ្រងព័ត៌មានសិស្ស</span>
            </button>

            {!isTeacherView && (
              <button
                onClick={() => handleTabTrigger('teachers')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition relative cursor-pointer ${
                  activeTab === 'teachers' ? `text-white font-bold ${isSidebarCollapsed ? 'lg:pl-3 pl-7' : 'pl-7'}` : 'hover:bg-slate-750 text-slate-350'
                } ${isSidebarCollapsed ? 'lg:justify-center justify-start gap-3' : 'justify-start gap-3'}`}
              >
                {activeTab === 'teachers' && (
                  <div
                     className="absolute left-1 w-1 bg-yellow-400 top-[1px] bottom-[1px] z-10"
                    style={{ clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)' }}
                  />
                )}
                <UserCheck className={`w-[21px] h-[21px] shrink-0 transition ${activeTab === 'teachers' ? 'text-yellow-400' : 'text-slate-400'}`} />
                <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>គ្រប់គ្រងគ្រូ</span>
              </button>
            )}

            {!isTeacherView && (
              <button
                onClick={() => handleTabTrigger('allocation')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition relative cursor-pointer ${
                  activeTab === 'allocation' ? `text-white font-bold ${isSidebarCollapsed ? 'lg:pl-3 pl-7' : 'pl-7'}` : 'hover:bg-slate-755 text-slate-355'
                } ${isSidebarCollapsed ? 'lg:justify-center justify-start gap-3' : 'justify-start gap-3'}`}
              >
                {activeTab === 'allocation' && (
                  <div
                    className="absolute left-1 w-1 bg-yellow-400 top-[1px] bottom-[1px] z-10"
                    style={{ clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)' }}
                  />
                )}
                <Layers className={`w-[21px] h-[21px] shrink-0 transition ${activeTab === 'allocation' ? 'text-yellow-400' : 'text-slate-400'}`} />
                <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>បែងចែកថ្នាក់រៀន</span>
              </button>
            )}

            {!isTeacherView && (
              <button
                onClick={() => handleTabTrigger('promotion')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition relative cursor-pointer ${
                  activeTab === 'promotion' ? `text-white font-bold ${isSidebarCollapsed ? 'lg:pl-3 pl-7' : 'pl-7'}` : 'hover:bg-slate-750 text-slate-355'
                } ${isSidebarCollapsed ? 'lg:justify-center justify-start gap-3' : 'justify-start gap-3'}`}
              >
                {activeTab === 'promotion' && (
                  <div
                    className="absolute left-1 w-1 bg-yellow-400 top-[1px] bottom-[1px] z-10"
                    style={{ clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)' }}
                  />
                )}
                <TrendingUp className={`w-[21px] h-[21px] shrink-0 transition ${activeTab === 'promotion' ? 'text-yellow-400' : 'text-slate-400'}`} />
                <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>ការឡើងថ្នាក់</span>
              </button>
            )}

            <button
              onClick={() => handleTabTrigger('reports')}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl transition relative cursor-pointer ${
                activeTab === 'reports' ? `text-white font-bold ${isSidebarCollapsed ? 'lg:pl-3 pl-7' : 'pl-7'}` : 'hover:bg-slate-755 text-[#bcc5cf]'
              } ${isSidebarCollapsed ? 'lg:justify-center justify-start gap-3' : 'justify-start gap-3'}`}
            >
              {activeTab === 'reports' && (
                <div
                  className="absolute left-1 w-1 bg-yellow-400 top-[1px] bottom-[1px] z-10"
                  style={{ clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)' }}
                />
              )}
              <Printer className={`w-[21px] h-[21px] shrink-0 transition ${activeTab === 'reports' ? 'text-yellow-400' : 'text-slate-400'}`} />
              <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>របាយការណ៍បោះពុម្ព</span>
            </button>
          </nav>

          {/* Settings Tab Anchored strictly to the bottom of the Screen/Sidebar */}
          {!isTeacherView && !isOfficeStaffView && (
            <div className="p-2 border-t border-slate-755 bg-[#20272F]/50 no-print">
              <button
                onClick={() => handleTabTrigger('settings')}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl transition relative cursor-pointer ${
                  activeTab === 'settings' ? `text-white font-bold ${isSidebarCollapsed ? 'lg:pl-3 pl-7' : 'pl-7'}` : 'hover:bg-slate-755 text-[#bcc5cf]'
                } ${isSidebarCollapsed ? 'lg:justify-center justify-start gap-3' : 'justify-start gap-3'}`}
              >
                {activeTab === 'settings' && (
                  <div
                    className="absolute left-1 w-1 bg-yellow-400 top-[1px] bottom-[1px] z-10"
                    style={{ clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)' }}
                  />
                )}
                <Settings className={`w-[21px] h-[21px] shrink-0 transition ${activeTab === 'settings' ? 'text-yellow-400' : 'text-slate-400'}`} />
                <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>ការកំណត់</span>
              </button>
            </div>
          )}
        </aside>

        {/* Overlay closing slidebar on Mobile click out */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden cursor-pointer"
          ></div>
        )}

        {/* Work Render Body */}
        <main className={`flex-1 p-2.5 sm:p-4 md:p-6 bg-[#f4f6f9] ${activeTab === 'students' ? 'lg:overflow-hidden lg:h-[calc(100vh-56px)] h-auto overflow-y-auto flex flex-col' : 'overflow-y-auto'}`}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              students={students}
              teachers={teachers}
              onNavigateToTab={handleTabTrigger}
            />
          )}

          {activeTab === 'students' && (
            <StudentsTab
              students={students}
              currentRole={currentRole}
              onSaveStudent={handleSaveStudent}
              onRemoveStudent={handleRemoveStudent}
              onBulkRemoveStudents={handleBulkRemoveStudents}
              onImportCSV={handleSaveBulkStudents}
            />
          )}

          {activeTab === 'teachers' && (
            <TeachersTab
              teachers={teachers}
              currentRole={currentRole}
              onSaveTeacher={handleSaveTeacher}
              onRemoveTeacher={handleRemoveTeacher}
            />
          )}

          {activeTab === 'allocation' && (
            <AllocationTab
              students={students}
              teachers={teachers}
              currentRole={currentRole}
              onSaveBulkStudents={handleSaveBulkStudents}
            />
          )}

          {activeTab === 'promotion' && (
            <PromotionTab
              students={students}
              currentRole={currentRole}
              onSaveBulkStudents={handleSaveBulkStudents}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab
              students={students}
              teachers={teachers}
              schoolSettings={schoolSettings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              schoolSettings={schoolSettings}
              userProfiles={userProfiles}
              currentRole={currentRole}
              onSaveSettings={handleSaveSettings}
              onSaveProfile={handleSaveUserProfile}
              onTriggerRoleReload={setCurrentRole}
              students={students}
              teachers={teachers}
              onImportBackup={handleImportBackup}
            />
          )}
        </main>
      </div>

      {/* Login Popup Dialog */}
      {isLoginModalOpen && (
        <LoginModal
          userProfiles={userProfiles}
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}

      {/* Global Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
