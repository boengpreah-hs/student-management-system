/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student } from '../types';
import { toKhmerNumerals, formatKhmerDate, getKhmerFullName, getCombinedGrade } from '../utils';
import { toast } from './Toast';

interface PromotionTabProps {
  students: Student[];
  currentRole: string;
  onSaveBulkStudents: (list: Student[]) => Promise<void>;
}

export const PromotionTab: React.FC<PromotionTabProps> = ({
  students,
  currentRole,
  onSaveBulkStudents,
}) => {
  // Selected Filter Class
  const [filterGrade, setFilterGrade] = useState('');
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);

  // List of active students (excluding dropped out)
  const activeStudents = students.filter((s) => s && s.other !== 'បោះបង់');

  const filtered = activeStudents.filter((s) => {
    return filterGrade === '' || getCombinedGrade(s) === filterGrade;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIDs(filtered.map((s) => s.id));
    } else {
      setSelectedIDs([]);
    }
  };

  const handleRowCheckboxChange = (id: string) => {
    if (selectedIDs.includes(id)) {
      setSelectedIDs(selectedIDs.filter((x) => x !== id));
    } else {
      setSelectedIDs([...selectedIDs, id]);
    }
  };

  // Up grade promo logic
  const handlePromote = async () => {
    if (currentRole === 'User2') {
      toast.error('គណនីរបស់អ្នកមិនមានសិទ្ធិកែប្រែព័ត៌មានឡើយ!');
      return;
    }

    if (selectedIDs.length === 0) {
      toast.warning('សូមជ្រើសរើសសិស្សយ៉ាងហោចណាស់ម្នាក់ដើម្បីឡើងថ្នាក់!');
      return;
    }

    const confirmation = confirm(
      `តើអ្នកពិតជាចង់ដំឡើងថ្នាក់សិស្សដែលបានជ្រើសរើសចំនួន ${toKhmerNumerals(selectedIDs.length)} នាក់មែនទេ?`
    );
    if (!confirmation) return;

    const updatedList = students.map((s) => {
      if (selectedIDs.includes(s.id)) {
        const payload = { ...s };
        const oldGrade = payload.grade;

        if (oldGrade === '7') { payload.grade = '8'; payload.room = ''; }
        else if (oldGrade === '8') { payload.grade = '9'; payload.room = ''; }
        else if (oldGrade === '9') { payload.grade = '10'; payload.room = ''; }
        else if (oldGrade === '10') {
          payload.grade = '11';
          payload.room = '';
          if (payload.classType === 'ទូទៅ') payload.classType = 'វិទ្យាសាស្ត្រ';
        } else if (oldGrade === '11') {
          payload.grade = '12';
          payload.room = '';
        } else if (oldGrade === '12') {
          payload.other = 'ឡើងថ្នាក់'; // Graduate
          payload.room = '';
        }

        if (payload.other === 'ត្រួតថ្នាក់') {
          payload.other = '';
        }
        return payload;
      }
      return s;
    });

    await onSaveBulkStudents(updatedList);
    setSelectedIDs([]);
    toast.success('ការដំឡើងកម្រិតថ្នាក់ត្រូវបានបញ្ចប់!');
  };

  // Repeating logic
  const handleRepeat = async () => {
    if (currentRole === 'User2') {
      toast.error('គណនីរបស់អ្នកមិនមានសិទ្ធិកែប្រែព័ត៌មានឡើយ!');
      return;
    }

    if (selectedIDs.length === 0) {
      toast.warning('សូមជ្រើសរើសសិស្សយ៉ាងហោចណាស់ម្នាក់ដើម្បីកំណត់ជាត្រួតថ្នាក់!');
      return;
    }

    const confirmation = confirm(
      `តើអ្នកពិតជាចង់កំណត់សិស្សដែលបានជ្រើសរើសចំនួន ${toKhmerNumerals(selectedIDs.length)} នាក់ជា "ត្រួតថ្នាក់" មែនទេ?`
    );
    if (!confirmation) return;

    const updatedList = students.map((s) => {
      if (selectedIDs.includes(s.id)) {
        return {
          ...s,
          other: 'ត្រួតថ្នាក់',
        };
      }
      return s;
    });

    await onSaveBulkStudents(updatedList);
    setSelectedIDs([]);
    toast.success('បានកំណត់ស្ថានភាពជាត្រួតថ្នាក់ជោគជ័យ!');
  };

  const gradesArray = ['7', '8', '9', '10', '11 (វិទ្យាសាស្ត្រ)', '11 (សង្គម)', '12 (វិទ្យាសាស្ត្រ)', '12 (សង្គម)'];

  return (
    <div className="space-y-6 animate-fade-in text-[14px]">
      {/* Summary grid */}
      <div className="bg-white p-5 rounded-xl shadow border border-slate-200">
        <h3 className="font-moul text-blue-900 border-b pb-3 mb-4 text-xs tracking-wide">
          ស្ថិតិសិស្សតាមកម្រិតថ្នាក់បច្ចុប្បន្ន
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {gradesArray.map((g) => {
            const list = activeStudents.filter((s) => getCombinedGrade(s) === g);
            const females = list.filter((s) => s.gender === 'ស្រី').length;
            return (
              <div key={g} className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-center text-xs">
                <p className="font-bold text-blue-900 mb-1">ថ្នាក់ទី {g}</p>
                <p className="font-bold text-slate-700">
                  សរុប {toKhmerNumerals(list.length)} នាក់ (ស្រី {toKhmerNumerals(females)})
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3 mb-4 gap-3">
          <h3 className="font-moul text-blue-900 text-xs tracking-wide">គ្រប់គ្រង និងចាត់ចែងការឡើងថ្នាក់</h3>

          {/* Upgrades Filter Panel */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={filterGrade}
              onChange={(e) => {
                setFilterGrade(e.target.value);
                setSelectedIDs([]);
              }}
              className="bg-white border rounded-lg p-2 outline-none font-sans"
            >
              <option value="">-- បង្ហាញសិស្សគ្រប់ថ្នាក់ --</option>
              {gradesArray.map((g) => (
                <option key={g} value={g}>
                  ថ្នាក់ទី {g}
                </option>
              ))}
            </select>

            <button
              onClick={handlePromote}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              ឡើងកម្រិតថ្នាក់
            </button>

            <button
              onClick={handleRepeat}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer"
            >
              កំណត់សិស្សត្រួតថ្នាក់
            </button>
          </div>
        </div>

        {/* Directory candidates list */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="min-w-[1400px] lg:min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
              <tr className="text-xs">
                <th className="p-2.5 text-center w-12">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIDs.length === filtered.length}
                    onChange={handleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="p-2.5 text-left w-24">អត្តលេខ</th>
                <th className="p-2.5 text-left">គោត្តនាម-នាម</th>
                <th className="p-2.5 text-center w-16">ភេទ</th>
                <th className="p-2.5 text-center w-28 whitespace-nowrap">ថ្ងៃខែឆ្នាំកំណើត</th>
                <th className="p-2.5 text-left">ទីកន្លែងកំណើត</th>
                <th className="p-2.5 text-left">ឈ្មោះឪពុក</th>
                <th className="p-2.5 text-left">ឈ្មោះម្ដាយ</th>
                <th className="p-2.5 text-center">លេខទូរស័ព្ទអាណាព្យាបាល</th>
                <th className="p-2.5 text-center w-24">កម្រិតថ្នាក់</th>
                <th className="p-2.5 text-center w-16">បន្ទប់</th>
                <th className="p-2.5 text-left">ផ្សេងៗ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length > 0 ? (
                filtered.map((s) => {
                  const pob = [s.pobVillage, s.pobCommune, s.pobDistrict, s.pobProvince].filter(Boolean).join(' ');
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 text-xs font-sans text-slate-800">
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIDs.includes(s.id)}
                          onChange={() => handleRowCheckboxChange(s.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-bold text-blue-850 font-mono">{s.id}</td>
                      <td className="p-2.5 font-medium">{getKhmerFullName(s)}</td>
                      <td className="p-2.5 text-center">{s.gender}</td>
                      <td className="p-2.5 text-center font-mono whitespace-nowrap">{formatKhmerDate(s.dob)}</td>
                      <td className="p-2.5 text-left text-slate-655">{pob || '-'}</td>
                      <td className="p-2.5 text-left">{s.fatherName || '-'}</td>
                      <td className="p-2.5 text-left">{s.motherName || '-'}</td>
                      <td className="p-2.5 text-center font-mono">{s.guardianPhone || '-'}</td>
                      <td className="p-2.5 text-center font-bold">ថ្នាក់ទី {getCombinedGrade(s)}</td>
                      <td className="p-2.5 text-center">
                        {s.room ? (
                          <span className="font-bold text-green-700">{s.room}</span>
                        ) : (
                          <span className="text-red-500 bg-red-50 px-1 py-0.5 rounded leading-none text-[10px]">គ្មាន</span>
                        )}
                      </td>
                      <td className="p-2.5 text-left font-sans text-[11px] text-slate-550">{s.other || '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-gray-500 font-sans">
                    មិនមានទិន្នន័យសិស្សឡើយ។
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
