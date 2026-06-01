/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Student, Teacher, SchoolSettings } from '../types';
import { toKhmerNumerals, formatKhmerDate, getKhmerFullName, getCombinedGrade, formatKhmerTwoDigits } from '../utils';
import { toast } from './Toast';
import { TACTEING_BASE64 } from '../tacteingBase64';

const loadHtml2Pdf = async () => {
  if ((window as any).html2pdf) return (window as any).html2pdf;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = () => reject(new Error("Failed to load html2pdf.js"));
    document.body.appendChild(script);
  });
};

interface ReportsTabProps {
  students: Student[];
  teachers: Teacher[];
  schoolSettings: SchoolSettings;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  students,
  teachers,
  schoolSettings,
}) => {
  const [repType, setRepType] = useState<'students' | 'teachers' | 'dropouts'>('students');
  const [repGrade, setRepGrade] = useState('7');
  const [repRoom, setRepRoom] = useState('A');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Dates strings input
  const [dateHeader, setDateHeader] = useState('ថ្ងៃសុក្រ ០៦កើត ខែជេស្ឋ ឆ្នាំមមី អដ្ឋស័ក ព.ស. ២៥៧០');
  const [dateFooter, setDateFooter] = useState('បឹងព្រះ ថ្ងៃទី២២ ខែឧសភា ឆ្នាំ២០២៦');

  const [containerWidth, setContainerWidth] = useState(794);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      setContainerWidth(width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const activeStudents = students.filter((s) => s && s.other !== 'បោះបង់');

  const generatePDFWithHtml2Pdf = async (htmlContent: string, isLandscape: boolean, filename: string) => {
    toast.info("កំពុងរៀបចំ និងទាញយកឯកសារ PDF...");
    try {
      const html2pdfLib = await loadHtml2Pdf();
      
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-pdf-render-root';
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '0';
      tempDiv.style.top = '0';
      tempDiv.style.zIndex = '-9999';
      tempDiv.style.opacity = '0';
      tempDiv.style.pointerEvents = 'none';
      tempDiv.style.background = 'white';
      
      const targetWidthPx = isLandscape ? 1123 : 794;
      
      tempDiv.innerHTML = `
        <style>
          @font-face {
            font-family: 'Tacteing';
            src: url('${TACTEING_BASE64}') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'Battambang';
            src: url('${window.location.origin}/Fonts/KhmerOSbattambang.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'Moul';
            src: url('${window.location.origin}/Fonts/KhmerOSmuollight_0.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          
          #temp-pdf-render-root {
            width: ${targetWidthPx}px !important;
            font-family: 'Battambang', sans-serif !important;
          }
          #temp-pdf-render-root .font-tacteing, 
          #temp-pdf-render-root [class*="font-tacteing"] {
            font-family: 'Tacteing', sans-serif !important;
          }
          #temp-pdf-render-root .font-moul, 
          #temp-pdf-render-root [class*="font-moul"] {
            font-family: 'Moul', serif !important;
          }
          #temp-pdf-render-root .font-khmer, 
          #temp-pdf-render-root .font-sans,
          #temp-pdf-render-root [class*="font-khmer"], 
          #temp-pdf-render-root [class*="font-sans"],
          #temp-pdf-render-root th,
          #temp-pdf-render-root td {
            font-family: 'Battambang', sans-serif !important;
          }
          
          #temp-pdf-render-root .print-page {
            box-sizing: border-box;
            width: ${targetWidthPx}px !important;
            padding: 30px !important;
            background: white !important;
            color: black !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
            page-break-after: always;
            break-after: page;
          }
          #temp-pdf-render-root table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          #temp-pdf-render-root thead {
            display: table-header-group !important;
          }
          #temp-pdf-render-root tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          #temp-pdf-render-root th, #temp-pdf-render-root td {
            border: 1px solid black !important;
          }
          #temp-pdf-render-root .signature-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
        <div style="width: ${targetWidthPx}px; background: white; font-family: 'Battambang', sans-serif; color: black; box-sizing: border-box; padding: 0;">
          ${htmlContent}
        </div>
      `;
      
      document.body.appendChild(tempDiv);

      const opt = {
        margin: [4, 4, 4, 4],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true,
          windowWidth: targetWidthPx
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: isLandscape ? 'landscape' : 'portrait' 
        }
      };

      await html2pdfLib().set(opt).from(tempDiv).save();
      
      tempDiv.remove();
      toast.success("ទាញយកឯកសារ PDF រួចរាល់!");
    } catch (error) {
      console.error(error);
      toast.error("មានបញ្ហាក្នុងការបង្កើត PDF!");
    }
  };

  const handlePrint = async () => {
    const isLandscape = orientation === 'landscape' && repType === 'students';
    const styleId = 'print-page-orientation-style';
    
    // Clean up any existing style
    document.getElementById(styleId)?.remove();

    // Inject temporary stylesheet to set the printer orientation
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @media print {
        @page {
          size: ${isLandscape ? 'landscape' : 'portrait'};
          margin: 0.8cm !important;
        }
      }
    `;
    document.head.appendChild(style);

    window.print();

    // Clean up the style element
    setTimeout(() => {
      style.remove();
    }, 1000);
  };

  const getFilteredClassStudents = (g: string, r: string) => {
    return activeStudents.filter((s) => getCombinedGrade(s) === g && s.room === r);
  };

  // Generate class titles phonetically matching Khmer syntax
  const formatKhmerClassTitle = (g: string, r: string) => {
    const match = g.match(/^(\d+)\s*\((.+)\)$/);
    if (match) {
      return `បញ្ជីរាយនាមសិស្ស ថ្នាក់ទី ${match[1]}${r} (${match[2]})`;
    }
    return `បញ្ជីរាយនាមសិស្ស ថ្នាក់ទី ${g}${r}`;
  };

  const renderClassRows = (list: Student[]) => {
    const N = list.length;
    const L = Math.ceil(N / 2);
    const rows = [];

    for (let i = 0; i < L; i++) {
      const leftS = list[i];
      const rightS = list[i + L];

      rows.push(
        <tr key={i} className="font-sans text-xs" style={{ lineHeight: '1.1' }}>
          <td className="border border-black p-[3px] text-center">{i + 1}</td>
          <td className="border border-black p-[3px] text-center font-bold font-mono">{leftS?.id || ''}</td>
          <td className="border border-black p-[3px] text-left font-bold truncate max-w-[135px]" style={{ maxWidth: '135px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leftS ? getKhmerFullName(leftS) : ''}</td>
          <td className="border border-black p-[3px] text-center">{leftS ? (leftS.gender === 'ប្រុស' ? 'ប' : 'ស') : ''}</td>
          <td className="border border-black p-[3px] text-center font-mono text-[11px] whitespace-nowrap">{leftS ? formatKhmerDate(leftS.dob) : ''}</td>
          <td className="border border-black p-[3px] text-center">{leftS ? (leftS.other !== '-' ? leftS.other : '') : ''}</td>

          <td className="border border-black p-[3px] text-center">{rightS ? i + 1 + L : ''}</td>
          <td className="border border-black p-[3px] text-center font-bold font-mono">{rightS?.id || ''}</td>
          <td className="border border-black p-[3px] text-left font-bold truncate max-w-[135px]" style={{ maxWidth: '135px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rightS ? getKhmerFullName(rightS) : ''}</td>
          <td className="border border-black p-[3px] text-center">{rightS ? (rightS.gender === 'ប្រុស' ? 'ប' : 'ស') : ''}</td>
          <td className="border border-black p-[3px] text-center font-mono text-[11px] whitespace-nowrap">{rightS ? formatKhmerDate(rightS.dob) : ''}</td>
          <td className="border border-black p-[3px] text-center">{rightS ? (rightS.other !== '-' ? rightS.other : '') : ''}</td>
        </tr>
      );
    }
    return rows;
  };

  const currentClassStudents = getFilteredClassStudents(repGrade, repRoom);
  const currentClassFemales = currentClassStudents.filter((s) => s.gender === 'ស្រី').length;
  const currentTeacher = teachers.find((t) => t.grade === repGrade && t.room === repRoom);
  const teacherSignName = currentTeacher ? currentTeacher.name : '........................................';

  // Multi-Class print logic directly mapping print layout
  const handlePrintAllClasses = async () => {
    // Collect active group mapping
    const groups: Record<string, Student[]> = {};
    activeStudents.forEach((s) => {
      const g = getCombinedGrade(s);
      if (g === repGrade && s.room) {
        const key = `${g}-${s.room}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      }
    });

    const sortedKeys = Object.keys(groups).sort();
    if (sortedKeys.length === 0) {
      toast.warning(`មិនមានទិន្នន័យថ្នាក់រៀនសម្រាប់ កម្រិតថ្នាក់ទី ${repGrade} ឡើយ!`);
      return;
    }

    let pagesHtml = '';

    sortedKeys.forEach((key) => {
      const [, room] = key.split('-');
      const list = groups[key];
      const females = list.filter((s) => s.gender === 'ស្រី').length;
      const t = teachers.find((x) => x.grade === repGrade && x.room === room);
      const tName = t ? t.name : '........................................';

      const N = list.length;
      const L = Math.ceil(N / 2);
      let tableRows = '';

      for (let i = 0; i < L; i++) {
        const left = list[i];
        const right = list[i + L];

        const leftId = left ? left.id : '';
        const leftName = left ? getKhmerFullName(left) : '';
        const leftGender = left ? (left.gender === 'ប្រុស' ? 'ប' : 'ស') : '';
        const leftDob = left ? formatKhmerDate(left.dob) : '';
        const leftOther = left ? (left.other !== '-' ? left.other : '') : '';

        const rightId = right ? right.id : '';
        const rightName = right ? getKhmerFullName(right) : '';
        const rightGender = right ? (right.gender === 'ប្រុស' ? 'ប' : 'ស') : '';
        const rightDob = right ? formatKhmerDate(right.dob) : '';
        const rightOther = right ? (right.other !== '-' ? right.other : '') : '';

        tableRows += `
          <tr class="font-sans text-xs" style="line-height: 1.1;">
            <td style="border: 1px solid black; padding: 3px 2px; text-align: center;">${i + 1}</td>
            <td style="border: 1px solid black; padding: 3px 2px; text-align: center; font-weight: bold; font-family: monospace;">${leftId}</td>
            <td style="border: 1px solid black; padding: 3px 2px; text-align: left; font-weight: bold; max-width: 135px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${leftName}</td>
            <td style="border: 1px solid black; padding: 3px 2px; text-align: center;">${leftGender}</td>
            <td style="border: 1px solid black; padding: 3px 2px; text-align: center; font-family: monospace;">${leftDob}</td>
            <td style="border: 1px solid black; padding: 3px 2px; text-align: center;">${leftOther}</td>

            <td style="border: 1px solid black; padding: 3px 2px; text-align: center;">${right ? i + 1 + L : ''}</td>
            <td style="border: 1px solid black; padding: 3px 2px; text-align: center; font-weight: bold; font-family: monospace;">${rightId}</td>
            <td style="border: 1px solid black; padding: 3px 2px; text-align: left; font-weight: bold; max-width: 135px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rightName}</td>
            <td style="border: 1px solid black; padding: 3px 2px; text-align: center;">${rightGender}</td>
            <td style="border: 1px solid black; padding: 3px 2px; text-align: center; font-family: monospace;">${rightDob}</td>
            <td style="border: 1px solid black; padding: 3px 2px; text-align: center;">${rightOther}</td>
          </tr>
        `;
      }

      pagesHtml += `
        <div class="print-page" style="page-break-after: always; break-after: page; background: white; padding: 20px; font-family: 'Battambang', sans-serif;">
          <div style="position: relative; width: 100%; min-height: 66px; display: flex; flex-direction: column; align-items: center; margin-bottom: 12px;">
            <div style="text-align: center; line-height: 1.6;">
              <p style="font-family: 'Moul', serif; font-size: 11px; margin: 0; letter-spacing: 0.5px;">ព្រះរាជាណាចក្រកម្ពុជា</p>
              <p style="font-family: 'Moul', serif; font-size: 10px; margin: 4px 0 0 0;">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
              <p class="font-tacteing" style="margin: 4px 0 0 0; text-align: center; font-size: 24px; line-height: 1;">3</p>
            </div>
            <div style="position: absolute; top: 36px; left: 0; text-align: left;">
              <p style="font-family: 'Moul', serif; font-size: 12px; color: #1e3a8a; margin: 0;">${schoolSettings.name}</p>
            </div>
          </div>

          <div style="text-align: center; margin: 12px 0;">
            <h4 style="font-family: 'Moul', serif; font-size: 14px; margin: 0 0 2px 0;">${formatKhmerClassTitle(repGrade, room)}</h4>
            <p style="font-size: 13px; font-weight: bold; margin: 0;">ឆ្នាំសិក្សា ${schoolSettings.academicYear}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 11px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 28px;">ល.រ</th>
                <th style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 48px;">អត្តលេខ</th>
                <th style="border: 1px solid black; padding: 4px; text-align: left; font-weight: bold; width: 135px;">គោត្តនាម-នាម</th>
                <th style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 28px;">ភេទ</th>
                <th style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 82px; font-size: 9.3px;">ថ្ងៃខែឆ្នាំកំណើត</th>
                <th style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 36px;">ផ្សេងៗ</th>
                <th style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 28px;">ល.រ</th>
                <th style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 48px;">អត្តលេខ</th>
                <th style="border: 1px solid black; padding: 4px; text-align: left; font-weight: bold; width: 135px;">គោត្តនាម-នាម</th>
                <th style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 28px;">ភេទ</th>
                <th style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 82px; font-size: 9.3px;">ថ្ងៃខែឆ្នាំកំណើត</th>
                <th style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; width: 36px;">ផ្សេងៗ</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div style="margin-top: 10px; text-align: left; font-weight: bold; font-size: 13px;">
            បញ្ឈប់បញ្ជីត្រឹមចំនួនសិស្ស ${formatKhmerTwoDigits(N)} នាក់ ស្រី ${formatKhmerTwoDigits(females)} នាក់
          </div>

          <div class="signature-block" style="margin-top: 18px; display: flex; justify-content: space-between; font-size: 13px; width: 100%;">
            <div style="width: 33%; text-align: center;">
              <p style="margin: 0;">បានឃើញ និងឯកភាព</p>
              <p style="font-family: 'Moul', serif; margin: 4px 0 0 0;">នាយកសាលា</p>
              <div style="height: 48px;"></div>
            </div>
            <div style="width: 33%;"></div>
            <div style="width: fit-content; margin-left: auto; display: flex; flex-direction: column; align-items: center; text-align: center;">
              <p style="margin: 0; font-size: 13px; white-space: nowrap;">${dateHeader}</p>
              <p style="margin: 2px 0 0 0; font-size: 13px; white-space: nowrap;">${dateFooter}</p>
              <p style="font-family: 'Moul', serif; margin: 6px 0 0 0;">គ្រូបន្ទុកថ្នាក់</p>
              <div style="height: 48px;"></div>
              <p style="font-family: 'Moul', serif; margin: 4px 0 0 0; white-space: nowrap;">${tName}</p>
            </div>
          </div>
        </div>
      `;
    });

    const tempPrintContainerId = 'all-classes-temp-print-container';
    document.getElementById(tempPrintContainerId)?.remove();

    const tempDiv = document.createElement('div');
    tempDiv.id = tempPrintContainerId;
    tempDiv.innerHTML = pagesHtml;
    document.body.appendChild(tempDiv);

    const styleId = 'all-classes-print-styles';
    document.getElementById(styleId)?.remove();

    const isLandscape = orientation === 'landscape' && repType === 'students';

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @media print {
        body > *:not(#${tempPrintContainerId}) {
          display: none !important;
          visibility: hidden !important;
        }
        #${tempPrintContainerId}, #${tempPrintContainerId} * {
          display: block !important;
          visibility: visible !important;
        }
        #${tempPrintContainerId} {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: white !important;
        }
        @page {
          size: ${isLandscape ? 'landscape' : 'portrait'};
          margin: 0.8cm !important;
        }
      }
    `;
    document.head.appendChild(style);

    window.print();

    setTimeout(() => {
      tempDiv.remove();
      style.remove();
    }, 1000);
  };

  // Pre-calculations for non-students report
  const totalTeachers = teachers.length;
  const femaleTeachers = teachers.filter((t) => t.gender === 'ស្រី').length;

  const dropouts = students.filter((s) => s && s.other === 'បោះបង់');
  const femaleDropoutsCount = dropouts.filter((s) => s.gender === 'ស្រី').length;

  const targetWidth = orientation === 'portrait' ? 794 : 1123;
  const targetHeight = orientation === 'portrait' ? 1123 : 794;
  const availableWidth = containerWidth > 4 ? containerWidth - 4 : 794;
  const scale = availableWidth < targetWidth ? availableWidth / targetWidth : 1;

  return (
    <div className="space-y-6 animate-fade-in text-[14px]">
      <div className="bg-white p-3 sm:p-6 rounded-xl shadow border border-slate-200">
        <h3 className="font-moul text-blue-900 border-b pb-3 mb-4 text-xs tracking-wide">
          របាយការណ៍សម្រាប់បោះពុម្ព
        </h3>

        {/* Configurations grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 text-xs">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ប្រភេទរបាយការណ៍</label>
            <select
              value={repType}
              onChange={(e) => setRepType(e.target.value as any)}
              className="w-full border rounded-lg p-2.5 outline-none font-sans"
            >
              <option value="students">បញ្ជីរាយនាមសិស្សតាមថ្នាក់</option>
              <option value="teachers">របាយការណ៍ស្ថិតិ និងបញ្ជីគ្រូបន្ទុកថ្នាក់</option>
              <option value="dropouts">របាយការណ៍បញ្ជីសិស្សបោះបង់ការសិក្សាដែលបានលុប</option>
            </select>
          </div>

          {repType === 'students' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">កម្រិតថ្នាក់</label>
                <select
                  value={repGrade}
                  onChange={(e) => setRepGrade(e.target.value)}
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">បន្ទប់/ថ្នាក់</label>
                <select
                  value={repRoom}
                  onChange={(e) => setRepRoom(e.target.value)}
                  className="w-full border rounded-lg p-2.5 outline-none font-sans"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </div>
            </>
          )}

          <div className={repType !== 'students' ? 'md:col-span-3' : ''}>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ទម្រង់ក្រដាស</label>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as any)}
              className="w-full border rounded-lg p-2.5 outline-none font-sans"
            >
              <option value="portrait">A4 បញ្ឈរ (Portrait)</option>
              {repType === 'students' && <option value="landscape">A4 ផ្ដេក (Landscape - Full Details)</option>}
            </select>
          </div>
        </div>

        {/* Date Headers and references */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs border-t pt-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">បញ្ចូលកាលបរិច្ឆេទ ជួរទី១ (ខាងលើគេ)</label>
            <input
              type="text"
              value={dateHeader}
              onChange={(e) => setDateHeader(e.target.value)}
              className="w-full border rounded p-2 outline-none font-sans"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">បញ្ចូលកាលបរិច្ឆេទ ជួរទី២ (ខាងក្រោម)</label>
            <input
              type="text"
              value={dateFooter}
              onChange={(e) => setDateFooter(e.target.value)}
              className="w-full border rounded p-2 outline-none font-sans"
            />
          </div>
        </div>

        {/* Printable button controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 text-[14px]">
          <button
            onClick={handlePrint}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-2.5 rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer font-sans"
          >
            បោះពុម្ព / PDF (ថ្នាក់នេះ)
          </button>
          
          {repType === 'students' && (
            <button
              onClick={handlePrintAllClasses}
              className="flex-1 bg-[#0f62ac] hover:bg-blue-700 text-white font-bold py-3 px-2.5 rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              រក្សាទុក PDF ទាំងអស់ (សម្រាប់កម្រិតថ្នាក់នេះ)
            </button>
          )}
        </div>

        {/* Print Live Preview Segment */}
        <div className={`p-4 bg-slate-100 rounded-xl overflow-auto w-full flex flex-col items-center ${scale < 1 ? 'border-none bg-transparent !p-0' : 'border'}`}>
          <p className="text-xs text-gray-500 mb-2 self-start font-sans">ការមើលជាមុន (Print Preview) :</p>
          <div ref={containerRef} className="w-full overflow-hidden py-2 flex justify-center">
            
            <div
              style={{
                width: `${targetWidth * scale}px`,
                height: `${targetHeight * scale}px`,
                position: 'relative',
                overflow: 'hidden',
              }}
              className="flex justify-center items-start"
            >
              <div
                id="report-view-container"
                className={`bg-white font-khmer text-black select-none shrink-0 origin-top transition-transform duration-100 ${
                  scale < 1 
                    ? 'p-5 shadow-none border border-slate-300' 
                    : 'p-10 shadow-lg border border-slate-200'
                }`}
                style={{
                  width: `${targetWidth}px`,
                  minHeight: `${targetHeight}px`,
                  transform: `scale(${scale})`,
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  marginLeft: `-${targetWidth / 2}px`,
                  borderRadius: '4px',
                }}
              >
              <div id="print-area" className="w-full font-sans text-xs">
                {/* Document Royal Emblem */}
                <div className="relative w-full mb-3" style={{ minHeight: '66px' }}>
                  <div className="text-center flex flex-col items-center leading-relaxed mx-auto w-fit">
                    <p className="font-moul text-[11px] tracking-wider">ព្រះរាជាណាចក្រកម្ពុជា</p>
                    <p className="font-moul text-[10px] mt-1 tracking-wider">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                    <p className="font-tacteing mt-1 text-center text-[24px] leading-none text-black">3</p>
                  </div>

                  <div className="absolute top-[36px] left-0 text-left">
                    <p className="font-moul text-xs text-blue-900 mb-1">{schoolSettings.name}</p>
                  </div>
                </div>

                {/* Report Specific Titles */}
                {repType === 'students' ? (
                  <>
                    <div className="text-center my-3">
                      <h4 className="font-moul text-sm text-gray-900 mb-0.5">{formatKhmerClassTitle(repGrade, repRoom)}</h4>
                      <p className="text-[13px] font-bold">ឆ្នាំសិក្សា {schoolSettings.academicYear}</p>
                    </div>

                    {orientation === 'portrait' ? (
                      <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-1 text-center w-7">ល.រ</th>
                            <th className="border border-black p-1 text-center w-12">អត្តលេខ</th>
                            <th className="border border-black p-1 text-left w-[135px]">គោត្តនាម-នាម</th>
                            <th className="border border-black p-1 text-center w-7">ភេទ</th>
                            <th className="border border-black p-1 text-center w-[82px]" style={{ fontSize: '9.3px' }}>ថ្ងៃខែឆ្នាំកំណើត</th>
                            <th className="border border-black p-1 text-center w-9">ផ្សេងៗ</th>

                            <th className="border border-black p-1 text-center w-7">ល.រ</th>
                            <th className="border border-black p-1 text-center w-12">អត្តលេខ</th>
                            <th className="border border-black p-1 text-left w-[135px]">គោត្តនាម-នាម</th>
                            <th className="border border-black p-1 text-center w-7">ភេទ</th>
                            <th className="border border-black p-1 text-center w-[82px]" style={{ fontSize: '9.3px' }}>ថ្ងៃខែឆ្នាំកំណើត</th>
                            <th className="border border-black p-1 text-center w-9">ផ្សេងៗ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentClassStudents.length > 0 ? (
                            renderClassRows(currentClassStudents)
                          ) : (
                            <tr>
                              <td colSpan={12} className="border border-black p-4 text-center text-gray-500 font-sans">
                                គ្មានសិស្សនៅក្នុងថ្នាក់នេះឡើយ។
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      // LANDSCAPE CLASS DETAILS ROSTER
                      <table className="w-full border-collapse border border-black text-left" style={{ fontSize: '10px' }}>
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-1.5 text-center w-10">ល.រ</th>
                            <th className="border border-black p-1.5 text-center w-16">អត្តលេខ</th>
                            <th className="border border-black p-1.5 text-left w-32">គោត្តនាម-នាម</th>
                            <th className="border border-black p-1.5 text-center w-10">ភេទ</th>
                            <th className="border border-black p-1.5 text-center w-24">ថ្ងៃខែឆ្នាំកំណើត</th>
                            <th className="border border-black p-1 text-center w-16">ភូមិ</th>
                            <th className="border border-black p-1 text-center w-16">ឃុំ</th>
                            <th className="border border-black p-1 text-center w-16">ស្រុក</th>
                            <th className="border border-black p-1 text-center w-16">ខេត្ត</th>
                            <th className="border border-black p-1.5 text-left w-24">ឈ្មោះឪពុក</th>
                            <th className="border border-black p-1.5 text-left w-24">ឈ្មោះម្ដាយ</th>
                            <th className="border border-black p-1.5 text-center w-28">លេខទូរស័ព្ទ</th>
                            <th className="border border-black p-1.5 text-center w-20">ផ្សេងៗ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentClassStudents.length > 0 ? (
                            currentClassStudents.map((s, idx) => (
                              <tr key={s.id} className="font-sans text-xs">
                                <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                                <td className="border border-black p-1 text-center font-bold font-mono">{s.id}</td>
                                <td className="border border-black p-1 font-bold">{getKhmerFullName(s)}</td>
                                <td className="border border-black p-1 text-center">{s.gender}</td>
                                <td className="border border-black p-1 text-center font-mono text-[11px]">{formatKhmerDate(s.dob)}</td>
                                <td className="border border-black p-1 text-center">{s.pobVillage || ''}</td>
                                <td className="border border-black p-1 text-center">{s.pobCommune || ''}</td>
                                <td className="border border-black p-1 text-center">{s.pobDistrict || ''}</td>
                                <td className="border border-black p-1 text-center">{s.pobProvince || ''}</td>
                                <td className="border border-black p-1 text-left">{s.fatherName || ''}</td>
                                <td className="border border-black p-1 text-left">{s.motherName || ''}</td>
                                <td className="border border-black p-1 text-center font-mono">{s.guardianPhone || ''}</td>
                                <td className="border border-black p-1 text-center">{s.other || ''}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={13} className="border border-black p-4 text-center text-gray-500 font-sans">
                                គ្មានសិស្សនៅក្នុងថ្នាក់នេះឡើយ។
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}

                    <div className="mt-4 text-left font-semibold text-[13px]">
                      បញ្ឈប់បញ្ជីត្រឹមចំនួនសិស្ស {formatKhmerTwoDigits(currentClassStudents.length)} នាក់ ស្រី {formatKhmerTwoDigits(currentClassFemales)} នាក់
                    </div>
                  </>
                ) : repType === 'teachers' ? (
                  <>
                    {/* TEACHERS LISTING REPORT */}
                    <div className="text-center my-6">
                      <h4 className="font-moul text-sm text-gray-900 mb-1">បញ្ជីរាយនាមគ្រូបន្ទុកថ្នាក់</h4>
                      <p className="text-[13px] font-bold">ឆ្នាំសិក្សា {schoolSettings.academicYear}</p>
                    </div>

                    <table className="w-full border-collapse border border-black text-xs">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-2 text-center w-12">ល.រ</th>
                          <th className="border border-black p-2 text-center w-24">អត្តលេខគ្រូ</th>
                          <th className="border border-black p-2 text-left">នាមត្រកូល និងនាមខ្លួនគ្រូ</th>
                          <th className="border border-black p-2 text-center w-16">ភេទ</th>
                          <th className="border border-black p-2 text-center w-32">លេខទូរស័ព្ទ</th>
                          <th className="border border-black p-2 text-center w-24">ថ្នាក់ទទួលបន្ទុក</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachers.length > 0 ? (
                          teachers.map((t, idx) => (
                            <tr key={t.id} className="font-sans text-xs">
                              <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                              <td className="border border-black p-1.5 text-center font-bold font-mono">{t.id}</td>
                              <td className="border border-black p-1.5 font-bold text-left">{t.name}</td>
                              <td className="border border-black p-1.5 text-center">{t.gender}</td>
                              <td className="border border-black p-1.5 text-center font-mono">{t.phone}</td>
                              <td className="border border-black p-1.5 text-center font-bold text-indigo-900">
                                ថ្នាក់ទី {t.grade} - {t.room}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="border border-black p-4 text-center text-gray-500 font-sans">
                              មិនមានទិន្នន័យគ្រូបន្ទុកថ្នាក់ឡើយ។
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="mt-4 text-left font-semibold text-[13px]">
                      បញ្ឈប់បញ្ជីត្រឹមចំនួនគ្រូ {formatKhmerTwoDigits(totalTeachers)} នាក់ ស្រី {formatKhmerTwoDigits(femaleTeachers)} នាក់
                    </div>
                  </>
                ) : (
                  <>
                    {/* DROPOUTS LISTING REPORT */}
                    <div className="text-center my-6">
                      <h4 className="font-moul text-sm text-gray-900 mb-1">បញ្ជីរាយនាមសិស្សបោះបង់ការសិក្សា</h4>
                      <p className="text-[13px] font-bold">ឆ្នាំសិក្សា {schoolSettings.academicYear}</p>
                    </div>

                    <table className="w-full border-collapse border border-black text-xs">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-2 text-center w-12">ល.រ</th>
                          <th className="border border-black p-2 text-center w-24">អត្តលេខ</th>
                          <th className="border border-black p-2 text-left">គោត្តនាម-នាម</th>
                          <th className="border border-black p-2 text-center w-16">ភេទ</th>
                          <th className="border border-black p-2 text-center w-32">ថ្ងៃខែឆ្នាំកំណើត</th>
                          <th className="border border-black p-2 text-center w-24">កម្រិតថ្នាក់ចុងក្រោយ</th>
                          <th className="border border-black p-2 text-left">អាសយដ្ឋាន/ទីកន្លែងកំណើត</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dropouts.length > 0 ? (
                          dropouts.map((s, idx) => {
                            const pob = [s.pobVillage, s.pobCommune, s.pobDistrict, s.pobProvince].filter(Boolean).join(' ');
                            return (
                              <tr key={s.id} className="font-sans text-xs">
                                <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                                <td className="border border-black p-1.5 text-center font-bold font-mono text-red-655">{s.id}</td>
                                <td className="border border-black p-1.5 font-bold text-left">{getKhmerFullName(s)}</td>
                                <td className="border border-black p-1.5 text-center">{s.gender}</td>
                                <td className="border border-black p-1.5 text-center font-mono">{formatKhmerDate(s.dob)}</td>
                                <td className="border border-black p-1.5 text-center font-bold">
                                  ថ្នាក់ទី {getCombinedGrade(s)} - {s.room || 'គ្មាន'}
                                </td>
                                <td className="border border-black p-1.5 text-left">{pob || 'គ្មានទិន្នន័យ'}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="border border-black p-4 text-center text-gray-500 font-sans">
                              មិនមានទិន្នន័យសិស្សបោះបង់ការសិក្សាឡើយ។
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="mt-4 text-left font-semibold text-[13px]">
                      បញ្ឈប់បញ្ជីត្រឹមចំនួនសិស្សបោះបង់ {formatKhmerTwoDigits(dropouts.length)} នាក់ ស្រី {formatKhmerTwoDigits(femaleDropoutsCount)} នាក់
                    </div>
                  </>
                )}

                {/* Final Closing Signatures and footer */}
                <div className="mt-[18px] flex justify-between text-[13px] w-full">
                  <div className="w-1/3 text-center">
                    <p>បានឃើញ និងឯកភាព</p>
                    <p className="font-moul mt-1 text-[11px] leading-none">នាយកសាលា</p>
                    <div className="h-12"></div>
                  </div>
                  <div className="w-1/3"></div>
                  <div className="w-fit ml-auto flex flex-col items-center text-center">
                    <p className="font-sans text-xs whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>{dateHeader}</p>
                    <p className="font-sans text-xs whitespace-nowrap mt-0.5" style={{ whiteSpace: 'nowrap' }}>{dateFooter}</p>
                    <p className="font-moul mt-1.5 text-[11px] leading-none">
                      {repType === 'students' ? 'គ្រូបន្ទុកថ្នាក់' : 'ប្រធានការិយាល័យ'}
                    </p>
                    <div className="h-12"></div>
                    <p className="font-moul mt-1 text-[11px]" style={{ whiteSpace: 'nowrap' }}>
                      {repType === 'students' ? teacherSignName : '........................................'}
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
