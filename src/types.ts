/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string; // Document ID and unique student code
  lastName: string;
  firstName: string;
  gender: 'ប្រុស' | 'ស្រី';
  dob: string; // ISO date format YYYY-MM-DD
  grade: string; // e.g. "7", "8", "9", "10", "11", "12"
  classType: 'ទូទៅ' | 'វិទ្យាសាស្ត្រ' | 'សង្គម';
  room: string; // e.g. "A", "B", "C", "D", "E" or empty
  pobVillage: string;
  pobCommune: string;
  pobDistrict: string;
  pobProvince: string;
  fatherName: string;
  fatherJob: string;
  motherName: string;
  motherJob: string;
  guardianPhone: string;
  other: string; // e.g. "បោះបង់", "ត្រួតថ្នាក់", "ឡើងថ្នាក់", "បញ្ចប់ការសិក្សា"
}

export interface Teacher {
  id: string; // Unique teacher code (T101, etc.)
  name: string;
  gender: 'ប្រុស' | 'ស្រី';
  phone: string;
  grade: string; // e.g. "7", "8", "9", "10", "11 (វិទ្យាសាស្ត្រ)", etc.
  room: string; // e.g. "A", "B", etc.
}

export interface SchoolSettings {
  name: string;
  logo: string; // base64 or URL
  phone: string;
  address: string;
  academicYear: string;
}

export interface UserProfile {
  username: string;
  role: 'Admin' | 'User1' | 'User2';
  label: string; // Khmer label
  avatar: string; // base64 or URL
  customConfigured: boolean;
  email?: string; // Google Email for secure authentication
  phone?: string; // Cambodia Phone Number for secure OTP authentication (e.g. +855...)
}
