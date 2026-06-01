/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, Teacher } from '../types';
import { toKhmerNumerals, getCombinedGrade, getRoomName, getKhmerFullName } from '../utils';
import { toast } from './Toast';

interface AllocationTabProps {
  students: Student[];
  teachers: Teacher[];
  currentRole: string;
  onSaveBulkStudents: (list: Student[]) => Promise<void>;
}

export const AllocationTab: React.FC<AllocationTabProps> = ({
  students,
  teachers,
  currentRole,
  onSaveBulkStudents,
}) => {
  // Selected configuration inputs
  const [selectedGrade, setSelectedGrade] = useState('7');
  const [mode, setMode] = useState<'by_rooms' | 'by_students'>('by_rooms');
  const [numRooms, setNumRooms] = useState(2);
  const [maxStudents, setMaxStudents] = useState(30);
  const [condition, setCondition] = useState<'alpha' | 'gender' | 'both'>('alpha');

  // Preview counts calculated reactively
  const [previewRooms, setPreviewRooms] = useState<Record<string, { total: number; female: number }>>({});

  const gradeStudents = students.filter((s) => getCombinedGrade(s) === selectedGrade && s.other !== 'បោះបង់');
  const unallocatedCount = gradeStudents.filter((s) => !s.room).length;

  useEffect(() => {
    recalcPreview();
  }, [students, selectedGrade, mode, numRooms, maxStudents]);

  const recalcPreview = () => {
    const list = students.filter((s) => getCombinedGrade(s) === selectedGrade && s.other !== 'បោះបង់');
    const counts: Record<string, { total: number; female: number }> = {};

    // check currently assigned
    list.forEach((s) => {
      if (s.room) {
        if (!counts[s.room]) counts[s.room] = { total: 0, female: 0 };
        counts[s.room].total++;
        if (s.gender === 'ស្រី') counts[s.room].female++;
      }
    });

    // Make sure we represent default alphabet slots if empty
    let expectedCount = 2;
    if (mode === 'by_rooms') {
      expectedCount = numRooms;
    } else {
      expectedCount = Math.ceil(list.length / maxStudents) || 1;
    }

    for (let i = 0; i < expectedCount; i++) {
      const rName = getRoomName(i);
      if (!counts[rName]) {
        counts[rName] = { total: 0, female: 0 };
      }
    }

    setPreviewRooms(counts);
  };

  const handleAutoAllocate = async () => {
    if (currentRole === 'User2') {
      toast.error('គណនីរបស់អ្នកមិនមានសិទ្ធិបែងចែកថ្នាក់ឡើយ!');
      return;
    }

    if (gradeStudents.length === 0) {
      toast.warning('មិនមានសិស្សនៅក្នុងកម្រិតថ្នាក់នេះដើម្បីបែងចែកទេ!');
      return;
    }

    let calculatedRoomsCount = numRooms;
    if (mode === 'by_students') {
      calculatedRoomsCount = Math.ceil(gradeStudents.length / maxStudents);
      if (calculatedRoomsCount < 1) calculatedRoomsCount = 1;
    }

    const roomsList: Student[][] = Array.from({ length: calculatedRoomsCount }, () => []);

    // Perform sorting according to configuration
    const sorted = [...gradeStudents];

    if (condition === 'alpha') {
      sorted.sort((a, b) => getKhmerFullName(a).localeCompare(getKhmerFullName(b), 'km'));
      sorted.forEach((student, index) => {
        const roomIdx = index % calculatedRoomsCount;
        roomsList[roomIdx].push(student);
      });
    } else if (condition === 'gender') {
      const males = sorted.filter((s) => s.gender === 'ប្រុស');
      const females = sorted.filter((s) => s.gender === 'ស្រី');

      females.forEach((student, index) => {
        const roomIdx = index % calculatedRoomsCount;
        roomsList[roomIdx].push(student);
      });
      males.forEach((student, index) => {
        const roomIdx = (index + females.length) % calculatedRoomsCount;
        roomsList[roomIdx].push(student);
      });
    } else {
      // Both (sorted and gender distributed)
      const males = sorted.filter((s) => s.gender === 'ប្រុស');
      const females = sorted.filter((s) => s.gender === 'ស្រី');

      males.sort((a, b) => getKhmerFullName(a).localeCompare(getKhmerFullName(b), 'km'));
      females.sort((a, b) => getKhmerFullName(a).localeCompare(getKhmerFullName(b), 'km'));

      females.forEach((student, index) => {
        const roomIdx = index % calculatedRoomsCount;
        roomsList[roomIdx].push(student);
      });
      males.forEach((student, index) => {
        const roomIdx = index % calculatedRoomsCount;
        roomsList[roomIdx].push(student);
      });
    }

    // Apply the newly balanced designations
    const adjustedStudents: Student[] = [];
    roomsList.forEach((studentsInRoom, roomIdx) => {
      const roomDesignation = getRoomName(roomIdx);
      studentsInRoom.forEach((student) => {
        adjustedStudents.push({
          ...student,
          room: roomDesignation,
        });
      });
    });

    // Merge into local list then dispatch to parent
    const mergedList = students.map((s) => {
      const found = adjustedStudents.find((a) => a.id === s.id);
      return found ? found : s;
    });

    await onSaveBulkStudents(mergedList);
    toast.success('ការបែងចែកថ្នាក់រៀនដោយស្វ័យប្រវត្តបានសម្រេច!');
  };

  const cannotEdit = currentRole === 'User2';

  return (
    <div className="space-y-6 animate-fade-in text-[14px]">
      <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
        <h3 className="font-moul text-blue-900 border-b pb-3 mb-4 tracking-wide text-[14px]">
          រៀបចំបែងចែកសិស្សទៅតាមថ្នាក់
        </h3>

        {/* ALERT BAR FOR NEW STUDENTS UNASSIGNED */}
        {unallocatedCount > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm mb-4 animate-pulse text-xs">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <span className="font-semibold text-amber-800 font-sans">
                មានសិស្សថ្មី <span className="underline font-bold text-red-655">{toKhmerNumerals(unallocatedCount)} នាក់</span> មិនទាន់បានរៀបចំថ្នាក់! សូមចុចប៊ូតុងបែងចែកថ្នាក់ខាងក្រោម។
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs font-sans">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ជ្រើសរើសកម្រិតថ្នាក់</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full border rounded-lg p-2.5 outline-none font-sans"
            >
              <option value="7">ថ្នាក់ទី 7</option>
              <option value="8">ថ្នាក់ទី 8</option>
              <option value="9">ថ្នាក់ទី 9</option>
              <option value="10">ថ្នាក់ទី 10</option>
              <option value="11 (វិទ្យាសាស្ត្រ)">ថ្នាក់ទី 11 (វិទ្យាសាស្ត្រ)</option>
              <option value="11 (សង្គម)">ថ្នាក់ទី 11 (សង្គម)</option>
              <option value="12 (វិទ្យាសាស្ត្រ)">ថ្នាក់ទី 12 (វិទ្យាសាស្ត្រ)</option>
              <option value="12 (សង្គម)">ថ្នាក់ទី 12 (សង្គម)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">របៀបកំណត់ចំនួនថ្នាក់</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50 bg-white">
                <input
                  type="radio"
                  name="alloc-mode"
                  checked={mode === 'by_rooms'}
                  onChange={() => setMode('by_rooms')}
                />
                <span className="font-medium text-xs">កំណត់ចំនួនថ្នាក់</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50 bg-white">
                <input
                  type="radio"
                  name="alloc-mode"
                  checked={mode === 'by_students'}
                  onChange={() => setMode('by_students')}
                />
                <span className="font-medium text-xs">កំណត់សិស្សក្នុង១ថ្នាក់</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs">
          {mode === 'by_rooms' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-750 mb-1">ចំនួនថ្នាក់ត្រូវបែងចែក (A, B, C...)</label>
              <input
                type="number"
                value={numRooms}
                onChange={(e) => setNumRooms(Math.max(1, parseInt(e.target.value, 10)) || 1)}
                min="1"
                max="50"
                className="w-full border rounded-lg p-2.5 outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ចំនួនសិស្សអតិបរមាក្នុងមួយថ្នាក់</label>
              <input
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(Math.max(5, parseInt(e.target.value, 10)) || 5)}
                min="5"
                max="100"
                className="w-full border rounded-lg p-2.5 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">លក្ខខណ្ឌនៃការរៀបចំ</label>
            <div className="space-y-1.5 mt-1 bg-slate-50 p-2.5 rounded-lg border">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="alloc-cond"
                  checked={condition === 'alpha'}
                  onChange={() => setCondition('alpha')}
                />
                <span>តាមអក្សរក្រម ឈ្មោះពេញរបស់សិស្ស</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="alloc-cond"
                  checked={condition === 'gender'}
                  onChange={() => setCondition('gender')}
                />
                <span>តាមសមាមាត្រភេទ (ស្រី/ប្រុស ស្មើគ្នា)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="alloc-cond"
                  checked={condition === 'both'}
                  onChange={() => setCondition('both')}
                />
                <span>តាមទាំងពីរ (លំដាប់ឈ្មោះ និងសមាមាត្រភេទ)</span>
              </label>
            </div>
          </div>
        </div>

        {!cannotEdit && (
          <div className="flex items-center justify-end border-t pt-4">
            <button
              onClick={handleAutoAllocate}
              className="bg-[#0f62ac] hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition shadow flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>ចាប់ផ្ដើមបែងចែកថ្នាក់</span>
            </button>
          </div>
        )}

        {/* Live Allocation Preview Panel */}
        <div className="space-y-4 mt-6">
          <h4 className="font-bold text-gray-700 text-xs font-moul tracking-wide mb-2">
            សម្គាល់អំពីថ្នាក់រៀន និងការបែងចែកថ្នាក់៖
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.keys(previewRooms)
              .sort()
              .map((roomLetter) => {
                const countInfo = previewRooms[roomLetter];
                const total = countInfo?.total || 0;
                const female = countInfo?.female || 0;

                if (total > 0) {
                  return (
                    <div key={roomLetter} className="border p-3.5 rounded-lg bg-emerald-50 border-emerald-250 flex justify-between items-center text-xs">
                      <span className="font-bold text-emerald-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                        ថ្នាក់ទី {selectedGrade} - {roomLetter}
                      </span>
                      <span className="font-medium text-emerald-900">
                        សរុប <span className="font-bold text-emerald-700">{toKhmerNumerals(total)}</span> នាក់ ស្រី <span className="font-bold text-emerald-700">{toKhmerNumerals(female)}</span> នាក់
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div key={roomLetter} className="border p-3.5 rounded-lg bg-red-50 border-red-200 flex justify-between items-center text-xs">
                      <span className="font-bold text-red-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse"></span>
                        ថ្នាក់ទី {selectedGrade} - {roomLetter}
                      </span>
                      <span className="font-medium text-red-500">
                        សរុប <span className="font-bold">{toKhmerNumerals(0)}</span> នាក់ ស្រី <span className="font-bold">{toKhmerNumerals(0)}</span> នាក់ <span className="text-[10px] ml-1 px-1.5 py-0.5 bg-red-100 rounded text-red-750">(មិនទាន់រៀបចំ)</span>
                      </span>
                    </div>
                  );
                }
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
