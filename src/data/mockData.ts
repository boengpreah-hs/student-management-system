/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Teacher, SchoolSettings, UserProfile } from '../types';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: "1001",
    lastName: "សុខ",
    firstName: "សុភ័ក្រ",
    gender: "ប្រុស",
    dob: "2010-05-12",
    grade: "7",
    classType: "ទូទៅ",
    room: "A",
    pobVillage: "ព្រែកលៀប",
    pobCommune: "ព្រែកលៀប",
    pobDistrict: "ជ្រោយចង្វារ",
    pobProvince: "ភ្នំពេញ",
    fatherName: "សុខ សាខន",
    fatherJob: "អាជីវករ",
    motherName: "គង់ សារី",
    motherJob: "មេផ្ទះ",
    guardianPhone: "012 999 888",
    other: ""
  },
  {
    id: "1002",
    lastName: "ចាន់",
    firstName: "ធីតា",
    gender: "ស្រី",
    dob: "2010-08-20",
    grade: "7",
    classType: "ទូទៅ",
    room: "A",
    pobVillage: "បឹងព្រលិត",
    pobCommune: "វាលវង់",
    pobDistrict: "៧មករា",
    pobProvince: "ភ្នំពេញ",
    fatherName: "ចាន់ ធារ៉ា",
    fatherJob: "គ្រូបង្រៀន",
    motherName: "ស៊ិន ណារី",
    motherJob: "លក់ដូរ",
    guardianPhone: "098 777 666",
    other: ""
  },
  {
    id: "1003",
    lastName: "លី",
    firstName: "ម៉េងហ៊ួរ",
    gender: "ប្រុស",
    dob: "2010-02-15",
    grade: "7",
    classType: "ទូទៅ",
    room: "B",
    pobVillage: "ទួលស្វាយព្រៃ",
    pobCommune: "ទួលស្វាយព្រៃទី១",
    pobDistrict: "បឹងកេងកង",
    pobProvince: "ភ្នំពេញ",
    fatherName: "លី កុសល",
    fatherJob: "មន្ត្រីរាជការ",
    motherName: "ស៊ិន ស្រីអូន",
    motherJob: "លក់ដូរ",
    guardianPhone: "015 444 333",
    other: ""
  },
  {
    id: "1004",
    lastName: "កែវ",
    firstName: "ណារី",
    gender: "ស្រី",
    dob: "2010-11-03",
    grade: "7",
    classType: "ទូទៅ",
    room: "B",
    pobVillage: "ទឹកថ្លា",
    pobCommune: "ទឹកថ្លា",
    pobDistrict: "សែនសុខ",
    pobProvince: "ភ្នំពេញ",
    fatherName: "កែវ សុខា",
    fatherJob: "ក្រុមហ៊ុនឯកជន",
    motherName: "ឡាយ ចិន្តា",
    motherJob: "មេផ្ទះ",
    guardianPhone: "017 222 111",
    other: ""
  },
  {
    id: "1005",
    lastName: "សុខ",
    firstName: "សំណាង",
    gender: "ប្រុស",
    dob: "2009-04-10",
    grade: "12",
    classType: "វិទ្យាសាស្ត្រ",
    room: "A",
    pobVillage: "អូរអំបិល",
    pobCommune: "អូរអំបិល",
    pobDistrict: "សិរីសោភ័ណ",
    pobProvince: "បន្ទាយមានជ័យ",
    fatherName: "ស៊ិន ម៉ារ៉ា",
    fatherJob: "អ្នករត់តាក់ស៊ី",
    motherName: "ពេជ្រ សុខុម",
    motherJob: "កសិករ",
    guardianPhone: "012 333 444",
    other: ""
  },
  {
    id: "1006",
    lastName: "អ៊ុយ",
    firstName: "ស្រីមុំ",
    gender: "ស្រី",
    dob: "2009-09-25",
    grade: "12",
    classType: "វិទ្យាសាស្ត្រ",
    room: "A",
    pobVillage: "ស្ទឹងមានជ័យ",
    pobCommune: "ស្ទឹងមានជ័យទី១",
    pobDistrict: "មានជ័យ",
    pobProvince: "ភ្នំពេញ",
    fatherName: "អ៊ុយ បូរ៉ា",
    fatherJob: "សំណង់",
    motherName: "តែម គឹមសួរ",
    motherJob: "មេផ្ទះ",
    guardianPhone: "096 111 222",
    other: ""
  }
];

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: "T101",
    name: "ស៊ន ពិសិដ្ឋ",
    gender: "ប្រុស",
    phone: "012 888 999",
    grade: "7",
    room: "A"
  },
  {
    id: "T102",
    name: "អ៊ុង ផល្លា",
    gender: "ស្រី",
    phone: "098 777 666",
    grade: "12 (វិទ្យាសាស្ត្រ)",
    room: "A"
  }
];

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  name: "វិទ្យាល័យបឹងព្រះ",
  logo: "",
  phone: "012 345 678 / 098 765 432",
  address: "រាជធានីភ្នំពេញ, ព្រះរាជាណាកម្ពុជា",
  academicYear: "២០២៥ - ២០២៦"
};

export const DEFAULT_USER_PROFILES: Record<string, UserProfile> = {
  Admin: {
    username: "admin",
    role: "Admin",
    label: "អ្នកគ្រប់គ្រង",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60",
    customConfigured: false,
    email: "sengva.kh@gmail.com"
  },
  User1: {
    username: "user1",
    role: "User1",
    label: "បុគ្គលិករដ្ឋបាល",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60",
    customConfigured: false
  },
  User2: {
    username: "user2",
    role: "User2",
    label: "គ្រូបង្រៀន",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60",
    customConfigured: false
  }
};
