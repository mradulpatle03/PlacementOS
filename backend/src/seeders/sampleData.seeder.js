require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Recruiter = require('../models/Recruiter');
const Company = require('../models/Company');
const Drive = require('../models/Drive');
const HiringHistory = require('../models/HiringHistory');
const { MONGO_URI } = require('../config/env');

const COMPANIES = [
  {
    name: 'Google',
    sector: 'Technology',
    location: 'Bangalore',
    website: 'https://google.com',
    description: 'Leading technology company specializing in search, cloud, and AI.',
    packageRange: { min: 25, max: 60 },
  },
  {
    name: 'Microsoft',
    sector: 'Technology',
    location: 'Hyderabad',
    website: 'https://microsoft.com',
    description: 'Global leader in software, cloud computing, and hardware.',
    packageRange: { min: 22, max: 55 },
  },
  {
    name: 'Goldman Sachs',
    sector: 'Finance',
    location: 'Bangalore',
    website: 'https://goldmansachs.com',
    description: 'Leading global investment banking and financial services company.',
    packageRange: { min: 20, max: 45 },
  },
  {
    name: 'McKinsey & Company',
    sector: 'Consulting',
    location: 'Delhi',
    website: 'https://mckinsey.com',
    description: 'Global management consulting firm.',
    packageRange: { min: 18, max: 35 },
  },
  {
    name: 'Amazon',
    sector: 'E-commerce',
    location: 'Bangalore',
    website: 'https://amazon.com',
    description: 'Global leader in e-commerce, cloud computing (AWS), and AI.',
    packageRange: { min: 20, max: 50 },
  },
];

const DRIVES = [
  {
    companyIndex: 0, // Google
    title: 'SDE Internship 2025',
    roles: [{ title: 'Software Engineer Intern', ctc: 8, openings: 20 }],
    location: 'Bangalore',
    mode: 'oncampus',
    status: 'open',
    eligibility: { minCGPA: 7.5, maxBacklogs: 0, allowedBranches: ['CSE', 'IT'], graduationYear: [2026] },
    settings: { oneOfferPolicy: false, dreamPackageLPA: 0 },
    daysUntilDeadline: 14,
  },
  {
    companyIndex: 1, // Microsoft
    title: 'FTE Drive 2025',
    roles: [
      { title: 'Software Engineer', ctc: 30, openings: 15 },
      { title: 'Data Scientist', ctc: 32, openings: 5 },
    ],
    location: 'Hyderabad',
    mode: 'oncampus',
    status: 'published',
    eligibility: { minCGPA: 7, maxBacklogs: 0, allowedBranches: ['CSE', 'IT', 'ECE'], graduationYear: [2025] },
    settings: { oneOfferPolicy: true, dreamPackageLPA: 25 },
    daysUntilDeadline: 21,
  },
  {
    companyIndex: 2, // Goldman Sachs
    title: 'Analyst Recruitment 2025',
    roles: [{ title: 'Technology Analyst', ctc: 22, openings: 8 }],
    location: 'Bangalore',
    mode: 'oncampus',
    status: 'open',
    eligibility: { minCGPA: 8, maxBacklogs: 0, allowedBranches: ['CSE', 'IT', 'ECE', 'EEE'], graduationYear: [2025] },
    settings: { oneOfferPolicy: true, dreamPackageLPA: 0 },
    daysUntilDeadline: 10,
  },
  {
    companyIndex: 4, // Amazon
    title: 'SDE Drive 2025',
    roles: [{ title: 'SDE I', ctc: 28, openings: 25 }],
    location: 'Bangalore',
    mode: 'hybrid',
    status: 'draft',
    eligibility: { minCGPA: 6.5, maxBacklogs: 1, allowedBranches: ['CSE', 'IT', 'ECE', 'ME', 'CE'], graduationYear: [2025] },
    settings: { oneOfferPolicy: true, dreamPackageLPA: 20 },
    daysUntilDeadline: 30,
  },
];

const STUDENTS = [
  { name: 'Rahul Sharma',   email: 'rahul@college.edu',   branch: 'CSE', cgpa: 8.5, graduationYear: 2025, backlogs: 0, skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'] },
  { name: 'Priya Patel',    email: 'priya@college.edu',   branch: 'IT',  cgpa: 9.1, graduationYear: 2025, backlogs: 0, skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'] },
  { name: 'Arjun Singh',    email: 'arjun@college.edu',   branch: 'ECE', cgpa: 7.8, graduationYear: 2025, backlogs: 0, skills: ['C++', 'Embedded Systems', 'VLSI', 'Python'] },
  { name: 'Sneha Reddy',    email: 'sneha@college.edu',   branch: 'CSE', cgpa: 7.2, graduationYear: 2026, backlogs: 0, skills: ['Java', 'Spring Boot', 'MySQL', 'Docker'] },
  { name: 'Vikram Mehta',   email: 'vikram@college.edu',  branch: 'ME',  cgpa: 6.8, graduationYear: 2025, backlogs: 1, skills: ['AutoCAD', 'SolidWorks', 'Python'] },
];

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // clear existing sample data
  await Promise.all([
    Company.deleteMany({}),
    Drive.deleteMany({}),
    HiringHistory.deleteMany({}),
    User.deleteMany({ email: { $in: [...STUDENTS.map((s) => s.email), 'tpo@placementos.com', 'recruiter@google.com'] } }),
  ]);

  console.log('Cleared old sample data');

  // ── Create TPO ────────────────────────────────────────────
  let tpo = await User.findOne({ role: 'tpo' });
  if (!tpo) {
    tpo = await User.create({
      name: 'Dr. Sharma TPO',
      email: 'tpo@placementos.com',
      password: 'Tpo@1234',
      role: 'tpo',
      isEmailVerified: true,
      isActive: true,
    });
    console.log('TPO created:', tpo.email);
  }

  // ── Create Companies ──────────────────────────────────────
  const createdCompanies = [];
  for (const c of COMPANIES) {
    const company = await Company.create({ ...c, createdBy: tpo._id });
    createdCompanies.push(company);
    console.log('Company created:', company.name);
  }

  // ── Hiring History ────────────────────────────────────────
  await HiringHistory.create([
    { company: createdCompanies[0]._id, year: 2024, totalOffers: 25, totalHired: 22, averagePackage: 35, highestPackage: 58, driveCount: 2, rolesOffered: ['SDE', 'Data Engineer'] },
    { company: createdCompanies[0]._id, year: 2023, totalOffers: 20, totalHired: 18, averagePackage: 30, highestPackage: 52, driveCount: 2, rolesOffered: ['SDE'] },
    { company: createdCompanies[1]._id, year: 2024, totalOffers: 18, totalHired: 15, averagePackage: 28, highestPackage: 50, driveCount: 1, rolesOffered: ['SDE', 'PM'] },
    { company: createdCompanies[2]._id, year: 2024, totalOffers: 10, totalHired: 8,  averagePackage: 22, highestPackage: 42, driveCount: 1, rolesOffered: ['Technology Analyst'] },
    { company: createdCompanies[4]._id, year: 2024, totalOffers: 30, totalHired: 26, averagePackage: 26, highestPackage: 48, driveCount: 3, rolesOffered: ['SDE I', 'SDE II'] },
  ]);

  // update company aggregate stats
  for (const company of createdCompanies) {
    const history = await HiringHistory.find({ company: company._id });
    await Company.findByIdAndUpdate(company._id, {
      totalDrives: history.reduce((s, h) => s + h.driveCount, 0),
      totalOffers: history.reduce((s, h) => s + h.totalOffers, 0),
    });
  }
  console.log('Hiring history seeded');

  // ── Create Drives ─────────────────────────────────────────
  for (const d of DRIVES) {
    const company = createdCompanies[d.companyIndex];
    const deadline = new Date(Date.now() + d.daysUntilDeadline * 24 * 60 * 60 * 1000);

    const drive = await Drive.create({
      company: company._id,
      title: d.title,
      roles: d.roles,
      location: d.location,
      mode: d.mode,
      status: d.status,
      applicationDeadline: deadline,
      eligibility: d.eligibility,
      settings: d.settings,
      rounds: [
        { name: 'Aptitude Test', type: 'aptitude', durationMinutes: 90, isOnline: true },
        { name: 'Technical Round 1', type: 'technical', durationMinutes: 60, isOnline: false },
        { name: 'HR Round', type: 'hr', durationMinutes: 30, isOnline: false },
      ],
      createdBy: tpo._id,
    });
    console.log(`Drive created: ${drive.title} [${drive.status}]`);
  }

  // ── Create Students ───────────────────────────────────────
  for (const s of STUDENTS) {
    const user = await User.create({
      name: s.name,
      email: s.email,
      password: 'Student@1234',
      role: 'student',
      isEmailVerified: true,
      isActive: true,
    });

    await Student.create({
      user: user._id,
      branch: s.branch,
      cgpa: s.cgpa,
      graduationYear: s.graduationYear,
      backlogs: s.backlogs,
      skills: s.skills,
      rollNumber: `2021${s.branch}${String(STUDENTS.indexOf(s) + 1).padStart(3, '0')}`,
      socialLinks: {
        linkedin: `https://linkedin.com/in/${s.name.toLowerCase().replace(' ', '')}`,
        github: `https://github.com/${s.name.toLowerCase().replace(' ', '')}`,
      },
    });

    console.log('Student created:', s.email);
  }

  // ── Create Recruiter ──────────────────────────────────────
  const recUser = await User.create({
    name: 'John Recruiter',
    email: 'recruiter@google.com',
    password: 'Recruiter@1234',
    role: 'recruiter',
    isEmailVerified: true,
    isActive: true,
  });

  await Recruiter.create({
    user: recUser._id,
    company: createdCompanies[0]._id,
    designation: 'Senior HR Manager',
    phone: '9876543210',
    isVerified: true,
    verifiedBy: tpo._id,
    verifiedAt: new Date(),
  });

  await Company.findByIdAndUpdate(createdCompanies[0]._id, {
    $push: { recruiters: recUser._id },
  });

  console.log('Recruiter created:', recUser.email);
  console.log('\n✅ Sample data seeded successfully!\n');
  console.log('─── Login credentials ───────────────────');
  console.log('Admin:     admin@placementos.com  / Admin@1234');
  console.log('TPO:       tpo@placementos.com    / Tpo@1234');
  console.log('Recruiter: recruiter@google.com   / Recruiter@1234');
  console.log('Student:   rahul@college.edu      / Student@1234');
  console.log('─────────────────────────────────────────');

  process.exit(0);
};

seed().catch((err) => {
  console.log('Seeder error:', err.message);
  process.exit(1);
});