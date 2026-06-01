/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Teacher } from '../types';
import { toKhmerNumerals } from '../utils';

interface TeachersTabProps {
  teachers: Teacher[];
  currentRole: string;
  onSaveTeacher: (teacher: Teacher) => Promise<void>;
  onRemoveTeacher: (id: string) => Promise<void>;
}

export const TeachersTab: React.FC<TeachersTabProps> = ({
  teachers,
  currentRole,
  onSaveTeacher,
  onRemoveTeacher,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'ប្រុស' | 'ស្រី'>('ប្រុស');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState('7');
  const [room, setRoom] = useState('A');

  const [editTeacherID, setEditTeacherID] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Teacher = {
      id: editTeacherID || 'T' + Date.now().toString().slice(-3),
      name,
      gender,
      phone,
      grade,
      room,
    };

    await onSaveTeacher(payload);
    resetForm();
  };

  const resetForm = () => {
    setEditTeacherID(null);
    setName('');
    setGender('ប្រុស');
    setPhone('');
    setGrade('7');
    setRoom('A');
  };

  const handleEdit = (t: Teacher) => {
    setEditTeacherID(t.id);
    setName(t.name);
    setGender(t.gender);
    setPhone(t.phone);
    setGrade(t.grade);
    setRoom(t.room);
  };

  const handleDelete = async (id: string) => {
    if (confirm('តើអ្នកពិតជាចង់លុបគ្រូនេះមែនទេ?')) {
      await onRemoveTeacher(id);
    }
  };

  const canEdit = currentRole === 'Admin' || currentRole === 'User1';

  return (
    <div className="space-y-6 animate-fade-in text-[14px]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Insert / Edit Teacher Form */}
        {canEdit && (
          <div className="bg-white p-5 rounded-xl shadow border border-slate-200">
            <h3 className="font-moul text-blue-900 border-b pb-3 mb-4 text-xs tracking-wide">
              {editTeacherID ? 'កែតម្រូវព័ត៌មានគ្រូ' : 'បញ្ចូលព័ត៌មានគ្រូបន្ទុកថ្នាក់'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">ឈ្មោះលោកគ្រូ/អ្នកគ្រូ</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="វាយឈ្មោះគ្រូទីនេះ..."
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">ភេទ</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                >
                  <option value="ប្រុស">ប្រុស</option>
                  <option value="ស្រី">ស្រី</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">លេខទូរស័ព្ទ</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="០XXXXXXXX"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">កម្រិតថ្នាក់</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
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
                  <label className="block font-medium text-gray-700 mb-1">បន្ទប់/ថ្នាក់</label>
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                {editTeacherID ? (
                  <>
                    <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition">
                      រក្សាទុក
                    </button>
                    <button type="button" onClick={resetForm} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition">
                      បោះបង់
                    </button>
                  </>
                ) : (
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.1" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                    </svg>
                    រក្សាទុកព័ត៌មានគ្រូ
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Teachers List Table Panel */}
        <div className={`bg-white p-5 rounded-xl shadow border border-slate-200 ${canEdit ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <h3 className="font-moul text-blue-900 border-b pb-3 mb-4 text-xs tracking-wide">
            បញ្ជីឈ្មោះគ្រូបន្ទុកថ្នាក់
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold">
                <tr>
                  <th className="p-2.5 text-center w-12">ល.រ</th>
                  <th className="p-2.5">ឈ្មោះគ្រូ</th>
                  <th className="p-2.5 text-center">ភេទ</th>
                  <th className="p-2.5">ទូរស័ព្ទ</th>
                  <th className="p-2.5 text-center">កម្រិតថ្នាក់</th>
                  <th className="p-2.5 text-center">ថ្នាក់/បន្ទប់</th>
                  {currentRole === 'Admin' && <th className="p-2.5 text-center">សកម្មភាព</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teachers.length > 0 ? (
                  teachers.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50 text-slate-800 font-sans">
                      <td className="p-2.5 text-center font-mono font-medium">{idx + 1}</td>
                      <td className="p-2.5 font-bold">{t.name}</td>
                      <td className="p-2.5 text-center">{t.gender}</td>
                      <td className="p-2.5 font-mono">{t.phone}</td>
                      <td className="p-2.5 text-center font-bold">ថ្នាក់ទី {t.grade}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-indigo-700">{t.room}</td>
                      {currentRole === 'Admin' && (
                        <td className="p-2.5 text-center">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleEdit(t)}
                              className="p-1.5 bg-white border border-blue-100 hover:border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 hover:scale-105 transition cursor-pointer shadow-sm"
                              title="កែសម្រួល"
                            >
                              <Edit2 className="w-3.5 h-3.5 shrink-0" />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1.5 bg-white border border-red-100 hover:border-red-300 text-red-600 rounded-lg hover:bg-red-50 hover:scale-105 transition cursor-pointer shadow-sm"
                              title="លុប"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-450 font-medium font-sans">
                      មិនមានព័ត៌មានគ្រូបន្ទុកថ្នាក់ឡើយ។
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
