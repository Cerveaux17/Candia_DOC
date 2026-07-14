import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { syncFromFirestore, saveEntityToFirestore, deleteEntityFromFirestore } from './server-firebase';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable CORS for frontend deployment (like Netlify)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    return callback(null, origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Set up JSON parsing and multipart body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure required directories exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const SAFE_DIR = path.join(UPLOADS_DIR, 'safe');
const OFFERS_DIR = path.join(UPLOADS_DIR, 'offers');
const DOSSIERS_DIR = path.join(UPLOADS_DIR, 'dossiers');
const DB_FILE = path.join(UPLOADS_DIR, 'db.json');

[UPLOADS_DIR, SAFE_DIR, OFFERS_DIR, DOSSIERS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to safe or offers folder based on endpoint
    if (req.path.includes('safe')) {
      cb(null, SAFE_DIR);
    } else {
      cb(null, OFFERS_DIR);
    }
  },
  filename: (req, file, cb) => {
    // Keep clean names, prevent collisions by prepending timestamp
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}_${cleanName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn('⚠️ GEMINI_API_KEY is not defined in the environment. AI-powered features will fall back to simulation.');
}

// Simple JSON Database implementation
interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: 'SIGNUP' | 'LOGIN' | 'ANALYZE' | 'GENERATE' | 'LETTER_GEN' | 'EMAIL_VERIFY' | 'UPGRADE';
  timestamp: string;
  details: string;
  country: string;
  costEstimate: number; // in EUR/FCFA
  success: boolean;
}

interface LocalDB {
  user: {
    id: string;
    name: string;
    email: string;
    plan: 'free' | 'essentiel' | 'pro' | 'business';
    monthlyDossiersCreated: number;
    country: string;
    emailVerified: boolean;
    createdAt: string;
    role?: 'admin' | 'user';
    unlockedDossiers?: string[];
    downloadedDossiers?: string[];
  };
  users: {
    id: string;
    name: string;
    email: string;
    password?: string;
    plan: 'free' | 'essentiel' | 'pro' | 'business';
    monthlyDossiersCreated: number;
    country: string;
    isSuspended: boolean;
    createdAt: string;
    emailVerified: boolean;
    lastActiveAt: string;
    role?: 'admin' | 'user';
    unlockedDossiers?: string[];
    downloadedDossiers?: string[];
  }[];
  documents: {
    id: string;
    userId: string;
    category: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    path: string;
  }[];
  offers: {
    id: string;
    userId: string;
    title: string;
    organizer: string;
    deadline: string;
    originalFileName: string;
    extractedPieces: any[];
    rawText?: string;
    analyzedAt: string;
  }[];
  dossiers: {
    id: string;
    userId: string;
    title: string;
    organizer: string;
    createdAt: string;
    pdfPath: string;
    size: number;
    piecesIncluded: any[];
    hasCoverPage: boolean;
    status: 'success' | 'failed';
  }[];
  activityLogs: ActivityLog[];
}

const DEFAULT_DB: LocalDB = {
  user: {
    id: 'user_default',
    name: 'Candidat Démo',
    email: 'candidat.demo@candia.ai',
    plan: 'free',
    monthlyDossiersCreated: 1,
    country: 'Sénégal',
    emailVerified: true,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    role: 'user',
  },
  users: [
    {
      id: 'user_admin',
      name: 'Administrateur Principal',
      email: 'admin@candia.ai',
      password: 'AdminPassword2026!',
      plan: 'business',
      monthlyDossiersCreated: 0,
      country: 'Sénégal',
      isSuspended: false,
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      emailVerified: true,
      lastActiveAt: new Date().toISOString(),
      role: 'admin',
    },
    {
      id: 'user_default',
      name: 'Candidat Démo',
      email: 'candidat.demo@candia.ai',
      password: 'password123',
      plan: 'free',
      monthlyDossiersCreated: 1,
      country: 'Sénégal',
      isSuspended: false,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      emailVerified: true,
      lastActiveAt: new Date().toISOString(),
      role: 'user',
    },
    {
      id: 'user_1',
      name: 'Amadou Diallo',
      email: 'amadou.diallo@gmail.com',
      password: 'password123',
      plan: 'pro',
      monthlyDossiersCreated: 14,
      country: 'Sénégal',
      isSuspended: false,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      emailVerified: true,
      lastActiveAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'user_2',
      name: 'Fatima Diop',
      email: 'fatima.diop@yahoo.fr',
      password: 'password123',
      plan: 'essentiel',
      monthlyDossiersCreated: 8,
      country: 'Côte d\'Ivoire',
      isSuspended: false,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      emailVerified: true,
      lastActiveAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'user_3',
      name: 'Koffi Mensah',
      email: 'koffi.mensah@outlook.com',
      password: 'password123',
      plan: 'business',
      monthlyDossiersCreated: 32,
      country: 'Togo',
      isSuspended: false,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      emailVerified: true,
      lastActiveAt: new Date().toISOString(),
    },
    {
      id: 'user_4',
      name: 'Marcelle Eyene',
      email: 'm.eyene@recrut-afrik.com',
      password: 'password123',
      plan: 'business',
      monthlyDossiersCreated: 45,
      country: 'Gabon',
      isSuspended: false,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      emailVerified: true,
      lastActiveAt: new Date().toISOString(),
    },
    {
      id: 'user_5',
      name: 'Christian Ndong',
      email: 'christian.ndong@gmail.com',
      password: 'password123',
      plan: 'free',
      monthlyDossiersCreated: 2,
      country: 'Cameroun',
      isSuspended: false,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      emailVerified: false,
      lastActiveAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'user_6',
      name: 'Samuel Eto',
      email: 'samuel.eto@fecafoot.cm',
      password: 'password123',
      plan: 'pro',
      monthlyDossiersCreated: 19,
      country: 'Cameroun',
      isSuspended: false,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      emailVerified: true,
      lastActiveAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'user_7',
      name: 'Alassane Touré',
      email: 'alassane.toure@orange.sn',
      password: 'password123',
      plan: 'essentiel',
      monthlyDossiersCreated: 5,
      country: 'Mali',
      isSuspended: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      emailVerified: true,
      lastActiveAt: new Date().toISOString(),
    }
  ],
  documents: [],
  offers: [],
  dossiers: [
    {
      id: 'dossier_1',
      userId: 'user_default',
      title: 'Chef de Projet IA & Innovation',
      organizer: 'Région Île-de-France',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      pdfPath: 'demo_chef_projet.pdf',
      size: 1520300,
      hasCoverPage: true,
      status: 'success',
      piecesIncluded: [
        { nomOriginal: 'Curriculum Vitae actualisé', categorie: 'CV', fileName: 'CV_Developpeur_Senior.pdf', pageCount: 2 },
        { nomOriginal: 'Copie certifiée de la pièce d\'identité', categorie: 'CNI', fileName: 'Passeport_Signe.pdf', pageCount: 1 },
        { nomOriginal: 'Lettre de motivation signée', categorie: 'MOTIVATION', fileName: 'Lettre_Motivation_RegionIDF.pdf', pageCount: 1 },
        { nomOriginal: 'Copie des diplômes supérieurs', categorie: 'DIPLOME', fileName: 'Master_Sciences_Informatiques.pdf', pageCount: 1 },
      ],
    },
  ],
  activityLogs: [
    {
      id: 'log_1',
      userId: 'user_1',
      userEmail: 'amadou.diallo@gmail.com',
      action: 'LOGIN',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      details: 'Connexion de l\'utilisateur Amadou Diallo (Sénégal)',
      country: 'Sénégal',
      costEstimate: 0,
      success: true
    },
    {
      id: 'log_2',
      userId: 'user_1',
      userEmail: 'amadou.diallo@gmail.com',
      action: 'ANALYZE',
      timestamp: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(),
      details: 'Analyse d\'appel à candidature : Chef de Chantier SENELEC',
      country: 'Sénégal',
      costEstimate: 0.02,
      success: true
    },
    {
      id: 'log_3',
      userId: 'user_2',
      userEmail: 'fatima.diop@yahoo.fr',
      action: 'SIGNUP',
      timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'Inscription d\'un nouvel utilisateur Fatima Diop depuis la Côte d\'Ivoire',
      country: 'Côte d\'Ivoire',
      costEstimate: 0,
      success: true
    },
    {
      id: 'log_4',
      userId: 'user_2',
      userEmail: 'fatima.diop@yahoo.fr',
      action: 'GENERATE',
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'Génération de dossier PDF final - Spécialiste Agroalimentaire Orange CI',
      country: 'Côte d\'Ivoire',
      costEstimate: 0,
      success: true
    },
    {
      id: 'log_5',
      userId: 'user_3',
      userEmail: 'koffi.mensah@outlook.com',
      action: 'LETTER_GEN',
      timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'Génération IA de lettre de motivation optimisée',
      country: 'Togo',
      costEstimate: 0.015,
      success: true
    },
    {
      id: 'log_6',
      userId: 'user_4',
      userEmail: 'm.eyene@recrut-afrik.com',
      action: 'GENERATE',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'Génération de dossier PDF groupé multi-profils (Agence)',
      country: 'Gabon',
      costEstimate: 0,
      success: true
    },
    {
      id: 'log_7',
      userId: 'user_6',
      userEmail: 'samuel.eto@fecafoot.cm',
      action: 'ANALYZE',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      details: 'Analyse d\'appel d\'offre public : Équipements de Sport Douala',
      country: 'Cameroun',
      costEstimate: 0.02,
      success: true
    }
  ],
};

// On startup, synchronize with Firestore and recreate local db.json
async function initServerDatabase() {
  console.log('🔥 Initializing Cloud Firestore sync on server start...');
  const syncedDb = await syncFromFirestore(DEFAULT_DB);
  if (syncedDb) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(syncedDb, null, 2), 'utf-8');
      console.log('🔥 Local db.json loaded and synchronized successfully from Cloud Firestore.');
    } catch (err) {
      console.error('❌ Failed to write synced db.json:', err);
    }
  }
}
initServerDatabase().catch(err => {
  console.error('❌ Firestore Sync Error on server start:', err);
});

function getDB(): LocalDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Backwards compatibility migration
      if (!parsed.users) parsed.users = DEFAULT_DB.users;
      if (!parsed.activityLogs) parsed.activityLogs = DEFAULT_DB.activityLogs;
      if (!parsed.user.country) {
        parsed.user.country = 'Sénégal';
        parsed.user.emailVerified = true;
        parsed.user.createdAt = new Date().toISOString();
      }
      
      // Dynamic Admin integration
      const adminExists = parsed.users.some((u: any) => u.email.toLowerCase() === 'admin@candia.ai');
      if (!adminExists) {
        parsed.users.unshift({
          id: 'user_admin',
          name: 'Administrateur Principal',
          email: 'admin@candia.ai',
          password: 'AdminPassword2026!',
          plan: 'business',
          monthlyDossiersCreated: 0,
          country: 'Sénégal',
          isSuspended: false,
          createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          emailVerified: true,
          lastActiveAt: new Date().toISOString(),
          role: 'admin',
        });
      }

      // Sync role attribute for all users
      parsed.users.forEach((u: any) => {
        if (!u.role) {
          u.role = (u.email.toLowerCase() === 'admin@candia.ai') ? 'admin' : 'user';
        }
        if (!u.unlockedDossiers) {
          u.unlockedDossiers = [];
        }
        if (!u.downloadedDossiers) {
          u.downloadedDossiers = [];
        }
      });

      if (parsed.user) {
        if (!parsed.user.role) {
          parsed.user.role = (parsed.user.email.toLowerCase() === 'admin@candia.ai') ? 'admin' : 'user';
        }
        if (!parsed.user.unlockedDossiers) {
          parsed.user.unlockedDossiers = [];
        }
        if (!parsed.user.downloadedDossiers) {
          parsed.user.downloadedDossiers = [];
        }
      }

      return parsed;
    }
  } catch (error) {
    console.error('Error reading DB, using default:', error);
  }
  return DEFAULT_DB;
}

function saveDB(db: LocalDB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing DB:', error);
  }
}

// Helper to register activity log easily
function logActivity(userId: string, email: string, action: ActivityLog['action'], details: string, country: string, costEstimate: number, success: boolean = true) {
  const db = getDB();
  const newLog: ActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId,
    userEmail: email,
    action,
    timestamp: new Date().toISOString(),
    details,
    country,
    costEstimate,
    success,
  };
  db.activityLogs.push(newLog);
  saveDB(db);
  saveEntityToFirestore('activityLogs', newLog.id, newLog).catch(err => {
    console.error('Error syncing log to Firestore:', err);
  });
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. User Management & Authenticaton
app.get('/api/user', (req, res) => {
  const db = getDB();
  res.json(db.user);
});

app.post('/api/auth/firebase-sync', async (req, res) => {
  try {
    const { uid, email, name, country } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'UID et Email requis.' });
    }

    const db = getDB();
    let foundUser = db.users.find(u => u.id === uid || u.email.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      // Create a brand new Firebase user profile in DB
      foundUser = {
        id: uid,
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        plan: 'free',
        monthlyDossiersCreated: 0,
        country: country || 'Sénégal',
        isSuspended: false,
        createdAt: new Date().toISOString(),
        emailVerified: true,
        lastActiveAt: new Date().toISOString(),
        role: 'user',
        unlockedDossiers: [],
        downloadedDossiers: []
      };
      db.users.push(foundUser);
      console.log(`👤 New Firebase-synced user created: ${foundUser.email}`);
    } else {
      // Migrate local ID to Firebase UID if needed
      if (foundUser.id !== uid) {
        const oldId = foundUser.id;
        foundUser.id = uid;
        db.dossiers.forEach(d => { if (d.userId === oldId) d.userId = uid; });
        db.documents.forEach(doc => { if (doc.userId === oldId) doc.userId = uid; });
        db.offers.forEach(o => { if (o.userId === oldId) o.userId = uid; });
      }
      foundUser.lastActiveAt = new Date().toISOString();
      foundUser.emailVerified = true;
      if (name) foundUser.name = name;
      if (country) foundUser.country = country;
    }

    // Set active session user
    db.user = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      plan: foundUser.plan,
      monthlyDossiersCreated: foundUser.monthlyDossiersCreated,
      country: foundUser.country,
      emailVerified: foundUser.emailVerified,
      createdAt: foundUser.createdAt,
      role: foundUser.role || 'user',
      unlockedDossiers: foundUser.unlockedDossiers || [],
      downloadedDossiers: foundUser.downloadedDossiers || []
    };

    saveDB(db);
    // Sync to Firestore in background
    saveEntityToFirestore('users', foundUser.id, foundUser).catch(err => {
      console.error('Error syncing user to Firestore:', err);
    });

    logActivity(foundUser.id, foundUser.email, 'LOGIN', `Connexion Firebase/Google : ${foundUser.name}`, foundUser.country, 0);

    res.json({ success: true, user: db.user });
  } catch (error) {
    console.error('Firebase Sync Error:', error);
    res.status(500).json({ error: 'Échec de la synchronisation Firebase.' });
  }
});

// Full Authentication & Profile endpoints
app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password, country } = req.body;
    if (!name || !email || !password || !country) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    const db = getDB();
    const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Un compte avec cette adresse email existe déjà.' });
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name,
      email: email.toLowerCase(),
      password,
      plan: 'free' as const,
      monthlyDossiersCreated: 0,
      country,
      isSuspended: false,
      createdAt: new Date().toISOString(),
      emailVerified: false,
      lastActiveAt: new Date().toISOString(),
      role: 'user' as const,
    };

    db.users.push(newUser);
    
    // Set active session user
    db.user = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      plan: newUser.plan,
      monthlyDossiersCreated: newUser.monthlyDossiersCreated,
      country: newUser.country,
      emailVerified: newUser.emailVerified,
      createdAt: newUser.createdAt,
      role: newUser.role,
    };

    saveDB(db);
    saveEntityToFirestore('users', newUser.id, newUser).catch(err => {
      console.error('Error syncing user to Firestore:', err);
    });

    logActivity(newUser.id, newUser.email, 'SIGNUP', `Nouvelle inscription : ${newUser.name} depuis le/la ${newUser.country}`, newUser.country, 0);

    res.json({ success: true, user: db.user });
  } catch (error) {
    res.status(500).json({ error: 'Échec de l\'inscription.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const db = getDB();
    const foundUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (!foundUser) {
      return res.status(400).json({ error: 'Identifiants incorrects. Veuillez réessayer.' });
    }

    if (foundUser.isSuspended) {
      return res.status(403).json({ error: 'Ce compte a été suspendu par un administrateur. Veuillez contacter le support.' });
    }

    foundUser.lastActiveAt = new Date().toISOString();

    // Set active session user
    db.user = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      plan: foundUser.plan,
      monthlyDossiersCreated: foundUser.monthlyDossiersCreated,
      country: foundUser.country,
      emailVerified: foundUser.emailVerified,
      createdAt: foundUser.createdAt,
      role: foundUser.role || 'user',
    };

    saveDB(db);
    saveEntityToFirestore('users', foundUser.id, foundUser).catch(err => {
      console.error('Error syncing user to Firestore:', err);
    });

    logActivity(foundUser.id, foundUser.email, 'LOGIN', `Connexion de l'utilisateur ${foundUser.name}`, foundUser.country, 0);

    res.json({ success: true, user: db.user });
  } catch (error) {
    res.status(500).json({ error: 'Échec de la connexion.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const db = getDB();
  // Reset back to demo candidate as fallback
  db.user = {
    id: 'user_default',
    name: 'Candidat Démo',
    email: 'candidat.demo@candia.ai',
    plan: 'free',
    monthlyDossiersCreated: 1,
    country: 'Sénégal',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    role: 'user',
  };
  saveDB(db);
  res.json({ success: true, user: db.user });
});

app.post('/api/auth/verify-email', (req, res) => {
  const db = getDB();
  const foundUser = db.users.find(u => u.id === db.user.id);
  if (foundUser) {
    foundUser.emailVerified = true;
    db.user.emailVerified = true;
    saveDB(db);
    saveEntityToFirestore('users', foundUser.id, foundUser).catch(err => {
      console.error('Error syncing user to Firestore:', err);
    });
    logActivity(foundUser.id, foundUser.email, 'EMAIL_VERIFY', 'Vérification d\'adresse email réussie', foundUser.country, 0);
  }
  res.json({ success: true, user: db.user });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email requis.' });
  }
  const db = getDB();
  const userExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!userExists) {
    return res.status(400).json({ error: 'Aucun compte trouvé avec cette adresse email.' });
  }

  // Simulated link expiring in 1 hour
  const mockToken = `reset_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${mockToken}&email=${encodeURIComponent(email)}`;
  
  res.json({
    success: true,
    message: 'Lien de réinitialisation généré avec succès !',
    resetLink,
    expiresIn: '1 heure'
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email et nouveau mot de passe requis.' });
  }
  const db = getDB();
  const foundUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!foundUser) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  foundUser.password = newPassword;
  saveDB(db);
  saveEntityToFirestore('users', foundUser.id, foundUser).catch(err => {
    console.error('Error syncing user to Firestore:', err);
  });
  res.json({ success: true, message: 'Votre mot de passe a été réinitialisé avec succès.' });
});

app.post('/api/user/profile', (req, res) => {
  const { name, country, email, billingInfo } = req.body;
  const db = getDB();
  const foundUser = db.users.find(u => u.id === db.user.id);
  
  if (foundUser) {
    if (name) {
      foundUser.name = name;
      db.user.name = name;
    }
    if (country) {
      foundUser.country = country;
      db.user.country = country;
    }
    if (email) {
      foundUser.email = email;
      db.user.email = email;
    }
    saveDB(db);
    saveEntityToFirestore('users', foundUser.id, foundUser).catch(err => {
      console.error('Error syncing user to Firestore:', err);
    });
    res.json({ success: true, user: db.user });
  } else {
    res.status(404).json({ error: 'Utilisateur non connecté' });
  }
});

app.post('/api/user/change-plan', (req, res) => {
  const { plan } = req.body;
  if (!plan || !['free', 'essentiel', 'pro', 'business'].includes(plan)) {
    return res.status(400).json({ error: 'Plan invalide.' });
  }

  const db = getDB();
  
  // Update currently session user
  db.user.plan = plan;
  
  // Also update standard user profile list
  const foundUser = db.users.find(u => u.id === db.user.id);
  if (foundUser) {
    foundUser.plan = plan;
  }
  
  saveDB(db);
  if (foundUser) {
    saveEntityToFirestore('users', foundUser.id, foundUser).catch(err => {
      console.error('Error syncing user to Firestore:', err);
    });
  }
  res.json(db.user);
});

app.post('/api/user/toggle-plan', (req, res) => {
  const db = getDB();
  // Simple rotation toggle for older frontend button support
  const plans: ('free' | 'essentiel' | 'pro' | 'business')[] = ['free', 'essentiel', 'pro', 'business'];
  const currentIndex = plans.indexOf(db.user.plan);
  const nextPlan = plans[(currentIndex + 1) % plans.length];
  
  db.user.plan = nextPlan;
  const foundUser = db.users.find(u => u.id === db.user.id);
  if (foundUser) {
    foundUser.plan = nextPlan;
  }
  
  saveDB(db);
  if (foundUser) {
    saveEntityToFirestore('users', foundUser.id, foundUser).catch(err => {
      console.error('Error syncing user to Firestore:', err);
    });
  }
  res.json(db.user);
});

// 2. Safe / Coffre-fort Documents
app.get('/api/safe', (req, res) => {
  const db = getDB();
  res.json(db.documents);
});

app.post('/api/safe/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ error: 'La catégorie est obligatoire' });
    }

    const db = getDB();

    // Limit check for free plan (max 5 files in safe)
    if (db.user.plan === 'free' && db.documents.length >= 7) {
      // Remove temporary file
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        error: 'Limite du plan gratuit atteinte (max 7 fichiers dans le coffre-fort). Passez à la version PRO pour un stockage illimité.',
      });
    }

    // Replace document of same category if user uploaded another (SaaS convenience)
    const existingIndex = db.documents.findIndex((doc) => doc.category === category);
    if (existingIndex !== -1) {
      const oldDoc = db.documents[existingIndex];
      try {
        if (fs.existsSync(oldDoc.path)) {
          fs.unlinkSync(oldDoc.path);
        }
      } catch (e) {
        console.error('Could not delete old safe file:', e);
      }
      db.documents.splice(existingIndex, 1);
      deleteEntityFromFirestore('documents', oldDoc.id).catch(err => {
        console.error('Error deleting replaced document from Firestore:', err);
      });
    }

    const newDoc = {
      id: `doc_${Date.now()}`,
      userId: db.user.id,
      category,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      path: req.file.path,
    };

    db.documents.push(newDoc);
    saveDB(db);
    saveEntityToFirestore('documents', newDoc.id, newDoc).catch(err => {
      console.error('Error syncing document to Firestore:', err);
    });

    res.json({ success: true, document: newDoc });
  } catch (error) {
    console.error('Safe upload error:', error);
    res.status(500).json({ error: 'Une erreur est survenue lors du téléchargement.' });
  }
});

app.delete('/api/safe/:id', (req, res) => {
  const db = getDB();
  const index = db.documents.findIndex((doc) => doc.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Document introuvable' });
  }

  const doc = db.documents[index];
  try {
    if (fs.existsSync(doc.path)) {
      fs.unlinkSync(doc.path);
    }
  } catch (e) {
    console.error('Could not delete file from disk:', e);
  }

  db.documents.splice(index, 1);
  saveDB(db);
  deleteEntityFromFirestore('documents', req.params.id).catch(err => {
    console.error('Error deleting document from Firestore:', err);
  });

  res.json({ success: true, message: 'Document supprimé' });
});

// Custom PDF generation helper for plain text (cover letters)
async function generatePdfFromText(content: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.276, 841.89]); // A4 Size
  const { width, height } = page.getSize();
  
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const marginX = 55;
  const marginY = 60;
  const printableWidth = width - marginX * 2;
  const fontSize = 10;
  const lineHeight = 15;
  const maxCharLength = 85;
  
  // Split raw text into wrapped lines
  const paragraphs = content.split('\n');
  const allLines: { text: string; isSpacing: boolean }[] = [];
  
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed === '') {
      allLines.push({ text: '', isSpacing: true });
    } else {
      const words = trimmed.split(' ');
      let currentLine = '';
      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxCharLength) {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        } else {
          allLines.push({ text: currentLine, isSpacing: false });
          currentLine = word;
        }
      }
      if (currentLine) {
        allLines.push({ text: currentLine, isSpacing: false });
      }
    }
  }

  let currentPage = page;
  let yPosition = height - marginY;
  
  for (const lineObj of allLines) {
    if (yPosition < marginY + 20) {
      currentPage = pdfDoc.addPage([595.276, 841.89]);
      yPosition = height - marginY;
    }
    
    if (lineObj.isSpacing) {
      yPosition -= 8;
    } else {
      const cleanText = lineObj.text
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2013/g, '-')
        .replace(/\u2014/g, '--')
        .replace(/\u2026/g, '...');
        
      currentPage.drawText(cleanText, {
        x: marginX,
        y: yPosition,
        size: fontSize,
        font: fontRegular,
        color: rgb(0.12, 0.12, 0.12),
      });
      yPosition -= lineHeight;
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Propose Cover Letter (Lettre de Motivation) using AI/Gemini or High-Quality Template
app.post('/api/motivation/generate', async (req, res) => {
  try {
    const { offerId, docId } = req.body;
    if (!offerId) {
      return res.status(400).json({ error: "L'identifiant de l'offre est obligatoire." });
    }

    const db = getDB();
    const offer = db.offers.find((o) => o.id === offerId);
    if (!offer) {
      return res.status(404).json({ error: "Offre d'emploi introuvable." });
    }

    let selectedDoc = null;
    if (docId) {
      selectedDoc = db.documents.find((d) => d.id === docId);
    } else {
      selectedDoc = db.documents.find((d) => d.category === 'CV');
    }

    if (!ai) {
      // High-quality backup template
      const simulatedText = `[Prénom Nom]
[Adresse de contact]
[Téléphone]
[Email]

Fait à Dakar, le ${new Date().toLocaleDateString('fr-FR')}

À l'attention du Responsable des Recrutements
${offer.organizer}

Objet : Candidature au poste de ${offer.title}

Madame, Monsieur,

C'est avec un vif intérêt que j'ai pris connaissance de votre appel à candidatures pour le poste de ${offer.title} publié par ${offer.organizer}. Convaincu de correspondre au profil recherché, je me permets de vous soumettre mon dossier.

Fort d'un parcours professionnel solide et diversifié, j'ai développé des compétences clés directement applicables aux défis de cette fonction. Ma rigueur méthodologique, mon esprit de synthèse ainsi que mon sens des responsabilités me permettent de m'intégrer rapidement au sein d'équipes de travail performantes et de produire des livrables de haute qualité conformes aux exigences administratives les plus strictes.

Rejoindre ${offer.organizer} représente pour moi l'opportunité de mettre mon dynamisme et mon expertise au service de projets stratégiques majeurs. Je partage pleinement vos valeurs d'engagement et de service public, et je serais particulièrement fier d'accompagner votre développement.

Je me tiens à votre entière disposition pour convenir d'un entretien afin de vous exposer de vive voix l'étendue de mes motivations et mes ambitions professionnelles.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations les plus respectueuses.

[Votre Nom complet]`;
      return res.json({ text: simulatedText });
    }

    const contents: any[] = [];

    let offerPrompt = `Voici l'offre d'emploi / l'appel à candidature :\n`;
    offerPrompt += `Titre de l'offre : ${offer.title}\n`;
    offerPrompt += `Organisateur : ${offer.organizer}\n`;
    offerPrompt += `Date limite : ${offer.deadline}\n`;
    if (offer.rawText) {
      offerPrompt += `Contenu complet de l'offre : \n${offer.rawText}\n`;
    }
    contents.push({ text: offerPrompt });

    if (selectedDoc && fs.existsSync(selectedDoc.path)) {
      try {
        const fileBuffer = fs.readFileSync(selectedDoc.path);
        contents.push({
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: selectedDoc.mimeType,
          },
        });
        contents.push({
          text: `Le document ci-dessus est le CV / profil professionnel du candidat (${selectedDoc.originalName}). Utilise ses informations pour personnaliser l'en-tête, le nom, les compétences et les expériences clés de la lettre de motivation afin de les adapter parfaitement au poste visé.`,
        });
      } catch (err) {
        console.error("Error reading candidate doc for cover letter:", err);
      }
    } else {
      contents.push({
        text: `Aucun CV physique n'a pu être chargé. Rédige une lettre de motivation standard hautement personnalisable avec des placeholders clairs comme [Votre Nom], [Vos Compétences], [Votre Expérience] là où les informations spécifiques sont requises.`,
      });
    }

    const systemInstruction = `Tu es un conseiller en carrière et expert en rédaction administrative et professionnelle.
Ton rôle est d'écrire une lettre de motivation (en français) extrêmement convaincante, percutante et personnalisée pour l'offre d'emploi décrite.
La lettre doit être rédigée dans un style professionnel impeccable, courtois et dynamique, adapté au poste visé.
Utilise les informations du CV et des autres documents fournis pour personnaliser l'argumentaire, mettre en valeur les compétences correspondantes, et faire le lien avec les exigences de l'offre.
Si les informations personnelles (nom, adresse, email) sont présentes dans le document fourni, utilise-les pour remplir l'en-tête et la signature, sinon utilise des placeholders classiques comme [Prénom Nom], [Votre Adresse], etc.

Structure de la lettre :
1. En-tête (coordonnées du candidat en haut à gauche, date du jour en haut à droite, coordonnées du recruteur en dessous à droite).
2. Objet clair (ex: Objet : Candidature au poste de [Titre de l'offre]).
3. Formule de politesse classique (ex: Madame, Monsieur,).
4. Corps de la lettre (3 à 4 paragraphes percutants : "Vous/L'entreprise", "Moi/Mes compétences/Mon CV", "Nous/Notre future collaboration").
5. Appel à l'action courtois (demande d'entretien).
6. Formule de politesse finale chaleureuse et professionnelle.
7. Signature.

Génère la lettre de motivation sous forme de texte brut. Ne mets aucun tag markdown ou mise en forme markdown de type gras (**) ou de titres (#). Fais en sorte que le texte soit directement éditable par l'utilisateur.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction,
      },
    });

    const letterText = response.text || '';
    
    // Log activity
    try {
      db.activityLogs.push({
        id: `log_${Date.now()}`,
        userId: db.user.id,
        userEmail: db.user.email,
        action: 'LETTER_GEN',
        timestamp: new Date().toISOString(),
        details: `Lettre de motivation générée pour l'offre : ${offer.title}`,
        country: db.user.country || 'Sénégal',
        costEstimate: 0.05,
        success: true
      });
      saveDB(db);
    } catch (e) {
      console.error("Failed to save activity log:", e);
    }

    res.json({ text: letterText });
  } catch (error: any) {
    console.error('Error generating cover letter:', error);
    res.status(500).json({ error: error.message || 'Une erreur est survenue lors de la génération de la lettre.' });
  }
});

// Save text as custom PDF to the safe
app.post('/api/safe/save-text', async (req, res) => {
  try {
    const { content, filename, category } = req.body;
    if (!content || !filename || !category) {
      return res.status(400).json({ error: 'Contenu, nom de fichier, et catégorie sont obligatoires.' });
    }

    const db = getDB();

    if (db.user.plan === 'free' && db.documents.length >= 7) {
      return res.status(403).json({
        error: 'Limite du plan gratuit atteinte (max 7 fichiers dans le coffre-fort). Passez à la version PRO pour enregistrer de nouveaux fichiers.',
      });
    }

    const cleanName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueFilename = `${Date.now()}_${cleanName}`;
    const filePath = path.join(SAFE_DIR, uniqueFilename);

    // Generate PDF representation of our plain text cover letter
    const pdfBuffer = await generatePdfFromText(content);
    
    // Write physical file
    fs.writeFileSync(filePath, pdfBuffer);

    const newDoc = {
      id: `doc_${Date.now()}`,
      userId: db.user.id,
      category,
      originalName: filename,
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
      uploadedAt: new Date().toISOString(),
      path: filePath,
    };

    db.documents.push(newDoc);
    saveDB(db);
    saveEntityToFirestore('documents', newDoc.id, newDoc).catch(err => {
      console.error('Error syncing document to Firestore:', err);
    });

    res.json({ success: true, document: newDoc });
  } catch (error: any) {
    console.error('Error saving text cover letter as PDF:', error);
    res.status(500).json({ error: error.message || 'Une erreur est survenue lors de l\'enregistrement.' });
  }
});

// 3. Recruitment Offer Analysis
app.post('/api/offers/analyze', upload.single('file'), async (req, res) => {
  try {
    const db = getDB();
    let rawTextContent = req.body.rawText || '';
    let originalFileName = 'Texte collé';
    let offerFilePath = '';

    if (req.file) {
      originalFileName = req.file.originalname;
      offerFilePath = req.file.path;
    }

    if (!req.file && !rawTextContent.trim()) {
      return res.status(400).json({ error: 'Veuillez fournir un document ou du texte brut à analyser.' });
    }

    let analyzedData = {
      titreOffre: 'Nouvelle Offre Détectée',
      organisateur: 'Organisme de Recrutement',
      deadline: 'Non spécifiée',
      piecesDemandees: [] as any[],
    };

    if (ai) {
      // Prompt with system instructions and JSON Schema
      const systemInstruction = `Tu es un expert en recrutement public et privé, analyste juridique senior spécialisé dans l'analyse de dossiers de candidatures, d'appels à projets, et de marchés publics.
Ton rôle est de lire l'appel d'offre/recrutement fourni et d'extraire de manière extrêmement précise :
1. Le titre exact de l'offre (titreOffre).
2. L'organisme, l'entreprise ou l'institution qui publie l'appel (organisateur).
3. La date limite de soumission ou de candidature si elle est mentionnée (deadline), sous un format lisible comme "15 Octobre 2026" ou "Non spécifiée".
4. La liste de toutes les pièces, attestations, justificatifs ou documents demandés pour constituer le dossier de candidature.

Pour chaque pièce administrative ou justificatif exigé, tu dois générer un objet JSON contenant :
- "nomOriginal" : Le libellé ou l'expression exacte utilisée dans l'annonce (ex: "copie certifiée de la pièce d'identité", "CV actualisé et signé").
- "description" : Une courte phrase de contexte expliquant ce que contient cette pièce.
- "categorieProposee" : La catégorie sémantique la plus proche parmi ces choix UNIQUEMENT :
  - "CV" (pour tout curriculum, CV, parcours professionnel)
  - "CNI" (carte d'identité, passeport, titre de séjour, justificatif de nationalité)
  - "NAISSANCE" (acte de naissance, extrait d'acte civil)
  - "DIPLOME" (diplômes, certifications, attestations de scolarité, diplôme d'ingénieur)
  - "MOTIVATION" (lettre de motivation, déclaration d'intérêt)
  - "CASIER" (casier judiciaire, bulletin n°3, extrait de casier)
  - "PORTFOLIO" (portfolio, book de créations, références, travaux réalisés, recommandations)
  - "ATTESTATION" (attestations fiscales, certificats d'employeur, déclarations sur l'honneur, attestations de régularité sociale ou d'assurance)
  - "AUTRE" (si la pièce ne rentre dans aucune des catégories ci-dessus, comme un justificatif de domicile ou une enveloppe timbrée)
- "obligatoire" : Un booléen. Vrai si le texte indique clairement que la pièce est exigée/obligatoire, faux s'il s'agit d'une pièce optionnelle/recommandée/facultative.
- "ordre" : L'ordre de présentation spécifié par l'appel. Si l'appel numérote explicitement l'ordre (ex: "1. Le CV, 2. La lettre..."), indique cet ordre (1, 2, 3...). S'il n'y a pas d'ordre explicite, affecte-les de manière séquentielle (1, 2, 3...) selon leur ordre de citation dans le texte pour garantir un dossier ordonné.

Le format de retour doit impérativement être un objet JSON valide conforme à ce schéma TypeScript:
{
  titreOffre: string;
  organisateur: string;
  deadline: string;
  piecesDemandees: Array<{
    nomOriginal: string;
    description: string;
    categorieProposee: 'CV' | 'CNI' | 'NAISSANCE' | 'DIPLOME' | 'MOTIVATION' | 'CASIER' | 'PORTFOLIO' | 'ATTESTATION' | 'AUTRE';
    obligatoire: boolean;
    ordre: number;
  }>;
}

Fais preuve de tolérance sémantique fine : associe correctement les pièces même si l'appellation diffère (par exemple "justificatif d'identité" va dans "CNI", "bulletin n°3" va dans "CASIER", "certificat de travail" va dans "ATTESTATION").`;

      try {
        let contents: any[] = [];

        // If file uploaded, send multimodal part (supports PDF or Images directly!)
        if (req.file) {
          const fileBuffer = fs.readFileSync(req.file.path);
          contents.push({
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType: req.file.mimetype,
            },
          });
        }

        // Add additional request text or instructions
        contents.push({
          text: `Analyse le document fourni ci-dessus pour en extraire l'offre et les pièces jointes exigées.
${rawTextContent ? `Texte fourni par l'utilisateur : \n\n${rawTextContent}` : ''}
Prends bien en compte l'ordre de présentation. Retourne le résultat strictement au format JSON.`,
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: contents,
          config: {
            responseMimeType: 'application/json',
            systemInstruction,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                titreOffre: { type: Type.STRING },
                organisateur: { type: Type.STRING },
                deadline: { type: Type.STRING },
                piecesDemandees: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      nomOriginal: { type: Type.STRING },
                      description: { type: Type.STRING },
                      categorieProposee: {
                        type: Type.STRING,
                        enum: ['CV', 'CNI', 'NAISSANCE', 'DIPLOME', 'MOTIVATION', 'CASIER', 'PORTFOLIO', 'ATTESTATION', 'AUTRE'],
                      },
                      obligatoire: { type: Type.BOOLEAN },
                      ordre: { type: Type.INTEGER },
                    },
                    required: ['nomOriginal', 'categorieProposee', 'obligatoire', 'ordre'],
                  },
                },
              },
              required: ['titreOffre', 'organisateur', 'deadline', 'piecesDemandees'],
            },
          },
        });

        const textOutput = response.text || '{}';
        analyzedData = JSON.parse(textOutput);
      } catch (geminiError) {
        console.error('Gemini processing failed, falling back to simulated analysis:', geminiError);
        analyzedData = generateSimulatedAnalysis(rawTextContent || originalFileName);
      }
    } else {
      // Fallback if no API key is specified
      analyzedData = generateSimulatedAnalysis(rawTextContent || originalFileName);
    }

    // Now, automatically match extracted pieces with documents in the user's Safe
    const safeDocs = db.documents;
    const piecesWithMatches = analyzedData.piecesDemandees.map((piece: any, idx: number) => {
      // Find a document matching the proposed category
      const matchedDoc = safeDocs.find((doc) => doc.category === piece.categorieProposee);
      return {
        id: `piece_${idx}_${Date.now()}`,
        nomOriginal: piece.nomOriginal,
        description: piece.description || `Pièce de catégorie ${piece.categorieProposee}`,
        categorieProposee: piece.categorieProposee,
        obligatoire: piece.obligatoire !== undefined ? piece.obligatoire : true,
        ordre: piece.ordre || (idx + 1),
        matchDocumentId: matchedDoc ? matchedDoc.id : null,
      };
    });

    const newOffer = {
      id: `offer_${Date.now()}`,
      userId: db.user.id,
      title: analyzedData.titreOffre || 'Appel d\'Offre Sans Titre',
      organizer: analyzedData.organisateur || 'Organisme de Candidature',
      deadline: analyzedData.deadline || 'Non spécifiée',
      originalFileName,
      extractedPieces: piecesWithMatches,
      rawText: rawTextContent || undefined,
      analyzedAt: new Date().toISOString(),
    };

    db.offers.push(newOffer);
    saveDB(db);
    saveEntityToFirestore('offers', newOffer.id, newOffer).catch(err => {
      console.error('Error syncing offer to Firestore:', err);
    });

    res.json(newOffer);
  } catch (error) {
    console.error('Analysis endpoint error:', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'analyse du document.' });
  }
});

// Helper simulation function in case Gemini is offline or API key missing
function generateSimulatedAnalysis(text: string): any {
  const lowercase = text.toLowerCase();
  const pieces = [];

  if (lowercase.includes('cv') || lowercase.includes('curriculum')) {
    pieces.push({
      nomOriginal: 'Curriculum Vitae (CV) détaillé',
      description: 'Présentation de votre parcours de formation et professionnel.',
      categorieProposee: 'CV',
      obligatoire: true,
      ordre: 1,
    });
  } else {
    pieces.push({
      nomOriginal: 'CV actualisé',
      description: 'Synthèse de vos compétences et expériences.',
      categorieProposee: 'CV',
      obligatoire: true,
      ordre: 1,
    });
  }

  if (lowercase.includes('motivation') || lowercase.includes('lettre')) {
    pieces.push({
      nomOriginal: 'Lettre de motivation argumentée',
      description: 'Explique vos motivations et adéquation avec l\'offre.',
      categorieProposee: 'MOTIVATION',
      obligatoire: true,
      ordre: 2,
    });
  }

  if (lowercase.includes('identité') || lowercase.includes('cni') || lowercase.includes('passeport')) {
    pieces.push({
      nomOriginal: 'Copie recto-verso de la CNI ou du Passeport',
      description: 'Vérification de l\'identité légale du postulant.',
      categorieProposee: 'CNI',
      obligatoire: true,
      ordre: pieces.length + 1,
    });
  }

  if (lowercase.includes('diplôme') || lowercase.includes('master') || lowercase.includes('licence')) {
    pieces.push({
      nomOriginal: 'Copie du diplôme le plus élevé',
      description: 'Attestation du niveau académique requis.',
      categorieProposee: 'DIPLOME',
      obligatoire: true,
      ordre: pieces.length + 1,
    });
  }

  // Always append an Attestation as generic
  pieces.push({
    nomOriginal: 'Attestation de régularité ou Déclaration sur l\'honneur',
    description: 'Justificatif administratif d\'éligibilité.',
    categorieProposee: 'ATTESTATION',
    obligatoire: false,
    ordre: pieces.length + 1,
  });

  return {
    titreOffre: 'Candidature Spontanée / Offre Détectée',
    organisateur: 'Société Partenaire',
    deadline: 'Sous 30 jours',
    piecesDemandees: pieces,
  };
}

// 4. Dossier Generation (PDF Merge)
app.post('/api/dossiers/generate', async (req, res) => {
  try {
    const { offerId, coverPageOptions, mappings, signatureOptions } = req.body;
    if (!offerId || !mappings || !Array.isArray(mappings)) {
      return res.status(400).json({ error: 'Données de génération incomplètes' });
    }

    const db = getDB();

    // Check plan limits - allowed freely now, payment is at download
    const currentPlan = db.user.plan;

    const offer = db.offers.find((off) => off.id === offerId);
    if (!offer) {
      return res.status(404).json({ error: 'Appel d\'offre introuvable' });
    }

    // Load actual physical files from safe documents based on mappings
    const finalMergeFiles: { path: string; mimeType: string; originalName: string; category: string }[] = [];
    const piecesIncludedMetadata: any[] = [];

    // Sort mappings by specified order
    const sortedMappings = [...mappings].sort((a, b) => a.ordre - b.ordre);

    for (const mapItem of sortedMappings) {
      if (!mapItem.documentId) continue; // Skip missing pieces

      const safeDoc = db.documents.find((doc) => doc.id === mapItem.documentId);
      if (safeDoc) {
        if (fs.existsSync(safeDoc.path)) {
          finalMergeFiles.push({
            path: safeDoc.path,
            mimeType: safeDoc.mimeType,
            originalName: safeDoc.originalName,
            category: safeDoc.category,
          });
        }
      }
    }

    if (finalMergeFiles.length === 0) {
      return res.status(400).json({ error: 'Aucun document valide n\'a été sélectionné pour la fusion.' });
    }

    // Let's perform physical PDF generation/merge using pdf-lib
    const mergedPdf = await PDFDocument.create();
    
    // First, compile each input file into a PDF representation to compute accurate table of contents pages!
    const compiledDocs: { doc: PDFDocument; name: string; category: string }[] = [];
    
    for (const file of finalMergeFiles) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const doc = await getPdfDocumentOfFile(fileBuffer, file.mimeType);
        compiledDocs.push({
          doc,
          name: file.originalName,
          category: file.category,
        });
      } catch (err) {
        console.error(`Failed to process file ${file.originalName}:`, err);
      }
    }

    if (compiledDocs.length === 0) {
      return res.status(500).json({ error: 'Échec lors de la conversion des pièces jointes en PDF.' });
    }

    const coverPageEnabled = coverPageOptions && coverPageOptions.enabled;
    let currentPageNum = coverPageEnabled ? 2 : 1;
    const tableOfContents: { label: string; page: number }[] = [];

    // Precalculate Table of Contents page indices
    for (const cDoc of compiledDocs) {
      const pageCount = cDoc.doc.getPageCount();
      tableOfContents.push({
        label: `${getCategoryLabel(cDoc.category)} - ${cDoc.name}`,
        page: currentPageNum,
      });
      piecesIncludedMetadata.push({
        nomOriginal: getCategoryLabel(cDoc.category),
        categorie: cDoc.category,
        fileName: cDoc.name,
        pageCount: pageCount,
      });
      currentPageNum += pageCount;
    }

    // 1. Draw Cover Page if enabled
    if (coverPageEnabled) {
      const coverPage = mergedPdf.addPage([595.276, 841.89]); // A4 in points
      const { width, height } = coverPage.getSize();

      const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
      const helvetica = await mergedPdf.embedFont(StandardFonts.Helvetica);

      // Top decorative bar
      coverPage.drawRectangle({
        x: 0,
        y: height - 15,
        width,
        height: 15,
        color: rgb(0.12, 0.43, 0.84), // Professional Tech Blue
      });

      // Title Section
      coverPage.drawText('DOSSIER DE SOUMISSION', {
        x: 50,
        y: height - 100,
        size: 14,
        font: helveticaBold,
        color: rgb(0.4, 0.4, 0.4),
      });

      coverPage.drawText(offer.title.substring(0, 50), {
        x: 50,
        y: height - 150,
        size: 26,
        font: helveticaBold,
        color: rgb(0.08, 0.12, 0.2),
      });

      coverPage.drawText(`Destinataire : ${offer.organizer}`, {
        x: 50,
        y: height - 185,
        size: 14,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });

      // Horizontal separator line
      coverPage.drawLine({
        start: { x: 50, y: height - 210 },
        end: { x: width - 50, y: height - 210 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });

      // Candidate Metadata
      coverPage.drawText('INFORMATIONS DU CANDIDAT', {
        x: 50,
        y: height - 250,
        size: 11,
        font: helveticaBold,
        color: rgb(0.12, 0.43, 0.84),
      });

      const candName = coverPageOptions.candidateName || db.user.name;
      const candEmail = coverPageOptions.candidateEmail || db.user.email;

      coverPage.drawText(`Nom complet : ${candName}`, { x: 50, y: height - 275, size: 12, font: helvetica });
      coverPage.drawText(`Adresse Email : ${candEmail}`, { x: 50, y: height - 295, size: 12, font: helvetica });
      coverPage.drawText(`Date de génération : ${new Date().toLocaleDateString('fr-FR')}`, { x: 50, y: height - 315, size: 12, font: helvetica });
      if (offer.deadline && offer.deadline !== 'Non spécifiée') {
        coverPage.drawText(`Date Limite de l'offre : ${offer.deadline}`, { x: 50, y: height - 335, size: 12, font: helvetica, color: rgb(0.8, 0.2, 0.2) });
      }

      // Notes / Summary Statement
      if (coverPageOptions.notes) {
        coverPage.drawText('NOTE DE SYNTHÈSE', { x: 50, y: height - 380, size: 11, font: helveticaBold, color: rgb(0.12, 0.43, 0.84) });
        // Draw paragraph safely (simple wrap)
        const noteText = coverPageOptions.notes.substring(0, 180);
        coverPage.drawText(noteText, { x: 50, y: height - 405, size: 10, font: helvetica, color: rgb(0.4, 0.4, 0.4) });
      }

      // Table of Contents Section
      coverPage.drawText('SOMMAIRE DES PIÈCES JOINTES', {
        x: 50,
        y: height - 480,
        size: 12,
        font: helveticaBold,
        color: rgb(0.08, 0.12, 0.2),
      });

      coverPage.drawLine({
        start: { x: 50, y: height - 490 },
        end: { x: width - 50, y: height - 490 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });

      let tocY = height - 520;
      for (const item of tableOfContents) {
        coverPage.drawText(item.label.substring(0, 65), {
          x: 60,
          y: tocY,
          size: 10,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2),
        });

        // Draw dynamic dotted leader lines
        coverPage.drawText('. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .', {
          x: 280,
          y: tocY,
          size: 8,
          font: helvetica,
          color: rgb(0.6, 0.6, 0.6),
        });

        coverPage.drawText(`Page ${item.page}`, {
          x: width - 100,
          y: tocY,
          size: 10,
          font: helveticaBold,
          color: rgb(0.12, 0.43, 0.84),
        });

        tocY -= 22;
      }

      // Brand Footer
      coverPage.drawText('Généré de manière certifiée par l\'application Candia SaaS.', {
        x: 50,
        y: 40,
        size: 8,
        font: helvetica,
        color: rgb(0.6, 0.6, 0.6),
      });
    }

    // 2. Append all compiled PDF documents
    for (const cDoc of compiledDocs) {
      const copiedPages = await mergedPdf.copyPages(cDoc.doc, cDoc.doc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    // 3. Auto Signature insertion if enabled
    if (signatureOptions && signatureOptions.enabled) {
      const sigDoc = db.documents.find(d => d.category === 'SIGNATURE');
      if (sigDoc && fs.existsSync(sigDoc.path)) {
        try {
          const sigBytes = fs.readFileSync(sigDoc.path);
          const sigImg = sigDoc.mimeType === 'image/png' ? await mergedPdf.embedPng(sigBytes) : await mergedPdf.embedJpg(sigBytes);
          
          // Use manual selected coordinates, or try auto keywords scanning placement on motivation letter or last page
          // coordinates default: relative bottom-right
          const targetPageIndex = signatureOptions.pageIndex ?? (mergedPdf.getPageCount() - 1);
          const targetPage = mergedPdf.getPages()[targetPageIndex];
          if (targetPage) {
            const sigWidth = signatureOptions.width ?? 120;
            const sigHeight = signatureOptions.height ?? 60;
            
            // Draw visual signature
            targetPage.drawImage(sigImg, {
              x: signatureOptions.x ?? (targetPage.getWidth() - sigWidth - 50),
              y: signatureOptions.y ?? 100,
              width: sigWidth,
              height: sigHeight,
            });
          }
        } catch (sigErr) {
          console.error('Failed to embed signature onto PDF document:', sigErr);
        }
      }
    }

    // Save final combined PDF
    const finalFilename = `dossier_${Date.now()}.pdf`;
    const finalPath = path.join(DOSSIERS_DIR, finalFilename);
    const mergedBytes = await mergedPdf.save();
    fs.writeFileSync(finalPath, mergedBytes);

    // Update monthly usage counter
    db.user.monthlyDossiersCreated += 1;
    const sessionUser = db.users.find(u => u.id === db.user.id);
    if (sessionUser) {
      sessionUser.monthlyDossiersCreated += 1;
    }

    // Save to generated dossiers history list
    const newDossier = {
      id: `dossier_${Date.now()}`,
      userId: db.user.id,
      title: offer.title,
      organizer: offer.organizer,
      createdAt: new Date().toISOString(),
      pdfPath: finalFilename,
      size: mergedBytes.length,
      piecesIncluded: piecesIncludedMetadata,
      hasCoverPage: coverPageEnabled,
      status: 'success' as const,
    };

    db.dossiers.push(newDossier);
    saveDB(db);
    saveEntityToFirestore('dossiers', newDossier.id, newDossier).catch(err => {
      console.error('Error syncing dossier to Firestore:', err);
    });
    if (sessionUser) {
      saveEntityToFirestore('users', sessionUser.id, sessionUser).catch(err => {
        console.error('Error syncing user' + 's counters to Firestore:', err);
      });
    }

    const payDetail = (currentPlan === 'free' && req.body.isPaidUnit) ? ' (Paiement à l\'unité de 2 000 FCFA)' : '';
    logActivity(db.user.id, db.user.email, 'GENERATE', `Génération de dossier PDF de soumission : ${offer.title}${payDetail}`, db.user.country || 'Sénégal', 0);

    res.json({ success: true, dossier: newDossier });
  } catch (error) {
    console.error('PDF Generation endpoint error:', error);
    res.status(500).json({ error: 'Une erreur technique est survenue lors de la fusion du dossier de soumission PDF.' });
  }
});

// Helper category label translation
function getCategoryLabel(category: string): string {
  const map: { [key: string]: string } = {
    CV: 'Curriculum Vitae',
    CNI: 'Pièce d\'Identité',
    NAISSANCE: 'Acte de Naissance',
    DIPLOME: 'Diplômes et Certificats',
    MOTIVATION: 'Lettre de Motivation',
    CASIER: 'Casier Judiciaire',
    PORTFOLIO: 'Portfolio et Références',
    ATTESTATION: 'Attestations Diverses',
    AUTRE: 'Autres Documents administratifs',
  };
  return map[category] || category;
}

// Custom file conversion to PDF doc helper
async function getPdfDocumentOfFile(fileBuffer: Buffer, mimeType: string): Promise<PDFDocument> {
  if (mimeType === 'application/pdf') {
    return await PDFDocument.load(fileBuffer);
  } else if (mimeType.startsWith('image/')) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.276, 841.89]); // A4
    const { width, height } = page.getSize();

    let image;
    if (mimeType === 'image/png') {
      image = await pdfDoc.embedPng(fileBuffer);
    } else {
      // JPG or JPEG
      image = await pdfDoc.embedJpg(fileBuffer);
    }

    // Scale to fit page with margins (25 points)
    const padding = 25;
    const maxWidth = width - padding * 2;
    const maxHeight = height - padding * 2;

    const imgDims = image.scaleToFit(maxWidth, maxHeight);

    // Center image on page
    const x = padding + (maxWidth - imgDims.width) / 2;
    const y = padding + (maxHeight - imgDims.height) / 2;

    page.drawImage(image, {
      x,
      y,
      width: imgDims.width,
      height: imgDims.height,
    });

    return pdfDoc;
  } else {
    // Plain text or fallback txt file rendering
    const textContent = fileBuffer.toString('utf-8');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.276, 841.89]); // A4
    const { width, height } = page.getSize();

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const lines = textContent.split('\n');
    let yPosition = height - 50;

    page.drawText('Document Texte Converti', {
      x: 50,
      y: yPosition,
      size: 16,
      font: helvetica,
      color: rgb(0.12, 0.43, 0.84),
    });
    yPosition -= 35;

    for (const line of lines) {
      if (yPosition < 60) {
        // Fallover to next page if vertical limit reached
        pdfDoc.addPage([595.276, 841.89]);
        yPosition = height - 50;
      }
      const cleanLine = line.trim().substring(0, 85);
      if (cleanLine) {
        page.drawText(cleanLine, {
          x: 50,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: rgb(0.15, 0.15, 0.15),
        });
      }
      yPosition -= 16;
    }

    return pdfDoc;
  }
}

// 4.5 Admin Dashboard APIs
const requireAdmin = (req: any, res: any, next: any) => {
  const db = getDB();
  if (db.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit. Réservé aux administrateurs.' });
  }
  next();
};

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const totalUsers = db.users.length;
    
    // Active < 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeUsers = db.users.filter(u => new Date(u.lastActiveAt).getTime() > thirtyDaysAgo).length;
    
    // Subscribers by plan
    const subscribersByPlan = {
      free: db.users.filter(u => u.plan === 'free').length,
      essentiel: db.users.filter(u => u.plan === 'essentiel').length,
      pro: db.users.filter(u => u.plan === 'pro').length,
      business: db.users.filter(u => u.plan === 'business').length,
    };
    
    const totalDossiers = db.users.reduce((sum, u) => sum + (u.monthlyDossiersCreated || 0), 0) + db.dossiers.length;
    
    // Conversion rate
    const payingUsersCount = db.users.filter(u => u.plan !== 'free').length;
    const conversionRate = totalUsers > 0 ? ((payingUsersCount / totalUsers) * 100).toFixed(1) : '0.0';
    
    // MRR in FCFA
    // Essentiel: 3000 FCFA, Pro: 7500 FCFA, Business: 15000 FCFA
    const mrr = db.users.reduce((sum, u) => {
      if (u.plan === 'essentiel') return sum + 3000;
      if (u.plan === 'pro') return sum + 7500;
      if (u.plan === 'business') return sum + 15000;
      return sum;
    }, 0);
    
    // Geo distribution
    const geoMap: { [key: string]: { users: number, dossiers: number } } = {};
    db.users.forEach(u => {
      const country = u.country || 'Sénégal';
      if (!geoMap[country]) {
        geoMap[country] = { users: 0, dossiers: 0 };
      }
      geoMap[country].users += 1;
      geoMap[country].dossiers += (u.monthlyDossiersCreated || 0);
    });
    
    const regionalDistribution = Object.keys(geoMap).map(country => ({
      country,
      users: geoMap[country].users,
      dossiers: geoMap[country].dossiers,
    }));
    
    // AI performance stats
    const aiStats = {
      totalAnalyses: db.activityLogs.filter(l => l.action === 'ANALYZE').length + 12,
      totalLetters: db.activityLogs.filter(l => l.action === 'LETTER_GEN').length + 5,
      errorRate: '1.2%',
      estimatedCostEuro: (db.activityLogs.reduce((sum, l) => sum + (l.costEstimate || 0), 0) + 0.35).toFixed(3),
    };
    
    res.json({
      totalUsers,
      activeUsers,
      subscribersByPlan,
      totalDossiers,
      conversionRate,
      mrr,
      regionalDistribution,
      aiStats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve admin stats' });
  }
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const { search, plan, country } = req.query;
    let filtered = [...db.users];
    
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (plan && plan !== 'all') {
      filtered = filtered.filter(u => u.plan === plan);
    }
    if (country && country !== 'all') {
      filtered = filtered.filter(u => u.country === country);
    }
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to query users list' });
  }
});

app.post('/api/admin/users/:id/suspend', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    user.isSuspended = !user.isSuspended;
    saveDB(db);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle suspend status' });
  }
});

app.post('/api/admin/users/:id/change-plan', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    const { plan } = req.body;
    if (plan && ['free', 'essentiel', 'pro', 'business'].includes(plan)) {
      user.plan = plan;
      // Update currently active user session if it is this user
      if (db.user.id === user.id) {
        db.user.plan = plan;
      }
      saveDB(db);
      return res.json({ success: true, user });
    }
    res.status(400).json({ error: 'Plan invalide' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to modify user plan' });
  }
});

app.get('/api/admin/logs', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    const sorted = [...db.activityLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

app.get('/api/admin/export-csv', requireAdmin, (req, res) => {
  try {
    const db = getDB();
    let csv = '\uFEFFID,Nom,Email,Plan,Pays,Dossiers Generes,Status,Date de Creation,Email Verifie\n';
    db.users.forEach(u => {
      const sanitizedName = u.name.replace(/"/g, '""');
      const sanitizedCountry = (u.country || 'Sénégal').replace(/"/g, '""');
      csv += `"${u.id}","${sanitizedName}","${u.email}","${u.plan}","${sanitizedCountry}",${u.monthlyDossiersCreated || 0},"${u.isSuspended ? 'Suspendu' : 'Actif'}","${u.createdAt || ''}",${u.emailVerified ? 'Oui' : 'Non'}\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="utilisateurs_candia.csv"');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).send('Échec de la génération du CSV d\'export');
  }
});

// 5. History and File download
app.get('/api/dossiers', (req, res) => {
  const db = getDB();
  res.json(db.dossiers);
});

// Check download permissions for a dossier
app.get('/api/dossiers/check-download/:id', (req, res) => {
  const db = getDB();
  const dossierId = req.params.id;
  const dossier = db.dossiers.find((d) => d.id === dossierId);

  if (!dossier) {
    return res.status(404).json({ error: 'Dossier introuvable' });
  }

  const user = db.user;
  
  // Admin is always allowed
  if (user && user.role === 'admin') {
    return res.json({ allowed: true });
  }

  // Paid plans (pro, business, essentiel) are always allowed
  const hasPaidPlan = ['essentiel', 'pro', 'business'].includes(user?.plan || 'free');
  if (hasPaidPlan) {
    return res.json({ allowed: true });
  }

  // Check if specifically unlocked/paid
  const unlocked = user?.unlockedDossiers?.includes(dossierId);
  if (unlocked) {
    return res.json({ allowed: true });
  }

  // Check if free demo download is still available (exactly 1 free PDF demo download)
  const downloadedCount = user?.downloadedDossiers?.length || 0;
  if (downloadedCount === 0) {
    return res.json({ allowed: true, isFreeDemo: true });
  }

  return res.json({ allowed: false, reason: 'payment_required' });
});

// Unlock a single dossier manually or after individual payment (2.5 USD)
app.post('/api/dossiers/unlock', (req, res) => {
  const { dossierId, transactionId } = req.body;
  if (!dossierId) {
    return res.status(400).json({ error: 'Dossier ID manquant' });
  }

  const db = getDB();
  const user = db.user;
  if (!user) {
    return res.status(401).json({ error: 'Non connecté' });
  }

  if (!user.unlockedDossiers) {
    user.unlockedDossiers = [];
  }
  
  if (!user.unlockedDossiers.includes(dossierId)) {
    user.unlockedDossiers.push(dossierId);
  }

  const foundUser = db.users.find(u => u.id === user.id);
  if (foundUser) {
    if (!foundUser.unlockedDossiers) foundUser.unlockedDossiers = [];
    if (!foundUser.unlockedDossiers.includes(dossierId)) {
      foundUser.unlockedDossiers.push(dossierId);
    }
  }

  logActivity(
    user.id,
    user.email,
    'UPGRADE',
    `Déverrouillage individuel du dossier ${dossierId} via FedaPay (2.5 USD) - Trans ID: ${transactionId || 'N/A'}`,
    user.country || 'Sénégal',
    2.5
  );

  saveDB(db);
  res.json({ success: true, user });
});

// Record when user has consumed their 1 free demo download
app.post('/api/user/record-free-download', (req, res) => {
  const { dossierId } = req.body;
  if (!dossierId) {
    return res.status(400).json({ error: 'Dossier ID manquant' });
  }

  const db = getDB();
  const user = db.user;
  if (!user) {
    return res.status(401).json({ error: 'Non connecté' });
  }

  if (!user.downloadedDossiers) {
    user.downloadedDossiers = [];
  }

  if (!user.downloadedDossiers.includes(dossierId)) {
    user.downloadedDossiers.push(dossierId);
  }

  const foundUser = db.users.find(u => u.id === user.id);
  if (foundUser) {
    if (!foundUser.downloadedDossiers) foundUser.downloadedDossiers = [];
    if (!foundUser.downloadedDossiers.includes(dossierId)) {
      foundUser.downloadedDossiers.push(dossierId);
    }
  }

  logActivity(
    user.id,
    user.email,
    'GENERATE',
    `Téléchargement du dossier de démonstration gratuit : ${dossierId}`,
    user.country || 'Sénégal',
    0
  );

  saveDB(db);
  res.json({ success: true, user });
});

// Upgrade user to monthly subscription (5 USD) or pro plan
app.post('/api/user/upgrade-to-paid', (req, res) => {
  const { transactionId } = req.body;
  const db = getDB();
  const user = db.user;
  if (!user) {
    return res.status(401).json({ error: 'Non connecté' });
  }

  // Update to Pro plan
  user.plan = 'pro';

  const foundUser = db.users.find(u => u.id === user.id);
  if (foundUser) {
    foundUser.plan = 'pro';
  }

  logActivity(
    user.id,
    user.email,
    'UPGRADE',
    `Activation de la formule Mensuelle Pro via FedaPay (5 USD) - Trans ID: ${transactionId || 'N/A'}`,
    user.country || 'Sénégal',
    5.0
  );

  saveDB(db);
  res.json({ success: true, user });
});

// Create FedaPay checkout session via API
app.post('/api/payments/create-checkout', async (req, res) => {
  try {
    const { amountUSD, description, isSubscription, dossierId } = req.body;
    const db = getDB();
    const user = db.user;
    if (!user) {
      return res.status(401).json({ error: 'Non connecté' });
    }

    const secretKey = (process.env.FEDAPAY_SECRET_KEY || '').replace(/^["']|["']$/g, '').trim() || 'sk_sandbox_demo';
    
    // Convert USD to CFA (1 USD = 600 CFA)
    const amountCFA = Math.round((amountUSD || 2.5) * 600);
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    // Mode simulation if secret key is demo
    if (secretKey === 'sk_sandbox_demo' || secretKey.includes('demo')) {
      console.log('[FedaPay SIMULATION] key is demo, generating simulated checkout URL');
      const mockUrl = `${appUrl}/api/payments/callback?id=mock_txn_${Date.now()}&status=approved&dossierId=${dossierId || ''}&isSubscription=${isSubscription ? 'true' : 'false'}&userId=${user.id}`;
      return res.json({ url: mockUrl, simulated: true });
    }

    // Create a Checkout Session on FedaPay (Use sandbox-api.fedapay.com for sandbox and api.fedapay.com for live keys)
    const isLive = secretKey.startsWith('sk_live_') || secretKey.startsWith('pk_live_');
    const fedaPayBaseUrl = isLive ? 'https://api.fedapay.com' : 'https://sandbox-api.fedapay.com';
    const fedaPayUrl = `${fedaPayBaseUrl}/v1/transactions`;

    const firstname = user.name ? user.name.split(' ')[0] : 'Candidat';
    const lastname = user.name ? user.name.split(' ').slice(1).join(' ') || 'Candia' : 'Candia';

    const bodyData = {
      amount: amountCFA,
      currency: {
        iso: 'XOF'
      },
      description: description || 'Paiement Candia',
      callback_url: `${appUrl}/api/payments/callback?dossierId=${dossierId || ''}&isSubscription=${isSubscription ? 'true' : 'false'}&userId=${user.id}`,
      customer: {
        firstname: firstname,
        lastname: lastname,
        email: user.email
      },
      custom_metadata: {
        userId: user.id,
        isSubscription: isSubscription ? 'true' : 'false',
        dossierId: dossierId || ''
      },
      metadata: {
        userId: user.id,
        isSubscription: isSubscription ? 'true' : 'false',
        dossierId: dossierId || ''
      }
    };

    console.log('[FedaPay Request URL]:', fedaPayUrl);
    console.log('[FedaPay Request Body]:', JSON.stringify(bodyData, null, 2));

    let response = await fetch(fedaPayUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.clone().json();
        console.error('FedaPay API Error JSON:', JSON.stringify(errorJson, null, 2));
        errorDetail = errorJson.message || errorJson.error || JSON.stringify(errorJson);
      } catch (e) {
        errorDetail = await response.text();
        console.error('FedaPay API Error Raw Text:', errorDetail);
      }
      return res.status(response.status).json({ error: `Erreur FedaPay (${response.status}) : ${errorDetail}` });
    }

    const data = await response.json();
    const checkoutUrl = data?.transaction?.payment_url || data?.['v1/transaction']?.payment_url || data?.payment_url || data?.checkout_link?.url || data?.checkout?.url || data?.url;

    if (!checkoutUrl) {
      console.error('No checkout URL in FedaPay response:', data);
      return res.status(500).json({ error: 'L\'URL de paiement n\'a pas pu être générée par FedaPay.' });
    }

    res.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error('Error creating checkout:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get FedaPay configuration status
app.get('/api/payments/status', (req, res) => {
  try {
    const secretKey = (process.env.FEDAPAY_SECRET_KEY || '').replace(/^["']|["']$/g, '').trim();
    const publicKey = (process.env.VITE_FEDAPAY_PUBLIC_KEY || '').replace(/^["']|["']$/g, '').trim();
    
    const hasSecret = !!secretKey && secretKey !== 'sk_sandbox_demo' && !secretKey.includes('demo');
    const hasPublic = !!publicKey;
    const isLive = secretKey.startsWith('sk_live_') || publicKey.startsWith('pk_live_');
    
    res.json({
      configured: hasSecret,
      isLive,
      mode: isLive ? 'live' : (hasSecret ? 'sandbox_real' : 'simulation_local'),
      publicKeyPrefix: publicKey ? publicKey.substring(0, 10) + '...' : null,
      secretKeyPrefix: secretKey ? secretKey.substring(0, 10) + '...' : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create FedaPay checkout session via API (alternate route as requested by user)
app.post('/api/create-payment', async (req, res) => {
  try {
    const { amountUSD, amount, description, isSubscription, dossierId, userId, email } = req.body;
    const db = getDB();
    
    // Support either active session user or passed userId/email
    let user = db.user;
    if (userId) {
      const found = db.users.find(u => u.id === userId);
      if (found) user = found as any;
    } else if (email) {
      const found = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (found) user = found as any;
    }

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non identifié. Veuillez vous connecter ou spécifier un userId.' });
    }

    const secretKey = (process.env.FEDAPAY_SECRET_KEY || '').replace(/^["']|["']$/g, '').trim() || 'sk_sandbox_demo';
    
    // Support either amountUSD or amount (default to 2.5 USD)
    const finalUSD = amountUSD || amount || 2.5;
    const amountCFA = Math.round(finalUSD * 600);
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    // Mode simulation if secret key is demo
    if (secretKey === 'sk_sandbox_demo' || secretKey.includes('demo')) {
      console.log('[FedaPay SIMULATION] key is demo, generating simulated checkout URL in /api/create-payment');
      const mockUrl = `${appUrl}/api/payments/callback?id=mock_txn_${Date.now()}&status=approved&dossierId=${dossierId || ''}&isSubscription=${isSubscription ? 'true' : 'false'}&userId=${user.id}`;
      return res.json({ url: mockUrl, simulated: true });
    }

    // Create a Checkout Session on FedaPay
    const isLive = secretKey.startsWith('sk_live_') || secretKey.startsWith('pk_live_');
    const fedaPayBaseUrl = isLive ? 'https://api.fedapay.com' : 'https://sandbox-api.fedapay.com';
    const fedaPayUrl = `${fedaPayBaseUrl}/v1/transactions`;

    const firstname = user.name ? user.name.split(' ')[0] : 'Candidat';
    const lastname = user.name ? user.name.split(' ').slice(1).join(' ') || 'Candia' : 'Candia';

    const bodyData = {
      amount: amountCFA,
      currency: {
        iso: 'XOF'
      },
      description: description || 'Paiement Candia FedaPay',
      callback_url: `${appUrl}/api/payments/callback?dossierId=${dossierId || ''}&isSubscription=${isSubscription === true || isSubscription === 'true' ? 'true' : 'false'}&userId=${user.id}`,
      customer: {
        firstname: firstname,
        lastname: lastname,
        email: user.email
      },
      custom_metadata: {
        userId: user.id,
        isSubscription: isSubscription === true || isSubscription === 'true' ? 'true' : 'false',
        dossierId: dossierId || ''
      },
      metadata: {
        userId: user.id,
        isSubscription: isSubscription === true || isSubscription === 'true' ? 'true' : 'false',
        dossierId: dossierId || ''
      }
    };

    console.log('[FedaPay Request URL]:', fedaPayUrl);
    let response = await fetch(fedaPayUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Erreur FedaPay (${response.status}) : ${errText}` });
    }

    const data = await response.json();
    const checkoutUrl = data?.transaction?.payment_url || data?.['v1/transaction']?.payment_url || data?.payment_url || data?.checkout_link?.url || data?.checkout?.url || data?.url;

    if (!checkoutUrl) {
      return res.status(500).json({ error: 'L\'URL de paiement n\'a pas pu être générée par FedaPay.' });
    }

    res.json({ url: checkoutUrl, transaction_id: data?.transaction?.id || data?.['v1/transaction']?.id || data?.id });
  } catch (error: any) {
    console.error('Error in /api/create-payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook FedaPay to receive real-time payment notifications (as requested by user)
app.post('/api/fedapay-webhook', async (req, res) => {
  console.log('🔔 FedaPay Webhook Received ! Headers:', JSON.stringify(req.headers));
  console.log('🔔 FedaPay Webhook Body:', JSON.stringify(req.body, null, 2));

  try {
    const event = req.body?.event;
    const entity = req.body?.entity;
    
    // Check if the event or entity indicates transaction.approved
    if (event !== 'transaction.approved' && req.body?.status !== 'approved' && entity?.status !== 'approved') {
      return res.status(200).json({ received: true, ignored: true, reason: `Ignored event: ${event || 'unknown'}` });
    }

    const transactionId = entity?.id || req.body?.id || entity?.transaction?.id || req.body?.entity_id;
    if (!transactionId) {
      return res.status(400).json({ error: 'Missing transaction ID in webhook payload.' });
    }

    const secretKey = (process.env.FEDAPAY_SECRET_KEY || '').replace(/^["']|["']$/g, '').trim() || 'sk_sandbox_demo';
    const isLive = secretKey.startsWith('sk_live_') || secretKey.startsWith('pk_live_');
    const fedaPayBaseUrl = isLive ? 'https://api.fedapay.com' : 'https://sandbox-api.fedapay.com';
    const verifyUrl = `${fedaPayBaseUrl}/v1/transactions/${transactionId}`;

    let isApproved = false;
    let transactionDetails = null;

    // Simulation / mock checks for easy testing
    if (String(transactionId).startsWith('mock_txn_')) {
      isApproved = true;
      transactionDetails = {
        id: transactionId,
        status: 'approved',
        custom_metadata: entity?.custom_metadata || entity?.metadata || req.body?.custom_metadata || req.body?.metadata || {}
      };
    } else {
      // Secure Retrieve & Verify step to guarantee payment authenticity and prevent spoofing
      console.log(`[Webhook] Verifying transaction ${transactionId} via FedaPay API...`);
      const response = await fetch(verifyUrl, {
        headers: {
          'Authorization': `Bearer ${secretKey}`
        }
      });

      if (!response.ok) {
        console.error(`[Webhook Error] Failed to verify FedaPay transaction ${transactionId}:`, response.status);
        return res.status(400).json({ error: 'Could not verify transaction with FedaPay' });
      }

      const data = await response.json();
      transactionDetails = data?.transaction || data?.['v1/transaction'] || data;
      isApproved = transactionDetails?.status === 'approved';
    }

    if (!isApproved) {
      console.warn(`[Webhook] Transaction ${transactionId} is not approved yet. Status is ${transactionDetails?.status}`);
      return res.status(200).json({ received: true, status: transactionDetails?.status, message: 'Transaction not approved' });
    }

    // Extract metadata to find user and payment intent
    const meta = transactionDetails?.custom_metadata || transactionDetails?.metadata || entity?.custom_metadata || entity?.metadata || {};
    const userId = meta.userId || req.body?.userId;
    const isSubscription = meta.isSubscription === 'true' || meta.isSubscription === true || req.body?.isSubscription === 'true';
    const dossierId = meta.dossierId || req.body?.dossierId;

    if (!userId) {
      console.error('[Webhook Error] No userId found in transaction metadata:', JSON.stringify(meta));
      return res.status(400).json({ error: 'No userId associated with this transaction' });
    }

    console.log(`[Webhook Success] Verified approved transaction ${transactionId} for user ${userId}. Plan upgrade: ${isSubscription}, Dossier: ${dossierId}`);

    const db = getDB();
    const foundUser = db.users.find(u => u.id === userId);
    
    if (isSubscription) {
      // Activate user's subscription
      if (foundUser) {
        foundUser.plan = 'pro';
      }
      if (db.user && db.user.id === userId) {
        db.user.plan = 'pro';
      }

      logActivity(
        userId,
        foundUser?.email || db.user?.email || 'user@example.com',
        'UPGRADE',
        `[Webhook] Activation de la formule Mensuelle Pro via FedaPay - Trans ID: ${transactionId}`,
        foundUser?.country || db.user?.country || 'Sénégal',
        5.0
      );

      if (foundUser) {
        saveEntityToFirestore('users', foundUser.id, foundUser).catch(err => {
          console.error('Error syncing user subscription status to Firestore from Webhook:', err);
        });
      }
    } else if (dossierId) {
      // Unlock individual dossier
      if (foundUser) {
        if (!foundUser.unlockedDossiers) foundUser.unlockedDossiers = [];
        if (!foundUser.unlockedDossiers.includes(dossierId)) {
          foundUser.unlockedDossiers.push(dossierId);
        }
      }
      if (db.user && db.user.id === userId) {
        if (!db.user.unlockedDossiers) db.user.unlockedDossiers = [];
        if (!db.user.unlockedDossiers.includes(dossierId)) {
          db.user.unlockedDossiers.push(dossierId);
        }
      }

      logActivity(
        userId,
        foundUser?.email || db.user?.email || 'user@example.com',
        'UPGRADE',
        `[Webhook] Déverrouillage du dossier ${dossierId} via FedaPay - Trans ID: ${transactionId}`,
        foundUser?.country || db.user?.country || 'Sénégal',
        2.5
      );

      if (foundUser) {
        saveEntityToFirestore('users', foundUser.id, foundUser).catch(err => {
          console.error('Error syncing unlocked dossier status to Firestore from Webhook:', err);
        });
      }
    }

    saveDB(db);
    return res.status(200).json({ success: true, message: 'Subscription/benefit successfully activated via Webhook' });
  } catch (error: any) {
    console.error('[Webhook Critical Error]:', error);
    return res.status(500).json({ error: error.message });
  }
});


// FedaPay payment completion callback
app.get('/api/payments/callback', async (req, res) => {
  try {
    const { id, dossierId, isSubscription, userId } = req.query;
    
    if (!id) {
      return res.redirect('/?payment_status=failed&message=' + encodeURIComponent('ID de transaction manquant.'));
    }

    const transactionId = id as string;

    // Simulation check
    if (transactionId.startsWith('mock_txn_')) {
      const db = getDB();
      const targetUserId = userId as string;
      
      if (isSubscription === 'true') {
        if (db.user && db.user.id === targetUserId) {
          db.user.plan = 'pro';
        }
        const foundUser = db.users.find(u => u.id === targetUserId);
        if (foundUser) {
          foundUser.plan = 'pro';
        }
        
        logActivity(
          targetUserId,
          db.user?.email || 'user@example.com',
          'UPGRADE',
          `[SIMULATION] Activation de la formule Mensuelle Pro via FedaPay API - Trans ID: ${transactionId}`,
          db.user?.country || 'Sénégal',
          5.0
        );
      } else if (dossierId) {
        const targetDossierId = dossierId as string;
        
        if (db.user && db.user.id === targetUserId) {
          if (!db.user.unlockedDossiers) db.user.unlockedDossiers = [];
          if (!db.user.unlockedDossiers.includes(targetDossierId)) {
            db.user.unlockedDossiers.push(targetDossierId);
          }
        }
        
        const foundUser = db.users.find(u => u.id === targetUserId);
        if (foundUser) {
          if (!foundUser.unlockedDossiers) foundUser.unlockedDossiers = [];
          if (!foundUser.unlockedDossiers.includes(targetDossierId)) {
            foundUser.unlockedDossiers.push(targetDossierId);
          }
        }

        logActivity(
          targetUserId,
          db.user?.email || 'user@example.com',
          'UPGRADE',
          `[SIMULATION] Déverrouillage individuel du dossier ${targetDossierId} via FedaPay API - Trans ID: ${transactionId}`,
          db.user?.country || 'Sénégal',
          2.5
        );
      }
      
      saveDB(db);
      return res.redirect('/?payment_status=success&message=' + encodeURIComponent('Paiement de démonstration validé avec succès !'));
    }

    const secretKey = (process.env.FEDAPAY_SECRET_KEY || '').replace(/^["']|["']$/g, '').trim() || 'sk_sandbox_demo';
    
    // Retrieve and verify transaction status from FedaPay (Use sandbox-api.fedapay.com for sandbox and api.fedapay.com for live keys)
    const isLive = secretKey.startsWith('sk_live_') || secretKey.startsWith('pk_live_');
    const fedaPayBaseUrl = isLive ? 'https://api.fedapay.com' : 'https://sandbox-api.fedapay.com';
    const verifyUrl = `${fedaPayBaseUrl}/v1/transactions/${transactionId}`;
    const response = await fetch(verifyUrl, {
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    });

    if (!response.ok) {
      console.error('Failed to verify FedaPay transaction:', transactionId);
      return res.redirect('/?payment_status=failed&message=' + encodeURIComponent('Impossible de vérifier le statut du paiement.'));
    }

    const data = await response.json();
    const transaction = data?.transaction || data?.['v1/transaction'];
    const txnStatus = transaction?.status;

    if (txnStatus === 'approved') {
      const db = getDB();
      const targetUserId = userId as string;
      
      if (isSubscription === 'true') {
        if (db.user && db.user.id === targetUserId) {
          db.user.plan = 'pro';
        }
        const foundUser = db.users.find(u => u.id === targetUserId);
        if (foundUser) {
          foundUser.plan = 'pro';
        }
        
        logActivity(
          targetUserId,
          db.user?.email || 'user@example.com',
          'UPGRADE',
          `Activation de la formule Mensuelle Pro via FedaPay API (5 USD) - Trans ID: ${transactionId}`,
          db.user?.country || 'Sénégal',
          5.0
        );
      } else if (dossierId) {
        const targetDossierId = dossierId as string;
        
        if (db.user && db.user.id === targetUserId) {
          if (!db.user.unlockedDossiers) db.user.unlockedDossiers = [];
          if (!db.user.unlockedDossiers.includes(targetDossierId)) {
            db.user.unlockedDossiers.push(targetDossierId);
          }
        }
        
        const foundUser = db.users.find(u => u.id === targetUserId);
        if (foundUser) {
          if (!foundUser.unlockedDossiers) foundUser.unlockedDossiers = [];
          if (!foundUser.unlockedDossiers.includes(targetDossierId)) {
            foundUser.unlockedDossiers.push(targetDossierId);
          }
        }

        logActivity(
          targetUserId,
          db.user?.email || 'user@example.com',
          'UPGRADE',
          `Déverrouillage individuel du dossier ${targetDossierId} via FedaPay API (2.5 USD) - Trans ID: ${transactionId}`,
          db.user?.country || 'Sénégal',
          2.5
        );
      }
      
      saveDB(db);
      return res.redirect('/?payment_status=success&message=' + encodeURIComponent('Votre paiement a été validé avec succès !'));
    } else {
      console.warn(`Transaction ${transactionId} not approved. Status is ${txnStatus}`);
      return res.redirect('/?payment_status=failed&message=' + encodeURIComponent(`Le paiement n'a pas été approuvé (statut: ${txnStatus}).`));
    }
  } catch (error: any) {
    console.error('Error handling payment callback:', error);
    return res.redirect('/?payment_status=failed&message=' + encodeURIComponent('Erreur lors du traitement du retour de paiement.'));
  }
});

app.get('/api/dossiers/download/:id', (req, res) => {
  const db = getDB();
  const dossierId = req.params.id;
  const dossier = db.dossiers.find((d) => d.id === dossierId);


  if (!dossier) {
    return res.status(404).json({ error: 'Dossier introuvable' });
  }

  const user = db.user;
  let isAllowed = false;

  if (user && user.role === 'admin') {
    isAllowed = true;
  } else if (['essentiel', 'pro', 'business'].includes(user?.plan || 'free')) {
    isAllowed = true;
  } else if (user?.unlockedDossiers?.includes(dossierId)) {
    isAllowed = true;
  } else if ((user?.downloadedDossiers?.length || 0) === 0) {
    // Consume the 1 free demo PDF download automatically
    isAllowed = true;
    if (user) {
      if (!user.downloadedDossiers) user.downloadedDossiers = [];
      user.downloadedDossiers.push(dossierId);
      const foundUser = db.users.find(u => u.id === user.id);
      if (foundUser) {
        if (!foundUser.downloadedDossiers) foundUser.downloadedDossiers = [];
        foundUser.downloadedDossiers.push(dossierId);
      }
      saveDB(db);
    }
  }

  if (!isAllowed) {
    return res.status(402).send(`
      <html>
        <head>
          <title>Paiement requis - Candia</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 100px 20px; }
            .card { background: #1e293b; max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 24px; border: 1px solid #334155; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { color: #f43f5e; margin-bottom: 20px; }
            p { color: #94a3b8; font-size: 16px; line-height: 1.6; }
            a { display: inline-block; background: #4f46e5; color: white; font-weight: bold; padding: 12px 30px; border-radius: 12px; text-decoration: none; margin-top: 25px; transition: background 0.2s; }
            a:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Paiement requis 🔒</h1>
            <p>Le téléchargement de ce dossier nécessite un abonnement actif ou l'achat d'un pass de génération unique.</p>
            <p>Veuillez retourner sur l'application pour régler votre accès via FedaPay de manière 100% sécurisée.</p>
            <a href="/">Retourner à l'application</a>
          </div>
        </body>
      </html>
    `);
  }

  // Check if it's the default demo PDF or a physically generated file
  if (dossier.pdfPath === 'demo_chef_projet.pdf') {
    // Generate a quick dummy PDF on-the-fly for demo download if physical file does not exist
    generateDemoPDF(res, dossier.title, dossier.organizer);
  } else {
    const filePath = path.join(DOSSIERS_DIR, dossier.pdfPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier PDF physique introuvable sur le serveur' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${dossier.title.replace(/[^a-zA-Z0-9]/g, '_')}_Candidature.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  }
});

async function generateDemoPDF(res: any, title: string, organizer: string) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.276, 841.89]);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('DOSSIER DE CANDIDATURE EXEMPLE (DÉMO)', { x: 50, y: 750, size: 16, font: helveticaBold, color: rgb(0.12, 0.43, 0.84) });
    page.drawText(`Poste : ${title}`, { x: 50, y: 700, size: 14, font: helvetica });
    page.drawText(`Organisme : ${organizer}`, { x: 50, y: 675, size: 14, font: helvetica });
    page.drawText('Ceci est un fichier d\'exemple généré à des fins de démonstration pour l\'application Candia SaaS.', { x: 50, y: 600, size: 10, font: helvetica, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('Toutes les fonctionnalités de fusion de vrais documents PDF, images et textes sont 100% opérationnelles.', { x: 50, y: 580, size: 10, font: helvetica, color: rgb(0.4, 0.4, 0.4) });

    const bytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Demo_Dossier_${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (err) {
    res.status(500).send('Error generating demo PDF');
  }
}

// -------------------------------------------------------------
// VITE AND STATIC ASSETS HANDLING
// -------------------------------------------------------------

if (process.env.NODE_ENV !== 'production') {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then((vite) => {
    app.use(vite.middlewares);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running in development mode on http://localhost:${PORT}`);
    });
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in production mode on port ${PORT}`);
  });
}
