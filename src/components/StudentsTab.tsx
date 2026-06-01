/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Edit2, Trash2, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { Student } from '../types';
import { toKhmerNumerals, formatKhmerDate, getKhmerFullName, getCombinedGrade, parseCSV, normalizeDateToISO } from '../utils';
import { toast } from './Toast';

interface StudentsTabProps {
  students: Student[];
  currentRole: string;
  onSaveStudent: (student: Student) => Promise<void>;
  onRemoveStudent: (id: string) => Promise<void>;
  onBulkRemoveStudents: (scope: string, type: string, targetGrade?: string, selectedIDs?: string[]) => Promise<void>;
  onImportCSV: (list: Student[]) => Promise<void>;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  currentRole,
  onSaveStudent,
  onRemoveStudent,
  onBulkRemoveStudents,
  onImportCSV,
}) => {
  // Local Form state
  const [formStudentID, setFormStudentID] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [gender, setGender] = useState<'ប្រុស' | 'ស្រី'>('ប្រុស');
  const [dob, setDob] = useState('');
  const [grade, setGrade] = useState('7');
  const [classType, setClassType] = useState<'ទូទៅ' | 'វិទ្យាសាស្ត្រ' | 'សង្គម'>('ទូទៅ');
  const [room, setRoom] = useState('');
  const [village, setVillage] = useState('');
  const [commune, setCommune] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherJob, setFatherJob] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherJob, setMotherJob] = useState('');
  const [phone, setPhone] = useState('');
  const [other, setOther] = useState('');

  const [editModeID, setEditModeID] = useState<string | null>(null);

  // Filters State
  const [searchText, setSearchText] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterGender, setFilterGender] = useState('');

  // Bulk / Selection Checkbox State
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkScope, setBulkScope] = useState('all');
  const [bulkType, setBulkType] = useState('permanent');

  // Single Delete Choice state
  const [singleDeleteTargetID, setSingleDeleteTargetID] = useState<string | null>(null);
  const [singleDeleteOption, setSingleDeleteOption] = useState('permanent');

  // Recommendation text based on active weight distributions
  const [roomRec, setRoomRec] = useState('');

  // Auto incremental ID logic
  const getNextAvailableID = () => {
    if (students.length === 0) return '1001';
    let maxVal = 1000;
    students.forEach((s) => {
      const parsed = parseInt(s.id.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed > maxVal) {
        maxVal = parsed;
      }
    });
    return (maxVal + 1).toString();
  };

  // Trigger form ID setup
  useEffect(() => {
    if (!editModeID) {
      setFormStudentID(getNextAvailableID());
    }
  }, [students, editModeID]);

  // Compute room recommendation alert
  useEffect(() => {
    const active = students.filter((s) => getCombinedGrade(s) === grade && s.room && s.other !== 'បោះបង់');
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    active.forEach((s) => {
      if (counts[s.room] !== undefined) {
        counts[s.room] += s.gender === gender ? 1.5 : 1.0;
      }
    });

    let bestRoom = 'A';
    let minWeight = Infinity;
    for (const r in counts) {
      if (counts[r] < minWeight) {
        minWeight = counts[r];
        bestRoom = r;
      }
    }
    setRoomRec(`💡 ប្រព័ន្ធណែនាំ៖ សិស្សនេះគួរចូលរៀនថ្នាក់ "ថ្នាក់ទី ${grade} - ${bestRoom}" ដើម្បីរក្សាសមាមាត្រសិស្សក្នុងថ្នាក់ឱ្យស្មើគ្នា។`);
  }, [grade, gender, students]);

  // Adjust disabled properties depending on grade range selection
  const handleGradeChange = (val: string) => {
    setGrade(val);
    if (['7', '8', '9', '10'].includes(val)) {
      setClassType('ទូទៅ');
    } else if (classType === 'ទូទៅ') {
      setClassType('វិទ្យាសាស្ត្រ');
    }
  };

  // Submit/Add Student
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalID = formStudentID.trim() || getNextAvailableID();

    if (!editModeID && students.some((s) => s.id === finalID)) {
      toast.error(`កំហុស៖ អត្តលេខ "${finalID}" នេះមានក្នុងប្រព័ន្ធរួចហើយ!`);
      return;
    }

    const payload: Student = {
      id: finalID,
      lastName,
      firstName,
      gender,
      dob,
      grade,
      classType,
      room,
      pobVillage: village,
      pobCommune: commune,
      pobDistrict: district,
      pobProvince: province,
      fatherName,
      fatherJob,
      motherName,
      motherJob,
      guardianPhone: phone,
      other,
    };

    await onSaveStudent(payload);
    resetForm();
  };

  const resetForm = () => {
    setEditModeID(null);
    setLastName('');
    setFirstName('');
    setGender('ប្រុស');
    setDob('');
    setGrade('7');
    setClassType('ទូទៅ');
    setRoom('');
    setVillage('');
    setCommune('');
    setDistrict('');
    setProvince('');
    setFatherName('');
    setFatherJob('');
    setMotherName('');
    setMotherJob('');
    setPhone('');
    setOther('');
    setFormStudentID(getNextAvailableID());
  };

  const handleEdit = (s: Student) => {
    setEditModeID(s.id);
    setFormStudentID(s.id);
    setLastName(s.lastName);
    setFirstName(s.firstName);
    setGender(s.gender);
    setDob(s.dob);
    setGrade(s.grade);
    setClassType(s.classType);
    setRoom(s.room);
    setVillage(s.pobVillage || '');
    setCommune(s.pobCommune || '');
    setDistrict(s.pobDistrict || '');
    setProvince(s.pobProvince || '');
    setFatherName(s.fatherName || '');
    setFatherJob(s.fatherJob || '');
    setMotherName(s.motherName || '');
    setMotherJob(s.motherJob || '');
    setPhone(s.guardianPhone || '');
    setOther(s.other || '');
  };

  const handleSingleDeleteSubmit = async () => {
    if (!singleDeleteTargetID) return;
    if (singleDeleteOption === 'permanent') {
      await onRemoveStudent(singleDeleteTargetID);
    } else {
      const target = students.find((s) => s.id === singleDeleteTargetID);
      if (target) {
        await onSaveStudent({ ...target, other: 'បោះបង់' });
      }
    }
    setSingleDeleteTargetID(null);
  };

  // Export to Excel Native Function
  const handleExportXLSX = () => {
    const activeSet = getFilteredStudents();
    if (activeSet.length === 0) {
      toast.warning('គ្មានទិន្នន័យចាំបាច់សម្រាប់ទាញយកទេ!');
      return;
    }

    const payload = activeSet.map((s) => ({
      អត្តលេខ: s.id,
      នាមត្រកូល: s.lastName,
      នាមខ្លួន: s.firstName,
      ឈ្មោះពេញ: getKhmerFullName(s),
      ភេទ: s.gender,
      ថ្ងៃខែឆ្នាំកំណើត: formatKhmerDate(s.dob),
      កម្រិតថ្នាក់: getCombinedGrade(s),
      'ថ្នាក់-បន្ទប់': s.room || 'គ្មាន',
      ភូមិ: s.pobVillage || '',
      ឃុំ: s.pobCommune || '',
      ស្រុក: s.pobDistrict || '',
      ខេត្ត: s.pobProvince || '',
      ឈ្មោះឪពុក: s.fatherName || '',
      ឈ្មោះម្ដាយ: s.motherName || '',
      លេខទូរស័ព្ទអាណាព្យាបាល: s.guardianPhone || '',
      ផ្សេងៗ: s.other || '',
    }));

    const ws = XLSX.utils.json_to_sheet(payload);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'សិស្ស');
    XLSX.writeFile(wb, 'SMS_បញ្ជីរាយនាមសិស្ស.xlsx');
  };

  // CSV Import Trigger
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const csvMatrix = parseCSV(text);
      if (csvMatrix.length < 2) return;

      const importPayload: Student[] = [];
      let count = 0;

      for (let i = 1; i < csvMatrix.length; i++) {
        const cols = csvMatrix[i];
        if (cols.length >= 3) {
          const sId = cols[0] || (Date.now() + count).toString().slice(-4);
          const sLastName = cols[1] || '';
          const sFirstName = cols[2] || '';
          const sGender = (cols[3] === 'ស្រី' ? 'ស្រី' : 'ប្រុស') as 'ប្រុស' | 'ស្រី';
          const sDob = normalizeDateToISO(cols[4]);
          const sGrade = cols[5] || '7';
          const sClassType = (cols[6] || 'ទូទៅ') as 'ទូទៅ' | 'វិទ្យាសាស្ត្រ' | 'សង្គម';
          const sRoom = cols[7] || '';
          const sVillage = cols[8] || '';
          const sCommune = cols[9] || '';
          const sDistrict = cols[10] || '';
          const sProvince = cols[11] || '';
          const sFatherName = cols[12] || '';
          const sFatherJob = cols[13] || '';
          const sMotherName = cols[14] || '';
          const sMotherJob = cols[15] || '';
          const sPhone = cols[16] || '';
          const sOther = cols[17] || '';

          importPayload.push({
            id: sId,
            lastName: sLastName,
            firstName: sFirstName,
            gender: sGender,
            dob: sDob,
            grade: sGrade,
            classType: sClassType,
            room: sRoom,
            pobVillage: sVillage,
            pobCommune: sCommune,
            pobDistrict: sDistrict,
            pobProvince: sProvince,
            fatherName: sFatherName,
            fatherJob: sFatherJob,
            motherName: sMotherName,
            motherJob: sMotherJob,
            guardianPhone: sPhone,
            other: sOther,
          });
          count++;
        }
      }

      // Merge current list and append
      const merged = [...students];
      importPayload.forEach((s) => {
        const idx = merged.findIndex((m) => m.id === s.id);
        if (idx !== -1) {
          merged[idx] = s;
        } else {
          merged.push(s);
        }
      });

      await onImportCSV(merged);
      toast.success(`បាននាំចូលសិស្សចំនួន ${count} នាក់ដោយជោគជ័យ!`);
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleDownloadCSVTemplate = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "អត្តលេខ,នាមត្រកូល,នាមខ្លួន,ភេទ,ថ្ងៃខែឆ្នាំកំណើត,កម្រិតថ្នាក់,ប្រភេទថ្នាក់,ថ្នាក់-បន្ទប់,ភូមិ,ឃុំ,ស្រុក,ខេត្ត,ឈ្មោះឪពុក,មុខរបរឪពុក,ឈ្មោះម្ដាយ,មុខរបរម្ដាយ,លេខទូរស័ព្ទអាណាព្យាបាល,ផ្សេងៗ\n";
    csvContent += "1007,សុខ,សុភ័ក្រ,ប្រុស,2010-05-12,7,ទូទៅ,A,ព្រែកលៀប,ព្រែកលៀប,ជ្រោយចង្វារ,ភ្នំពេញ,សុខ សាខន,អាជីវករ,គង់ សារី,មេផ្ទះ,012 999 888,-\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "SMS_គំរូបញ្ជីឈ្មោះសិស្ស.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Database Filtering Core Block
  const getFilteredStudents = () => {
    const query = searchText.toLowerCase().trim();
    return students.filter((s) => {
      if (!s) return false;
      if (s.other === 'បោះបង់') return false; // Exclude dropped students

      const nameMatch = getKhmerFullName(s).toLowerCase().includes(query) || s.id.toLowerCase().includes(query);
      const gradeMatch = filterGrade === '' || getCombinedGrade(s) === filterGrade;
      
      let roomMatch = true;
      if (filterRoom === 'គ្មាន') {
        roomMatch = !s.room;
      } else if (filterRoom !== '') {
        roomMatch = s.room === filterRoom;
      }

      const genderMatch = filterGender === '' || s.gender === filterGender;

      return nameMatch && gradeMatch && roomMatch && genderMatch;
    });
  };

  const filtered = getFilteredStudents();
  const filteredFemales = filtered.filter((s) => s.gender === 'ស្រី').length;
  const filteredMales = filtered.length - filteredFemales;

  const toggleSelectRow = (id: string) => {
    if (selectedIDs.includes(id)) {
      setSelectedIDs(selectedIDs.filter((x) => x !== id));
    } else {
      setSelectedIDs([...selectedIDs, id]);
    }
  };

  const handleSelectAllCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIDs(filtered.map((s) => s.id));
    } else {
      setSelectedIDs([]);
    }
  };

  const handleSelectAllDirectFilter = () => {
    setSelectedIDs(filtered.map((s) => s.id));
  };

  const handleSelectByGrade = () => {
    if (!filterGrade) {
      toast.warning('សូមជ្រើសរើសកម្រិតថ្នាក់ណាមួយក្នុងតម្រងច្រោះជាមុនសិន!');
      return;
    }
    const matching = filtered.filter((s) => getCombinedGrade(s) === filterGrade).map((s) => s.id);
    setSelectedIDs(matching);
  };

  const handleBulkDeleteAction = async () => {
    await onBulkRemoveStudents(bulkScope, bulkType, filterGrade || undefined, selectedIDs);
    setIsBulkDeleteOpen(false);
    setSelectedIDs([]);
  };

  // Grid list of headers
  const gradesArray = ['7', '8', '9', '10', '11 (វិទ្យាសាស្ត្រ)', '11 (សង្គម)', '12 (វិទ្យាសាស្ត្រ)', '12 (សង្គម)'];

  // Check roles permissions
  const cannotEdit = currentRole === 'User2';

  return (
    <div className="lg:h-full h-auto flex flex-col space-y-4 animate-fade-in text-[14px] lg:min-h-0 lg:overflow-hidden">
      {/* Dynamic Grade Level Counter Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 shrink-0">
        {gradesArray.map((g) => {
          const list = students.filter((s) => getCombinedGrade(s) === g && s.other !== 'បោះបង់');
          const female = list.filter((s) => s.gender === 'ស្រី').length;
          return (
            <div key={g} className="bg-white px-2 py-1.5 rounded-lg border border-slate-150 shadow-sm text-center flex flex-col justify-center h-12 transition hover:shadow">
              <p className="text-[10px] font-bold text-slate-500 leading-none">ថ្នាក់ទី {g}</p>
              <div className="flex items-center justify-center gap-1 mt-1 leading-none text-[11px]">
                <span className="font-extrabold text-blue-900">{toKhmerNumerals(list.length)}នាក់</span>
                <span className="text-[9px] font-semibold text-pink-500 shrink-0 select-none">(ស្រី៖{toKhmerNumerals(female)})</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* Registration Form Left Panel */}
        {!cannotEdit && (
          <div className="bg-white p-5 rounded-2xl shadow border border-slate-200 overflow-y-auto h-full">
            <h3 className="font-moul text-blue-900 text-[14px] tracking-wide border-b pb-3 mb-4">
              {editModeID ? 'កែតម្រូវព័ត៌មានសិស្ស' : 'បញ្ចូលព័ត៌មានសិស្ស'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">អត្តលេខសិស្ស (ស្វ័យប្រវត្តិ/កែប្រែបាន)</label>
                <input
                  type="text"
                  value={formStudentID}
                  onChange={(e) => setFormStudentID(e.target.value)}
                  required
                  className="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">នាមត្រកូល <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full border rounded-lg p-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">នាមខ្លួន <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full border rounded-lg p-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ភេទ <span className="text-red-500">*</span></label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'ប្រុស' | 'ស្រី')}
                    required
                    className="w-full border rounded-lg p-2 text-xs outline-none"
                  >
                    <option value="ប្រុស">ប្រុស</option>
                    <option value="ស្រី">ស្រី</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ថ្ងៃខែឆ្នាំកំណើត <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="w-full border rounded-lg p-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">កម្រិតថ្នាក់ <span className="text-red-500">*</span></label>
                  <select
                    value={grade}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    required
                    className="w-full border rounded-lg p-2 text-xs outline-none"
                  >
                    <option value="7">ថ្នាក់ទី 7</option>
                    <option value="8">ថ្នាក់ទី 8</option>
                    <option value="9">ថ្នាក់ទី 9</option>
                    <option value="10">ថ្នាក់ទី 10</option>
                    <option value="11">ថ្នាក់ទី 11</option>
                    <option value="12">ថ្នាក់ទី 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ប្រភេទថ្នាក់ <span className="text-red-500">*</span></label>
                  <select
                    value={classType}
                    onChange={(e) => setClassType(e.target.value as any)}
                    disabled={['7', '8', '9', '10'].includes(grade)}
                    required
                    className="w-full border rounded-lg p-2 text-xs outline-none bg-white disabled:bg-slate-100"
                  >
                    <option value="ទូទៅ">ទូទៅ</option>
                    <option value="វិទ្យាសាស្ត្រ">វិទ្យាសាស្ត្រ</option>
                    <option value="សង្គម">សង្គម</option>
                  </select>
                </div>
              </div>

              <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                <label className="block text-xs font-semibold text-indigo-900 mb-1">ថ្នាក់រៀន/បន្ទប់រៀន (សម្រាប់សិស្សថ្មី)</label>
                <select
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full border bg-white rounded-lg p-2 text-xs outline-none"
                >
                  <option value="">-- គ្មានបន្ទប់/មិនទាន់កំណត់ --</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
                <div className="text-[11px] text-indigo-600 mt-2 font-medium">{roomRec}</div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <span className="block text-xs font-semibold text-slate-700">ទីកន្លែងកំណើត</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ភូមិ"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="border rounded-lg p-2 text-xs outline-none"
                  />
                  <input
                    type="text"
                    placeholder="ឃុំ"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    className="border rounded-lg p-2 text-xs outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="ស្រុក"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="border rounded-lg p-2 text-xs outline-none"
                  />
                  <input
                    type="text"
                    placeholder="ខេត្ត"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="border rounded-lg p-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t pt-3">
                <input
                  type="text"
                  placeholder="ឈ្មោះឪពុក"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="border rounded-lg p-2 text-xs outline-none"
                />
                <input
                  type="text"
                  placeholder="មុខរបរឪពុក"
                  value={fatherJob}
                  onChange={(e) => setFatherJob(e.target.value)}
                  className="border rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="ឈ្មោះម្ដាយ"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  className="border rounded-lg p-2 text-xs outline-none"
                />
                <input
                  type="text"
                  placeholder="មុខរបរម្ដាយ"
                  value={motherJob}
                  onChange={(e) => setMotherJob(e.target.value)}
                  className="border rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="លេខទូរស័ព្ទអាណាព្យាបាល"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                />
              </div>

              <div>
                <textarea
                  placeholder="ផ្សេងៗ (ការកត់ចំណាំ)"
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg p-2 text-xs outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex gap-2">
                {editModeID ? (
                  <>
                    <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg text-xs transition cursor-pointer">
                      កែប្រែ
                    </button>
                    <button type="button" onClick={resetForm} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg text-xs transition cursor-pointer">
                      បោះបង់
                    </button>
                  </>
                ) : (
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.1" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                    </svg>
                    រក្សាទុកព័ត៌មាន
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Search, Filters and Listing Directory */}
        <div className={`bg-white p-4 rounded-xl shadow border border-slate-200 lg:h-full h-auto flex flex-col lg:min-h-0 ${cannotEdit ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <div className="space-y-3.5 flex flex-col h-full min-h-0">
            <h3 className="font-moul text-blue-900 text-[14px] shrink-0">បញ្ជីសិស្សទាំងអស់</h3>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 shrink-0">
              <input
                type="text"
                placeholder="ស្វែងរកសិស្ស (ឈ្មោះ ឬអត្តលេខ)..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none"
              />
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none"
              >
                <option value="">-- បង្ហាញគ្រប់កម្រិត --</option>
                {gradesArray.map((g) => (
                  <option key={g} value={g}>ថ្នាក់ទី {g}</option>
                ))}
              </select>
              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none"
              >
                <option value="">-- គ្រប់បន្ទប់ --</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="គ្មាន">គ្មានបន្ទប់</option>
              </select>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs outline-none"
              >
                <option value="">-- គ្រប់ភេទ --</option>
                <option value="ប្រុស">ប្រុស</option>
                <option value="ស្រី">ស្រី</option>
              </select>
            </div>

            {/* Operations Panel */}
            <div className="flex flex-wrap gap-2 items-center text-xs shrink-0">
              <button onClick={handleDownloadCSVTemplate} className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer">
                <Download className="w-4 h-4 shrink-0 text-amber-600" />
                ទាញគំរូ CSV
              </button>
              {!cannotEdit && (
                <label className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4 shrink-0 text-blue-600" />
                  នាំចូល CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
                </label>
              )}
              <button onClick={handleExportXLSX} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-600" />
                ទាញយក (Excel)
              </button>

              {!cannotEdit && (
                <button
                  onClick={() => {
                    setBulkScope(selectedIDs.length > 0 ? 'selected' : 'all');
                    setIsBulkDeleteOpen(true);
                  }}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  លុប
                </button>
              )}
            </div>

            {/* Live Filter Indicator Counts */}
            <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg flex justify-between font-semibold text-blue-900 text-xs shadow-sm shrink-0">
              <span>សិស្សក្នុងតារាង៖ <span className="font-mono">{toKhmerNumerals(filtered.length)}</span> នាក់</span>
              <span>ស្រី៖ <span className="font-mono text-pink-600">{toKhmerNumerals(filteredFemales)}</span> នាក់</span>
              <span>ប្រុស៖ <span className="font-mono text-indigo-650">{toKhmerNumerals(filteredMales)}</span> នាក់</span>
            </div>

            {/* Student Directory Table with Locked Freeze Headers & Tall Content Height */}
            <div className="overflow-x-auto rounded-xl border-0 lg:flex-1 lg:min-h-0 relative lg:overflow-y-auto overflow-y-visible bg-white shadow-inner w-full">
              <table className="w-full min-w-[900px] divide-y divide-slate-100">
                <thead className="bg-[#f8fafc] lg:sticky static top-0 z-20 shadow-sm font-moul text-[11px] font-normal text-slate-600">
                  <tr className="bg-[#f8fafc]">
                    <th className="p-2.5 text-center w-12 bg-[#f8fafc] whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedIDs.length === filtered.length}
                        onChange={handleSelectAllCheckbox}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="p-2.5 text-left bg-[#f8fafc] whitespace-nowrap">អត្តលេខ</th>
                    <th className="p-2.5 text-left bg-[#f8fafc] whitespace-nowrap">ឈ្មោះខ្មែរ</th>
                    <th className="p-2.5 text-center bg-[#f8fafc] whitespace-nowrap">ភេទ</th>
                    <th className="p-2.5 text-left bg-[#f8fafc] whitespace-nowrap">ថ្ងៃកំណើត</th>
                    <th className="p-2.5 text-center bg-[#f8fafc] whitespace-nowrap">កម្រិត</th>
                    <th className="p-2.5 text-center bg-[#f8fafc] whitespace-nowrap">បន្ទប់</th>
                    <th className="p-2.5 text-left bg-[#f8fafc] whitespace-nowrap">ផ្សេងៗ</th>
                    {!cannotEdit && <th className="p-2.5 text-center bg-[#f8fafc] whitespace-nowrap">សកម្មភាព</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length > 0 ? (
                    filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 text-xs text-slate-800 font-sans">
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedIDs.includes(s.id)}
                            onChange={() => toggleSelectRow(s.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5 font-bold text-blue-800 font-mono whitespace-nowrap">{s.id}</td>
                        <td className="p-2.5 font-medium whitespace-nowrap">{getKhmerFullName(s)}</td>
                        <td className="p-2.5 text-center whitespace-nowrap">{s.gender}</td>
                        <td className="p-2.5 font-mono whitespace-nowrap">{formatKhmerDate(s.dob)}</td>
                        <td className="p-2.5 text-center font-bold whitespace-nowrap">ថ្នាក់ទី {getCombinedGrade(s)}</td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {s.room ? (
                            <span className="font-bold text-green-700">{s.room}</span>
                          ) : (
                            <span className="text-red-500 bg-red-50 px-1 py-0.5 rounded leading-none text-[10px]">គ្មាន</span>
                          )}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">{s.other || '-'}</td>
                        {!cannotEdit && (
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <div className="inline-flex gap-1.5">
                              <button
                                onClick={() => handleEdit(s)}
                                className="p-1.5 bg-white border border-blue-100 hover:border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 hover:scale-105 transition cursor-pointer shadow-sm"
                                title="កែសម្រួល"
                              >
                                <Edit2 className="w-3.5 h-3.5 shrink-0" />
                              </button>
                              <button
                                onClick={() => setSingleDeleteTargetID(s.id)}
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
                      <td colSpan={9} className="p-8 text-center text-gray-450 font-semibold whitespace-nowrap">
                        មិនមានទិន្នន័យសិស្សឡើយ។
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog: Single Delete Choice Modal */}
      {singleDeleteTargetID && (() => {
        const student = students.find((s) => s.id === singleDeleteTargetID);
        const studentName = student ? `${student.lastName} ${student.firstName}` : '';
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 flex flex-col animate-fade-in animate-scale-up">
              
              {/* Decorative Red Accent Bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-800" />

              {/* Modal Header */}
              <div className="px-6 pt-5 pb-3 flex items-center gap-2.5 bg-red-50/50 border-b border-red-100">
                <span className="p-2 bg-red-100 text-red-600 rounded-xl">
                  <Trash2 className="w-5 h-5 shrink-0" />
                </span>
                <h3 className="font-moul text-[11px] font-semibold text-slate-800 tracking-wide">
                  លុបព័ត៌មានសិស្សម្នាក់ៗ
                </h3>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-4 font-sans text-slate-800">
                {student && (
                  <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                    <p className="text-[11px] text-slate-400 font-sans uppercase tracking-wider font-semibold">សិស្សដែលបម្រុងលុប</p>
                    <p className="text-sm font-bold text-slate-800 font-sans">{studentName}</p>
                    <p className="text-xs text-slate-500 font-mono">អត្តលេខ ID: {singleDeleteTargetID} | ថ្នាក់ទី: {getCombinedGrade(student)}</p>
                  </div>
                )}
                
                <div className="space-y-2.5">
                  <p className="font-bold text-slate-700 text-xs">សូមជ្រើសរើសវិធីសាស្ត្រលុប៖</p>
                  
                  <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-350 transition bg-white select-none">
                    <input
                      type="radio"
                      name="delete-choice"
                      value="permanent"
                      checked={singleDeleteOption === 'permanent'}
                      onChange={() => setSingleDeleteOption('permanent')}
                      className="mt-0.5 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-slate-850">លុបចេញពីប្រព័ន្ធទាំងស្រុង</p>
                      <p className="text-[11px] text-red-500 leading-relaxed font-medium">លុបទិន្នន័យសិស្សម្នាក់នេះចោលរហូត (លុបអចិន្ត្រៃយ៍)</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-350 transition bg-white select-none">
                    <input
                      type="radio"
                      name="delete-choice"
                      value="dropout"
                      checked={singleDeleteOption === 'dropout'}
                      onChange={() => setSingleDeleteOption('dropout')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-slate-850">កំណត់ចំណាំជា "បោះបង់ការសិក្សា"</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">រក្សាទុកក្នុងប្រព័ន្ធសម្រាប់របាយការណ៍សិស្សបោះបង់</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 p-4 bg-slate-50 border-t border-slate-100 justify-end text-xs">
                <button
                  onClick={() => setSingleDeleteTargetID(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  onClick={handleSingleDeleteSubmit}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold transition cursor-pointer shadow-md shadow-red-100 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>យល់ព្រមលុប</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Dialog: Bulk Delete Options Dialog */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border">
            <div className="bg-red-600 text-white px-5 py-3 font-moul text-xs">
              ជម្រើសលុបសិស្សជាក្រុម
            </div>
            <div className="p-5 space-y-4 font-sans text-xs">
              <div>
                <p className="font-bold text-gray-700 mb-2">១. ជ្រើសរើសក្រុមសិស្សដែលត្រូវលុប៖</p>
                <div className="space-y-2">
                  {selectedIDs.length > 0 && (
                    <label className="flex items-center gap-2 p-2.5 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 bg-blue-50/50">
                      <input
                        type="radio"
                        name="bulk-scope"
                        value="selected"
                        checked={bulkScope === 'selected'}
                        onChange={() => setBulkScope('selected')}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="font-bold text-blue-900">
                        លុបសិស្សដែលបានជ្រើសរើស (ចំនួន {toKhmerNumerals(selectedIDs.length)} នាក់)
                      </span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50 bg-white">
                    <input
                      type="radio"
                      name="bulk-scope"
                      value="all"
                      checked={bulkScope === 'all'}
                      onChange={() => setBulkScope('all')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span>លុបសិស្សទាំងអស់ (ទូទៅ)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50 bg-white">
                    <input
                      type="radio"
                      name="bulk-scope"
                      value="grade"
                      checked={bulkScope === 'grade'}
                      onChange={() => setBulkScope('grade')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span>លុបសិស្សនៅកម្រិតថ្នាក់នេះ (តាមតម្រងច្រោះបច្ចុប្បន្ន)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50 bg-white">
                    <input
                      type="radio"
                      name="bulk-scope"
                      value="dropout"
                      checked={bulkScope === 'dropout'}
                      onChange={() => setBulkScope('dropout')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span>លុបសិស្សបោះបង់ការសិក្សាចោលទាំងអស់</span>
                  </label>
                </div>
              </div>

              <div>
                <p className="font-bold text-gray-700 mb-2">២. ជ្រើសរើសមូលហេតុ / ជម្រើសកំណត់ចំណាំ៖</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50 bg-white">
                    <input
                      type="radio"
                      name="bulk-type"
                      value="permanent"
                      checked={bulkType === 'permanent'}
                      onChange={() => setBulkType('permanent')}
                      className="text-red-600"
                    />
                    <span>លុបចេញពីប្រព័ន្ធទាំងស្រុង (ទូទៅ)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer hover:bg-slate-50 bg-white">
                    <input
                      type="radio"
                      name="bulk-type"
                      value="dropout"
                      checked={bulkType === 'dropout'}
                      onChange={() => setBulkType('dropout')}
                      className="text-red-650"
                    />
                    <span>កំណត់ចំណាំជា "សិស្សបោះបង់" (មិនលុបចេញពីប្រព័ន្ធទេ)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-4 bg-gray-50 border-t justify-end text-xs">
              <button onClick={() => setIsBulkDeleteOpen(false)} className="px-3 py-1.5 bg-gray-250 rounded-lg text-gray-700 font-semibold cursor-pointer">
                បោះបង់
              </button>
              <button onClick={handleBulkDeleteAction} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold cursor-pointer">
                យល់ព្រមលុប
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
