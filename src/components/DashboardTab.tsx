/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Student, Teacher } from '../types';
import { toKhmerNumerals, getCombinedGrade } from '../utils';

interface DashboardTabProps {
  students: Student[];
  teachers: Teacher[];
  onNavigateToTab: (tabId: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ students, teachers, onNavigateToTab }) => {
  // Filters active student set (exclude dropped-out pupils)
  const activeStudents = students.filter(s => s && s.other !== 'បោះបង់');
  const femaleCount = activeStudents.filter(s => s && s.gender === 'ស្រី').length;
  
  // Total unique classrooms based on student records
  const uniqueClassesList = new Set(
    activeStudents.filter(s => s && s.room).map(s => `${getCombinedGrade(s)}-${s.room}`)
  );
  
  // Grade levels array
  const grades = ['7', '8', '9', '10', '11 (វិទ្យាសាស្ត្រ)', '11 (សង្គម)', '12 (វិទ្យាសាស្ត្រ)', '12 (សង្គម)'];
  
  // Metric counts
  const unallocatedCount = activeStudents.filter(s => !s.room).length;
  
  // Group unallocated lists by grade
  const unallocatedByGrade: Record<string, { total: number; female: number }> = {};
  activeStudents.filter(s => !s.room).forEach(s => {
    const g = getCombinedGrade(s);
    if (!unallocatedByGrade[g]) {
      unallocatedByGrade[g] = { total: 0, female: 0 };
    }
    unallocatedByGrade[g].total++;
    if (s.gender === 'ស្រី') {
      unallocatedByGrade[g].female++;
    }
  });

  // Empty classrooms listing (teachers assigned to classes having 0 children)
  const unallocatedClasses: string[] = [];
  teachers.forEach(t => {
    const count = activeStudents.filter(s => getCombinedGrade(s) === t.grade && s.room === t.room).length;
    if (count === 0 && t.grade && t.room) {
      unallocatedClasses.push(`ថ្នាក់ទី ${t.grade} - ${t.room}`);
    }
  });

  // Dropout / Repeaters / Promoted aggregate statistics
  const totalDropouts = students.filter(s => s && s.other === 'បោះបង់').length;
  const femaleDropouts = students.filter(s => s && s.gender === 'ស្រី' && s.other === 'បោះបង់').length;

  const totalRepeaters = students.filter(s => s && s.other === 'ត្រួតថ្នាក់').length;
  const femaleRepeaters = students.filter(s => s && s.gender === 'ស្រី' && s.other === 'ត្រួតថ្នាក់').length;

  const totalPromoted = students.filter(s => s && (s.other === 'ឡើងថ្នាក់' || s.other === 'បញ្ចប់ការសិក្សា')).length;
  const femalePromoted = students.filter(s => s && s.gender === 'ស្រី' && (s.other === 'ឡើងថ្នាក់' || s.other === 'បញ្ចប់ការសិក្សា')).length;

  return (
    <div className="space-y-3.5 animate-fade-in text-[14px]">
      {/* Alert Banner for Unallocated New Entrants */}
      {unallocatedCount > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-lg shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span className="font-semibold text-amber-800">
              សម្គាល់៖ មានសិស្សថ្មី <span className="underline font-bold text-red-655">{toKhmerNumerals(unallocatedCount)} នាក់</span> មិនទាន់បានរៀបចំថ្នាក់! សូមចូលទៅកាន់ផ្ទាំង <span className="underline cursor-pointer text-blue-600" onClick={() => onNavigateToTab('allocation')}>បែងចែកថ្នាក់រៀន</span> ដើម្បីរៀបចំ។
            </span>
          </div>
        </div>
      )}

      {/* Grid of stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/50 border-l-4 border-blue-600">
          <p className="text-[13px] text-gray-500 font-semibold">សិស្សសរុប</p>
          <p className="text-2xl font-black text-gray-800 mt-0.5">{toKhmerNumerals(activeStudents.length)} នាក់</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/50 border-l-4 border-pink-500">
          <p className="text-[13px] text-gray-500 font-semibold">សិស្សស្រី</p>
          <p className="text-2xl font-black text-pink-600 mt-0.5">{toKhmerNumerals(femaleCount)} នាក់</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/50 border-l-4 border-indigo-500">
          <p className="text-[13px] text-gray-500 font-semibold">គ្រូបន្ទុកថ្នាក់សរុប</p>
          <p className="text-2xl font-black text-indigo-600 mt-0.5">{toKhmerNumerals(teachers.length)} នាក់</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/50 border-l-4 border-green-500">
          <p className="text-[13px] text-gray-500 font-semibold">ថ្នាក់រៀនសរុប</p>
          <p className="text-2xl font-black text-green-600 mt-0.5">{toKhmerNumerals(uniqueClassesList.size)} ថ្នាក់</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Progress Meters per Grade level */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-moul tracking-wide text-xs text-blue-900 border-b pb-2.5 mb-3">ចំនួនសិស្សតាមកម្រិតថ្នាក់ (សរុប និងសិស្សស្រី)</h3>
          <div className="space-y-2.5">
            {grades.map(g => {
              const gradeStudents = activeStudents.filter(s => getCombinedGrade(s) === g);
              const count = gradeStudents.length;
              const fCount = gradeStudents.filter(s => s.gender === 'ស្រី').length;
              const widthPct = activeStudents.length > 0 ? (count / activeStudents.length) * 100 : 0;

              return (
                <div key={g}>
                  <div className="flex justify-between text-xs font-semibold text-gray-600 mb-0.5">
                    <span>ថ្នាក់ទី {g}</span>
                    <span>សរុប៖ {toKhmerNumerals(count)} នាក់ (ស្រី៖ {toKhmerNumerals(fCount)} នាក់)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${widthPct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Secondary Detailed Metrics */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
          <h3 className="font-moul text-xs text-blue-900 border-b pb-2.5">ព័ត៌មានលម្អិត និងស្ថិតិបន្ថែម</h3>

          {/* Block 1: Unallocated Grade Level Stats */}
          <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl">
            <h4 className="font-bold text-amber-900 text-[13px] mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
              ព័ត៌មានសិស្សចូលថ្មីមិនទាន់មានថ្នាក់រៀន ({toKhmerNumerals(unallocatedCount)} នាក់)
            </h4>
            <div className="space-y-0.5 pl-3.5">
              {Object.keys(unallocatedByGrade).length > 0 ? (
                Object.keys(unallocatedByGrade).map(g => (
                  <div key={g} className="text-xs text-amber-800 font-semibold">
                    • កម្រិតថ្នាក់ទី {g} ៖ សិស្សសរុប {toKhmerNumerals(unallocatedByGrade[g].total)} នាក់ (ស្រី {toKhmerNumerals(unallocatedByGrade[g].female)} នាក់)
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 font-medium">គ្មានសិស្សថ្មីមិនទាន់មានថ្នាក់រៀនទេ</div>
              )}
            </div>
          </div>

          {/* Block 2: Unallocated Teachers */}
          <div className="bg-rose-550 border border-rose-100 p-3 rounded-xl bg-rose-50/55">
            <h4 className="font-bold text-rose-900 text-[13px] mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              ថ្នាក់រៀនដែលមិនទាន់បានបែងចែកសិស្ស ({toKhmerNumerals(unallocatedClasses.length)} ថ្នាក់)
            </h4>
            <div className="space-y-0.5 pl-3.5">
              {unallocatedClasses.length > 0 ? (
                unallocatedClasses.map(c => (
                  <div key={c} className="text-xs text-rose-800 font-semibold">
                    • {c}
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 font-medium">គ្រប់ថ្នាក់រៀនទាំងអស់ត្រូវបានបែងចែករួចរាល់</div>
              )}
            </div>
          </div>

          {/* Block 3: Grid of Historic States */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center">
              <h5 className="text-gray-500 font-semibold text-xs mb-0.5">សិស្សបោះបង់ការសិក្សា</h5>
              <p className="text-xs font-bold text-slate-700">សរុប {toKhmerNumerals(totalDropouts)} នាក់</p>
              <p className="text-[10px] text-pink-500 font-bold">ស្រី {toKhmerNumerals(femaleDropouts)} នាក់</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center">
              <h5 className="text-gray-500 font-semibold text-xs mb-0.5">ចំនួនសិស្សត្រួតថ្នាក់</h5>
              <p className="text-xs font-bold text-slate-700">សរុប {toKhmerNumerals(totalRepeaters)} នាក់</p>
              <p className="text-[10px] text-pink-500 font-bold">ស្រី {toKhmerNumerals(femaleRepeaters)} នាក់</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center">
              <h5 className="text-gray-500 font-semibold text-xs mb-0.5">សិស្សឡើងថ្នាក់</h5>
              <p className="text-xs font-bold text-slate-700">សរុប {toKhmerNumerals(totalPromoted)} នាក់</p>
              <p className="text-[10px] text-pink-500 font-bold">ស្រី {toKhmerNumerals(femalePromoted)} នាក់</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
