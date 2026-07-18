import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  FolderLock,
  UploadCloud,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FileText,
  FileUser,
  FileBadge,
  Baby,
  GraduationCap,
  Mail,
  ShieldAlert,
  Briefcase,
  FileCheck,
  RefreshCw,
  Layers,
  History,
  Shield,
  Check,
  Info,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  X,
  Users,
  Lock,
  LogOut,
  UserCheck,
  DollarSign,
  TrendingUp,
  MapPin,
  Cpu,
  DownloadCloud,
  Eye,
  EyeOff,
  Settings,
  ChevronRight,
  UserPlus,
  Smartphone,
  CreditCard,
  Menu
} from 'lucide-react';
import { STANDARD_CATEGORIES, CategoryDefinition, SafeDocument, RecruitmentOffer, GeneratedDossier, DocumentCategory, User } from './types';

const getDossierPrice = (dossier: any) => {
  const pageCount = dossier?.pageCount || dossier?.pagesCount || 12;
  if (pageCount < 15) {
    return { fcfa: 1500, usd: 2.5, label: 'Moins de 15 pages' };
  } else if (pageCount <= 50) {
    return { fcfa: 5000, usd: 8.33, label: '15 à 50 pages' };
  } else {
    return { fcfa: 10000, usd: 16.67, label: 'Plus de 50 pages' };
  }
};

function getCategoryLabel(category: string): string {
  const map: { [key: string]: string } = {
    CV: 'Curriculum Vitae (CV)',
    CNI: "Pièce d'Identité (CNI / Passeport)",
    NAISSANCE: 'Acte de Naissance',
    DIPLOME: 'Diplômes et Certificats',
    MOTIVATION: 'Lettre de Motivation',
    CASIER: 'Casier Judiciaire',
    PORTFOLIO: 'Portfolio / Références',
    ATTESTATION: 'Attestations Diverses',
    SIGNATURE: 'Signature Manuscrite',
    AUTRE: 'Autres Documents',
  };
  return map[category] || category;
}

const getApiUrl = (path: string): string => {
  const rawBackendUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  let urlToUse = (rawBackendUrl && rawBackendUrl !== 'undefined' && rawBackendUrl !== 'null') ? rawBackendUrl : '';
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If running in the AI Studio preview environment (Cloud Run or localhost), 
    // we must always use the local container backend to prevent connecting to a wrong production front-end URL
    const isCloudRun = hostname.includes('run.app') || hostname.includes('appspot.com');
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isCloudRun || isLocal) {
      urlToUse = '';
    } else if (urlToUse) {
      const isLocalhostUrl = urlToUse.includes('localhost') || urlToUse.includes('127.0.0.1');
      if (isLocalhostUrl) {
        urlToUse = '';
      }
    }
  }
  
  if (!urlToUse) return path;
  
  const cleanBase = urlToUse.endsWith('/') ? urlToUse.slice(0, -1) : urlToUse;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

export default function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'safe' | 'new-application' | 'generator' | 'history' | 'admin'>('safe');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Authentication & Session state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', country: 'Sénégal' });
  const [resetSentInfo, setResetSentInfo] = useState<{ link: string; expires: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // User & Subscription states
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Safe / Documents states
  const [safeDocs, setSafeDocs] = useState<SafeDocument[]>([]);
  const [loadingSafe, setLoadingSafe] = useState(true);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [dragActiveCategory, setDragActiveCategory] = useState<string | null>(null);

  // Recruitment Offer & Analysis states
  const [offerFile, setOfferFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [analyzingOffer, setAnalyzingOffer] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<RecruitmentOffer | null>(null);
  const [dragOfferActive, setDragOfferActive] = useState(false);

  // Matching & Generation states
  const [mappings, setMappings] = useState<{ pieceId: string; documentId: string | null; ordre: number; pieceName: string; category: DocumentCategory; obligatoire: boolean }[]>([]);
  const [coverPageEnabled, setCoverPageEnabled] = useState(true);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [coverPageTheme, setCoverPageTheme] = useState('classic');
  const [coverLetterTheme, setCoverLetterTheme] = useState('classic');
  const [generatingDossier, setGeneratingDossier] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState<GeneratedDossier | null>(null);

  // Auto-signature Configuration
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [signatureCoords, setSignatureCoords] = useState({
    pageIndex: 0, // 0-indexed page to sign
    x: 420,       // points from left
    y: 110,       // points from bottom
    width: 120,
    height: 60,
    preset: 'bottom-right'
  });

  // History states
  const [history, setHistory] = useState<GeneratedDossier[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Cover Letter AI Assistant states
  const [isCoverLetterModalOpen, setIsCoverLetterModalOpen] = useState(false);
  const [coverLetterText, setCoverLetterText] = useState('');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [isSavingLetter, setIsSavingLetter] = useState(false);
  const [selectedCvForLetter, setSelectedCvForLetter] = useState('');
  const [letterFilename, setLetterFilename] = useState('Lettre_de_Motivation.pdf');
  const [letterSaveCategory, setLetterSaveCategory] = useState('MOTIVATION');
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [coverLetterSuccess, setCoverLetterSuccess] = useState<boolean>(false);

  // Auto-select first CV from safe when safeDocs changes
  useEffect(() => {
    const firstCv = safeDocs.find(d => d.category === 'CV');
    if (firstCv && !selectedCvForLetter) {
      setSelectedCvForLetter(firstCv.id);
    }
  }, [safeDocs]);

  // Secure admin tab navigation: redirect non-admin users
  useEffect(() => {
    if (activeTab === 'admin' && (!isLoggedIn || user?.role !== 'admin')) {
      setActiveTab('safe');
    }
  }, [activeTab, isLoggedIn, user]);

  const handleGenerateCoverLetter = async () => {
    if (!currentOffer) return;
    setIsGeneratingLetter(true);
    setCoverLetterError(null);
    setCoverLetterSuccess(false);
    try {
      const res = await fetch(getApiUrl('/api/motivation/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: currentOffer.id,
          docId: selectedCvForLetter || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la génération de la lettre.');
      }
      setCoverLetterText(data.text);
      
      // Auto set a nice filename based on offer title
      const cleanTitle = currentOffer.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      setLetterFilename(`Lettre_de_Motivation_${cleanTitle}.pdf`);
      setIsCoverLetterModalOpen(true);
    } catch (err: any) {
      console.error(err);
      setCoverLetterError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const handleSaveCoverLetter = async () => {
    if (!coverLetterText.trim()) return;
    setIsSavingLetter(true);
    setCoverLetterError(null);
    try {
      const res = await fetch(getApiUrl('/api/safe/save-text'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: coverLetterText,
          filename: letterFilename,
          category: letterSaveCategory,
          theme: coverLetterTheme
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde de la lettre.');
      }
      setCoverLetterSuccess(true);
      await fetchSafeDocs();
      
      // Auto assign to mapping
      if (data.document && data.document.id) {
        setMappings(prev => prev.map(m => {
          if (m.category === 'MOTIVATION' || m.pieceName.toLowerCase().includes('motivation') || m.pieceName.toLowerCase().includes('lettre')) {
            return { ...m, documentId: data.document.id };
          }
          return m;
        }));
      }

      setTimeout(() => {
        setIsCoverLetterModalOpen(false);
        setCoverLetterSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setCoverLetterError(err.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setIsSavingLetter(false);
    }
  };

  // Admin Dashboard states
  const [adminStats, setAdminStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    subscribersByPlan: { free: number; essentiel: number; pro: number; business: number };
    totalDossiers: number;
    conversionRate: string;
    mrr: number;
    regionalDistribution: { country: string; users: number; dossiers: number }[];
    aiStats: { totalAnalyses: number; totalLetters: number; errorRate: string; estimatedCostEuro: string };
  } | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminFilterPlan, setAdminFilterPlan] = useState('all');
  const [adminFilterCountry, setAdminFilterCountry] = useState('all');
  const [adminRealOnly, setAdminRealOnly] = useState(true);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Modals & Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPlanChangeConfirm, setShowPlanChangeConfirm] = useState<{ id: string; target: string } | null>(null);
  const [showCustomDocModal, setShowCustomDocModal] = useState(false);
  const [showFedaPayModal, setShowFedaPayModal] = useState(false);
  const [showFedaPaySimulator, setShowFedaPaySimulator] = useState(false);
  const [fedaPayStatus, setFedaPayStatus] = useState<{
    configured: boolean;
    isLive: boolean;
    mode: 'live' | 'sandbox_real' | 'simulation_local';
    publicKeyPrefix: string | null;
    secretKeyPrefix: string | null;
  } | null>(null);
  const [fedaPaySimulatedData, setFedaPaySimulatedData] = useState<{
    amountUSD: number;
    description: string;
    isSubscription: boolean;
    dossierId?: string;
    url: string;
  } | null>(null);

  // FedaPay Simulator Form States
  const [simulatedMethod, setSimulatedMethod] = useState<'momo' | 'card'>('momo');
  const [simulatedOperator, setSimulatedOperator] = useState<string>('mtn');
  const [simulatedPhoneNumber, setSimulatedPhoneNumber] = useState<string>('');
  const [simulatedCardNumber, setSimulatedCardNumber] = useState<string>('');
  const [simulatedCardExpiry, setSimulatedCardExpiry] = useState<string>('');
  const [simulatedCardCVC, setSimulatedCardCVC] = useState<string>('');
  const [isSimulatingProcess, setIsSimulatingProcess] = useState<boolean>(false);
  const [simulatingStep, setSimulatingStep] = useState<number>(1);
  const [simulatingCountdown, setSimulatingCountdown] = useState<number>(3);
  const [dossierToDownload, setDossierToDownload] = useState<GeneratedDossier | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [customDocName, setCustomDocName] = useState('');
  const [customDocFile, setCustomDocFile] = useState<File | null>(null);
  const [customUploading, setCustomUploading] = useState(false);

  // Refs
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const offerFileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchFedaPayStatus = async () => {
    try {
      const res = await fetch(getApiUrl('/api/payments/status'));
      if (res.ok) {
        const data = await res.json();
        setFedaPayStatus(data);
      }
    } catch (e) {
      console.error('Error fetching FedaPay status:', e);
    }
  };

  // Load Initial Session & Check payment callback parameters
  useEffect(() => {
    fetchSession();
    fetchFedaPayStatus();

    // Check for FedaPay payment query parameters
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const message = params.get('message');
    
    if (paymentStatus === 'success') {
      showSuccess(message || 'Votre paiement a été validé avec succès ! 🎉');
      // Clean query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'failed') {
      showError(message || 'Le paiement a échoué.');
      // Clean query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchSession = async () => {
    try {
      setLoadingUser(true);
      const res = await fetch(getApiUrl('/api/user'));
      const data = await res.json();
      if (data && data.id && data.id !== 'user_default' && data.id !== 'guest') {
        setUser(data);
        setIsLoggedIn(true);
        setCandidateName(data.name || '');
        setCandidateEmail(data.email || '');
        // Load secure documents & history
        await Promise.all([fetchSafeDocs(), fetchHistory()]);
      } else {
        // Logged out / Guest view
        setUser(data);
        setIsLoggedIn(false);
        await Promise.all([fetchSafeDocs(), fetchHistory()]);
      }
    } catch (err) {
      console.error('Session validation failed:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchSessionSilent = async () => {
    try {
      const res = await fetch(getApiUrl('/api/user'));
      const data = await res.json();
      if (data && data.id) {
        setUser(data);
      }
    } catch (err) {
      console.error('Silent session reload failed:', err);
    }
  };

  const handleDownloadClick = async (e: React.MouseEvent, dossierId: string, dossierTitle: string) => {
    e.preventDefault();
    try {
      const res = await fetch(getApiUrl(`/api/dossiers/check-download/${dossierId}`));
      const data = await res.json();
      if (data.allowed) {
        if (data.isFreeDemo) {
          alert("Félicitations ! Vous téléchargez votre premier dossier PDF d'essai gratuitement. Profitez-en ! 🎁");
        }
        // Start download
        window.open(getApiUrl(`/api/dossiers/download/${dossierId}`), '_blank');
        // Refresh session to sync downloadedCount
        setTimeout(() => {
          fetchSessionSilent();
        }, 1000);
      } else {
        // Show payment modal!
        setDossierToDownload({ id: dossierId, title: dossierTitle } as any);
        setShowFedaPayModal(true);
      }
    } catch (err) {
      console.error("Error checking download permissions:", err);
      // Fallback
      window.open(getApiUrl(`/api/dossiers/download/${dossierId}`), '_blank');
    }
  };

  const payWithFedaPay = async (amountInUSD: number, description: string, isSubscription: boolean, dossierId?: string, amountInCFA?: number) => {
    if (isPaying) return;
    setIsPaying(true);

    try {
      // Refresh status just in case
      let currentStatus = fedaPayStatus;
      if (!currentStatus) {
        try {
          const sRes = await fetch(getApiUrl('/api/payments/status'));
          if (sRes.ok) {
            currentStatus = await sRes.json();
            setFedaPayStatus(currentStatus);
          }
        } catch (e) {
          console.error('Failed to fetch FedaPay status:', e);
        }
      }

      const res = await fetch(getApiUrl('/api/payments/create-checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUSD: amountInUSD, amountCFA: amountInCFA, description, isSubscription, dossierId })
      });

      if (!res.ok) {
        const errorText = await res.text();
        let displayError = errorText;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson.error) {
            displayError = errJson.error;
          }
        } catch (e) {
          // not JSON
        }
        throw new Error(displayError);
      }

      const data = await res.json();
      if (data.simulated) {
        setFedaPaySimulatedData({
          amountUSD: amountInUSD,
          amountCFA: amountInCFA,
          description,
          isSubscription,
          dossierId,
          url: data.url
        });
        setShowFedaPaySimulator(true);
        setIsPaying(false);
      } else if (data.url) {
        // Rediriger le candidat vers la passerelle sécurisée FedaPay
        window.location.href = data.url;
      } else {
        throw new Error('Pas d\'URL de paiement retournée par FedaPay.');
      }
    } catch (err: any) {
      console.error('FedaPay Checkout API Error:', err);
      
      const isLive = fedaPayStatus?.mode === 'live' || fedaPayStatus?.mode === 'sandbox_real';
      
      if (isLive) {
        // Show real error to the user and never trigger simulator
        showError(`Échec de la transaction FedaPay : ${err.message || 'Une erreur est survenue lors de la création de la session de paiement.'}\n\nVeuillez vérifier vos clés secrètes FedaPay dans les variables d'environnement de votre projet.`);
        setIsPaying(false);
      } else {
        // Fallback for simulation_local
        setFedaPaySimulatedData({
          amountUSD: amountInUSD,
          amountCFA: amountInCFA,
          description,
          isSubscription,
          dossierId,
          url: `/api/payments/callback?id=mock_txn_${Date.now()}&status=approved&dossierId=${dossierId || ''}&isSubscription=${isSubscription ? 'true' : 'false'}&userId=${user?.id || 'sim'}`
        });
        setShowFedaPaySimulator(true);
        setIsPaying(false);
      }
    }
  };

  const completePayment = async (isSubscription: boolean, dossierId?: string, transactionId?: string) => {
    try {
      if (isSubscription) {
        const res = await fetch(getApiUrl('/api/user/upgrade-to-paid'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId })
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setSuccessMsg('Félicitations ! Votre abonnement Mensuel (5$ / mois) a été activé avec succès ! 🎉');
          setShowUpgradeModal(false);
          setShowFedaPayModal(false);
        }
      } else if (dossierId) {
        const res = await fetch(getApiUrl('/api/dossiers/unlock'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dossierId, transactionId })
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setSuccessMsg('Dossier déverrouillé avec succès ! Téléchargement en cours... 📄');
          setShowFedaPayModal(false);
          // Trigger download immediately
          window.open(getApiUrl(`/api/dossiers/download/${dossierId}`), '_blank');
        }
      }
      await fetchHistory();
    } catch (err) {
      console.error('Error completing payment:', err);
      alert('Erreur technique lors de l\'enregistrement du paiement.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleSimulatedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fedaPaySimulatedData) return;

    setIsSimulatingProcess(true);
    setSimulatingStep(1);

    setTimeout(() => {
      setSimulatingStep(2);

      setTimeout(() => {
        setSimulatingStep(3);
        setSimulatingCountdown(3);

        const interval = setInterval(() => {
          setSimulatingCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setSimulatingStep(4);
              
              setTimeout(() => {
                window.location.href = fedaPaySimulatedData.url;
              }, 1500);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

      }, 1200);
    }, 1200);
  };

  const fetchSafeDocs = async () => {
    try {
      setLoadingSafe(true);
      const res = await fetch(getApiUrl('/api/safe'));
      const data = await res.json();
      setSafeDocs(data);
    } catch (err) {
      console.error('Error fetching safe docs:', err);
    } finally {
      setLoadingSafe(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(getApiUrl('/api/dossiers'));
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Auth Submit Handlers
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    try {
      const { auth, signInWithPopup, googleProvider } = await import('./lib/firebase');
      const result = await signInWithPopup(auth, googleProvider);
      const fUser = result.user;
      if (!fUser || !fUser.email) {
        throw new Error("Impossible de récupérer les informations de votre compte Google.");
      }

      // Sync user to server
      const res = await fetch(getApiUrl('/api/auth/firebase-sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: fUser.uid,
          email: fUser.email,
          name: fUser.displayName,
          country: authForm.country || 'Sénégal'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la synchronisation de votre profil.');

      setUser(data.user);

      // Direct client-side write to Firestore to guarantee persistence
      try {
        const { db, doc, setDoc } = await import('./lib/firebase');
        await setDoc(doc(db, 'users', fUser.uid), {
          id: fUser.uid,
          name: data.user.name || fUser.displayName || fUser.email?.split('@')[0] || 'Utilisateur',
          email: fUser.email?.toLowerCase(),
          plan: data.user.plan || 'free',
          monthlyDossiersCreated: data.user.monthlyDossiersCreated || 0,
          country: data.user.country || authForm.country || 'Sénégal',
          isSuspended: false,
          createdAt: data.user.createdAt || new Date().toISOString(),
          emailVerified: true,
          lastActiveAt: new Date().toISOString(),
          role: (fUser.email?.toLowerCase() === 'admin@candia.ai' || fUser.email?.toLowerCase() === 'yoloucerveaux@gmail.com') ? 'admin' : (data.user.role || 'user'),
          unlockedDossiers: data.user.unlockedDossiers || [],
          downloadedDossiers: data.user.downloadedDossiers || []
        }, { merge: true });
        console.log("User successfully written directly to Firestore from Google login client.");
      } catch (fsErr) {
        console.error("Direct Firestore user write on Google login failed:", fsErr);
      }

      setIsLoggedIn(true);
      setCandidateName(data.user.name);
      setCandidateEmail(data.user.email);
      showSuccess(`Bienvenue ${data.user.name} ! Connexion Google réussie.`);
      await Promise.all([fetchSafeDocs(), fetchHistory()]);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code === 'auth/popup-closed-by-user' || (err.message && err.message.includes('popup-closed-by-user'))) {
        showError("La fenêtre de connexion Google a été fermée. Veuillez réessayer.");
      } else {
        showError(err.message || 'Une erreur est survenue lors de la connexion Google.');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const { auth, signInWithEmailAndPassword } = await import('./lib/firebase');
      const userCredential = await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      const fUser = userCredential.user;
      
      const res = await fetch(getApiUrl('/api/auth/firebase-sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: fUser.uid,
          email: fUser.email
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Identifiants invalides');
      
      setUser(data.user);

      // Direct client-side write to Firestore to update lastActiveAt and guarantee persistence
      try {
        const { db, doc, setDoc } = await import('./lib/firebase');
        await setDoc(doc(db, 'users', fUser.uid), {
          id: fUser.uid,
          name: data.user.name || fUser.email?.split('@')[0] || 'Utilisateur',
          email: fUser.email?.toLowerCase(),
          plan: data.user.plan || 'free',
          monthlyDossiersCreated: data.user.monthlyDossiersCreated || 0,
          country: data.user.country || 'Sénégal',
          isSuspended: false,
          lastActiveAt: new Date().toISOString(),
          role: data.user.role || (fUser.email?.toLowerCase() === 'admin@candia.ai' || fUser.email?.toLowerCase() === 'yoloucerveaux@gmail.com' ? 'admin' : 'user'),
          unlockedDossiers: data.user.unlockedDossiers || [],
          downloadedDossiers: data.user.downloadedDossiers || []
        }, { merge: true });
        console.log("User successfully updated directly in Firestore from login client.");
      } catch (fsErr) {
        console.error("Direct Firestore user update on login failed:", fsErr);
      }

      setIsLoggedIn(true);
      setCandidateName(data.user.name);
      setCandidateEmail(data.user.email);
      showSuccess(`Heureux de vous revoir, ${data.user.name} !`);
      await Promise.all([fetchSafeDocs(), fetchHistory()]);
    } catch (err: any) {
      console.warn('Firebase login failed, attempting local DB fallback:', err);
      try {
        const res = await fetch(getApiUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, password: authForm.password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Identifiants incorrects. Veuillez réessayer.');
        
        setUser(data.user);
        setIsLoggedIn(true);
        setCandidateName(data.user.name);
        setCandidateEmail(data.user.email);
        showSuccess(`Heureux de vous revoir, ${data.user.name} !`);
        await Promise.all([fetchSafeDocs(), fetchHistory()]);
      } catch (fallbackErr: any) {
        showError(fallbackErr.message || err.message);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const { auth, createUserWithEmailAndPassword } = await import('./lib/firebase');
      const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
      const fUser = userCredential.user;

      const res = await fetch(getApiUrl('/api/auth/firebase-sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: fUser.uid,
          email: fUser.email,
          name: authForm.name,
          country: authForm.country
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'inscription");

      setUser(data.user);

      // Direct client-side write to Firestore to guarantee persistence
      try {
        const { db, doc, setDoc } = await import('./lib/firebase');
        await setDoc(doc(db, 'users', fUser.uid), {
          id: fUser.uid,
          name: authForm.name || fUser.email?.split('@')[0] || 'Utilisateur',
          email: fUser.email?.toLowerCase(),
          plan: data.user.plan || 'free',
          monthlyDossiersCreated: data.user.monthlyDossiersCreated || 0,
          country: authForm.country || 'Sénégal',
          isSuspended: false,
          createdAt: data.user.createdAt || new Date().toISOString(),
          emailVerified: true,
          lastActiveAt: new Date().toISOString(),
          role: (fUser.email?.toLowerCase() === 'admin@candia.ai' || fUser.email?.toLowerCase() === 'yoloucerveaux@gmail.com') ? 'admin' : (data.user.role || 'user'),
          unlockedDossiers: data.user.unlockedDossiers || [],
          downloadedDossiers: data.user.downloadedDossiers || []
        }, { merge: true });
        console.log("User successfully written directly to Firestore from signup client.");
      } catch (fsErr) {
        console.error("Direct Firestore user write on signup failed:", fsErr);
      }

      setIsLoggedIn(true);
      setCandidateName(data.user.name);
      setCandidateEmail(data.user.email);
      showSuccess(`Votre compte Candia a été créé avec succès depuis le/la ${data.user.country} !`);
      await Promise.all([fetchSafeDocs(), fetchHistory()]);
    } catch (err: any) {
      console.warn('Firebase signup failed, trying local DB signup:', err);
      try {
        const res = await fetch(getApiUrl('/api/auth/signup'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authForm)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Échec de l'inscription");

        setUser(data.user);
        setIsLoggedIn(true);
        setCandidateName(data.user.name);
        setCandidateEmail(data.user.email);
        showSuccess(`Votre compte Candia a été créé avec succès depuis le/la ${data.user.country} !`);
        await Promise.all([fetchSafeDocs(), fetchHistory()]);
      } catch (localErr: any) {
        showError(localErr.message || err.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      try {
        const { auth, signOut } = await import('./lib/firebase');
        await signOut(auth);
      } catch (e) {
        console.warn('Firebase signout skipped or failed:', e);
      }
      await fetch(getApiUrl('/api/auth/logout'), { method: 'POST' });
      setIsLoggedIn(false);
      setUser(null);
      setSafeDocs([]);
      setHistory([]);
      setActiveTab('safe');
      showSuccess('Déconnexion réussie.');
      await fetchSession();
    } catch (err) {
      showError('Erreur de déconnexion.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSentInfo(null);
    try {
      const { auth, sendPasswordResetEmail } = await import('./lib/firebase');
      await sendPasswordResetEmail(auth, authForm.email);
      showSuccess(`Lien de réinitialisation envoyé par Firebase à l'adresse ${authForm.email} !`);
      setResetSentInfo({ link: '#', expires: '24 heures' });
    } catch (err: any) {
      console.warn('Firebase forgot-password failed, trying local DB reset link generation:', err);
      try {
        const res = await fetch(getApiUrl('/api/auth/forgot-password'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Email introuvable");
        
        setResetSentInfo({ link: data.resetLink, expires: data.expiresIn });
        showSuccess('Lien de réinitialisation sécurisé simulé généré !');
      } catch (localErr: any) {
        showError(localErr.message || err.message);
      }
    }
  };

  const verifyEmailSimulated = async () => {
    try {
      const res = await fetch(getApiUrl('/api/auth/verify-email'), { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        showSuccess('Votre adresse email a été certifiée avec succès !');
      }
    } catch (err) {
      showError('Erreur de vérification.');
    }
  };

  const handlePlanChange = async (targetPlan: 'free' | 'essentiel' | 'pro' | 'business') => {
    if (targetPlan === 'free') {
      try {
        const res = await fetch(getApiUrl('/api/user/change-plan'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'free' })
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data);
          showSuccess("Formule Gratuite activée.");
          setShowUpgradeModal(false);
        }
      } catch (err) {
        showError("Échec de la modification d'abonnement.");
      }
    } else {
      // Intégration FedaPay pour l'abonnement Mensuel Pro à 5 USD
      payWithFedaPay(5.0, "Abonnement Mensuel Candia Pro (5 USD)", true);
    }
  };

  // Safe file upload handler
  const handleSafeFileUpload = async (file: File, category: string): Promise<any> => {
    if (!file) return null;

    if (!isLoggedIn) {
      showError("Inscription ou connexion obligatoire pour ajouter des pièces à votre coffre-fort.");
      return null;
    }

    // Check plan constraints
    // Essentiel/Pro/Business support unlimited uploads. Free supports max 7 files in vault
    const isFree = user?.plan === 'free' || !user?.plan;
    if (isFree && safeDocs.length >= 7) {
      setShowUpgradeModal(true);
      return null;
    }

    setUploadingCategory(category);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      const res = await fetch(getApiUrl('/api/safe/upload'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur lors de l\'upload');
      }

      const data = await res.json();
      await fetchSafeDocs();
      showSuccess(`Document enregistré de façon chiffrée dans la catégorie ${category} !`);
      return data.document;
    } catch (err: any) {
      showError(err.message || 'Erreur lors du téléversement.');
      return null;
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleCustomDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      showError("Inscription ou connexion obligatoire pour ajouter des pièces à votre coffre-fort.");
      return;
    }
    if (!customDocName.trim()) {
      showError('Veuillez entrer un nom pour la pièce.');
      return;
    }
    if (!customDocFile) {
      showError('Veuillez sélectionner un fichier.');
      return;
    }

    setCustomUploading(true);
    try {
      const doc = await handleSafeFileUpload(customDocFile, customDocName.trim());
      if (doc) {
        setShowCustomDocModal(false);
        setCustomDocName('');
        setCustomDocFile(null);
      }
    } catch (err: any) {
      showError(err.message || "Erreur lors de l'ajout de la pièce.");
    } finally {
      setCustomUploading(false);
    }
  };

  const deleteSafeDoc = async (id: string, categoryName: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le document de la catégorie ${categoryName} ?`)) {
      return;
    }

    try {
      const res = await fetch(getApiUrl(`/api/safe/${id}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Échec de la suppression');
      await fetchSafeDocs();
      showSuccess('Document retiré de votre coffre-fort.');
    } catch (err) {
      showError('Impossible de supprimer le document.');
    }
  };

  // Recruitment Offer Analysis handler
  const handleOfferAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerFile && !rawText.trim()) {
      showError('Veuillez déposer un document d\'appel ou coller son texte descriptif.');
      return;
    }

    setAnalyzingOffer(true);
    setErrorMsg(null);
    setCurrentOffer(null);
    setGenerationSuccess(null);

    const formData = new FormData();
    if (offerFile) {
      formData.append('file', offerFile);
    }
    if (rawText) {
      formData.append('rawText', rawText);
    }

    try {
      const res = await fetch(getApiUrl('/api/offers/analyze'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de l\'analyse');
      }

      const offerData: RecruitmentOffer = await res.json();
      setCurrentOffer(offerData);

      // Initialize mappings with semantic recommendations
      const initialMappings = offerData.extractedPieces.map((piece) => ({
        pieceId: piece.id,
        documentId: piece.matchDocumentId, // auto matched category preselection
        ordre: piece.ordre,
        pieceName: piece.nomOriginal,
        category: piece.categorieProposee,
        obligatoire: piece.obligatoire,
      }));

      setMappings(initialMappings);
      setActiveTab('generator');
      showSuccess('L\'IA a analysé le document avec succès ! Ordonnancement structuré.');
    } catch (err: any) {
      showError(err.message || 'Erreur d\'analyse de l\'appel à recrutement.');
    } finally {
      setAnalyzingOffer(false);
    }
  };

  // Generate Dossier Handler with Auto-Signature & Unit Billing Option
  const [useUnitBilling, setUseUnitBilling] = useState(false);

  const handleGenerateDossier = async () => {
    if (!currentOffer) return;

    // Check plan restrictions
    // Free has limit of 3. If reached, they must upgrade or check useUnitBilling of 2000 FCFA
    const limitReached = (user?.plan === 'free' || !user?.plan) && (user?.monthlyDossiersCreated || 0) >= 3;
    if (limitReached && !useUnitBilling) {
      setShowUpgradeModal(true);
      return;
    }

    const missingMandatory = mappings.filter((m) => m.obligatoire && !m.documentId);
    if (missingMandatory.length > 0) {
      const pieceNames = missingMandatory.map((m) => `"${m.pieceName}"`).join(', ');
      if (!window.confirm(`Attention, certaines pièces obligatoires n'ont pas de document associé : ${pieceNames}. Voulez-vous lancer la génération malgré tout ?`)) {
        return;
      }
    }

    setGeneratingDossier(true);
    setErrorMsg(null);
    setGenerationSuccess(null);

    const payload = {
      offerId: currentOffer.id,
      coverPageOptions: {
        enabled: coverPageEnabled,
        candidateName,
        candidateEmail,
        notes,
        theme: coverPageTheme,
      },
      mappings: mappings.map((m) => ({
        pieceId: m.pieceId,
        documentId: m.documentId,
        ordre: m.ordre,
      })),
      signatureOptions: {
        enabled: signatureEnabled && safeDocs.some(d => d.category === 'SIGNATURE'),
        pageIndex: signatureCoords.pageIndex,
        x: signatureCoords.x,
        y: signatureCoords.y,
        width: signatureCoords.width,
        height: signatureCoords.height,
      },
      isPaidUnit: useUnitBilling,
    };

    try {
      const res = await fetch(getApiUrl('/api/dossiers/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de la génération');
      }

      const result = await res.json();
      setGenerationSuccess(result.dossier);
      setUseUnitBilling(false); // Reset single pay option
      showSuccess('Votre dossier de soumission PDF unique a été généré !');
      await Promise.all([fetchSession(), fetchHistory()]);
    } catch (err: any) {
      showError(err.message || 'Erreur de génération du PDF.');
    } finally {
      setGeneratingDossier(false);
    }
  };

  // Load Admin Data
  const loadAdminDashboard = async () => {
    setLoadingAdmin(true);
    try {
      const emailHeader = user?.email || '';
      const [statsRes, logsRes] = await Promise.all([
        fetch(getApiUrl('/api/admin/stats'), {
          headers: { 'x-user-email': emailHeader }
        }),
        fetch(getApiUrl('/api/admin/logs'), {
          headers: { 'x-user-email': emailHeader }
        })
      ]);

      const statsData = await statsRes.json();
      const logsData = await logsRes.json();

      // Try loading stats & users list directly from Cloud Firestore to guarantee real-time updates and bypass backend permission issue
      let usersData: any[] = [];
      let calculatedStats = null;
      try {
        const { db, collection, getDocs } = await import('./lib/firebase');
        const querySnapshot = await getDocs(collection(db, 'users'));
        querySnapshot.forEach((docSnap) => {
          usersData.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });

        const isRealUser = (u: any) => u.id !== 'user_default' && u.id !== 'guest' && u.email !== 'admin@candia.ai';
        usersData = usersData.filter(isRealUser);

        if (usersData.length > 0) {
          const totalUsers = usersData.length;
          
          // Active < 30 days
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const activeUsers = usersData.filter(u => new Date(u.lastActiveAt || u.createdAt || 0).getTime() > thirtyDaysAgo).length;
          
          // Subscribers by plan
          const subscribersByPlan = {
            free: usersData.filter(u => u.plan === 'free' || !u.plan).length,
            essentiel: usersData.filter(u => u.plan === 'essentiel').length,
            pro: usersData.filter(u => u.plan === 'pro').length,
            business: usersData.filter(u => u.plan === 'business').length,
          };
          
          // Total dossiers: query the dossiers collection to get the real count of dossiers in Firestore!
          let totalDossiers = 0;
          try {
            const dossiersSnap = await getDocs(collection(db, 'dossiers'));
            totalDossiers = dossiersSnap.size;
          } catch (dossierErr) {
            console.warn("Could not load dossiers count directly from Firestore:", dossierErr);
            totalDossiers = 0;
          }

          // Paying users count
          const payingUsersCount = usersData.filter(u => u.plan && u.plan !== 'free').length;
          const conversionRate = totalUsers > 0 ? ((payingUsersCount / totalUsers) * 100).toFixed(1) : '0.0';

          // MRR in FCFA
          // Essentiel: 3000 FCFA, Pro: 7500 FCFA, Business: 15000 FCFA
          const mrr = usersData.reduce((sum, u) => {
            if (u.plan === 'essentiel') return sum + 3000;
            if (u.plan === 'pro') return sum + 7500;
            if (u.plan === 'business') return sum + 15000;
            return sum;
          }, 0);

          // Geo distribution
          const geoMap: { [key: string]: { users: number, dossiers: number } } = {};
          usersData.forEach(u => {
            const country = u.country || 'Sénégal';
            if (!geoMap[country]) {
              geoMap[country] = { users: 0, dossiers: 0 };
            }
            geoMap[country].users += 1;
          });

          // Also count actual dossiers country origins if any
          try {
            const dossiersSnap = await getDocs(collection(db, 'dossiers'));
            dossiersSnap.forEach((doc) => {
              const d = doc.data();
              const u = usersData.find(usr => usr.id === d.userId);
              const country = u?.country || 'Sénégal';
              if (!geoMap[country]) {
                geoMap[country] = { users: 0, dossiers: 0 };
              }
              geoMap[country].dossiers += 1;
            });
          } catch (e) {
            console.warn(e);
          }

          const regionalDistribution = Object.keys(geoMap).map(country => ({
            country,
            users: geoMap[country].users,
            dossiers: geoMap[country].dossiers,
          }));

          // AI performance stats strictly from actual logsData
          const cleanLogs = Array.isArray(logsData) ? logsData : [];
          const aiStats = {
            totalAnalyses: cleanLogs.filter((l: any) => l.action === 'ANALYZE').length,
            totalLetters: cleanLogs.filter((l: any) => l.action === 'LETTER_GEN').length,
            errorRate: '0.0%',
            estimatedCostEuro: cleanLogs.reduce((sum: number, l: any) => sum + (l.costEstimate || 0), 0).toFixed(3),
          };

          calculatedStats = {
            totalUsers,
            activeUsers,
            subscribersByPlan,
            totalDossiers,
            conversionRate,
            mrr,
            regionalDistribution,
            aiStats
          };

          // Filter by search
          if (adminSearch) {
            const q = adminSearch.toLowerCase().trim();
            usersData = usersData.filter(u => 
              (u.name && u.name.toLowerCase().includes(q)) || 
              (u.email && u.email.toLowerCase().includes(q))
            );
          }
          // Filter by plan
          if (adminFilterPlan && adminFilterPlan !== 'all') {
            usersData = usersData.filter(u => u.plan === adminFilterPlan);
          }
          // Filter by country
          if (adminFilterCountry && adminFilterCountry !== 'all') {
            usersData = usersData.filter(u => u.country === adminFilterCountry);
          }

          // Sort by createdAt descending
          usersData.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
        } else {
          // Fallback to server if empty
          throw new Error("Firestore users list is empty");
        }
      } catch (fsErr) {
        console.warn("Could not load stats & users directly from Firestore, falling back to server API:", fsErr);
        const usersRes = await fetch(getApiUrl(`/api/admin/users?search=${encodeURIComponent(adminSearch)}&plan=${adminFilterPlan}&country=${adminFilterCountry}`), {
          headers: { 'x-user-email': emailHeader }
        });
        usersData = await usersRes.json();
      }

      setAdminStats(calculatedStats || statsData);
      setAdminUsers(usersData);
      setAdminLogs(logsData);
    } catch (err) {
      showError('Erreur lors du chargement de l\'espace administrateur.');
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') {
      loadAdminDashboard();
    }
  }, [activeTab, adminSearch, adminFilterPlan, adminFilterCountry, adminRealOnly]);

  // Admin Toggle Suspend Action
  const toggleUserSuspension = async (userId: string) => {
    try {
      const emailHeader = user?.email || '';
      const res = await fetch(getApiUrl(`/api/admin/users/${userId}/suspend`), {
        method: 'POST',
        headers: { 'x-user-email': emailHeader }
      });
      if (res.ok) {
        // Direct Client-Side Firestore Sync
        try {
          const { db, doc, setDoc, getDoc } = await import('./lib/firebase');
          const userDocRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const currentSuspended = userSnap.data().isSuspended || false;
            await setDoc(userDocRef, { isSuspended: !currentSuspended }, { merge: true });
            console.log("Direct client-side Firestore suspend updated.");
          }
        } catch (fsErr) {
          console.error("Direct Firestore suspend sync failed:", fsErr);
        }

        showSuccess('Statut d\'accès de l\'utilisateur modifié !');
        loadAdminDashboard();
      }
    } catch (err) {
      showError('Échec de la suspension.');
    }
  };

  // Admin Change Plan Action
  const adminChangeUserPlan = async (userId: string, targetPlan: string) => {
    try {
      const emailHeader = user?.email || '';
      const res = await fetch(getApiUrl(`/api/admin/users/${userId}/change-plan`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-email': emailHeader
        },
        body: JSON.stringify({ plan: targetPlan })
      });
      if (res.ok) {
        // Direct Client-Side Firestore Sync
        try {
          const { db, doc, setDoc } = await import('./lib/firebase');
          const userDocRef = doc(db, 'users', userId);
          await setDoc(userDocRef, { plan: targetPlan }, { merge: true });
          console.log("Direct client-side Firestore plan updated.");
        } catch (fsErr) {
          console.error("Direct Firestore plan sync failed:", fsErr);
        }

        showSuccess('Formule d\'abonnement utilisateur modifiée avec succès.');
        setShowPlanChangeConfirm(null);
        loadAdminDashboard();
        fetchSession(); // Refresh current if it was changed
      }
    } catch (err) {
      showError('Échec de la modification d\'abonnement.');
    }
  };

  // Alert Notifications helpers
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 8000);
  };

  // Signature coordinate presets
  const applySignaturePreset = (presetName: string) => {
    let coords = { x: 420, y: 110, preset: presetName };
    if (presetName === 'bottom-left') {
      coords = { x: 50, y: 110, preset: presetName };
    } else if (presetName === 'bottom-center') {
      coords = { x: 235, y: 110, preset: presetName };
    }
    setSignatureCoords(prev => ({ ...prev, ...coords }));
  };

  // Drag Drop utilities
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCategoryDrag = (e: React.DragEvent, categoryCode: string) => {
    e.preventDefault();
    setDragActiveCategory(categoryCode);
  };

  const handleCategoryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActiveCategory(null);
  };

  const handleCategoryDrop = (e: React.DragEvent, categoryCode: string) => {
    e.preventDefault();
    setDragActiveCategory(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSafeFileUpload(e.dataTransfer.files[0], categoryCode);
    }
  };

  // Translate Category Icons to beautiful Lucide components
  const renderCategoryIcon = (iconName: string, className = 'w-6 h-6 text-indigo-600') => {
    switch (iconName) {
      case 'FileUser':
        return <FileUser className={className} />;
      case 'FileBadge':
        return <FileBadge className={className} />;
      case 'Baby':
        return <Baby className={className} />;
      case 'GraduationCap':
        return <GraduationCap className={className} />;
      case 'Mail':
        return <Mail className={className} />;
      case 'ShieldAlert':
        return <ShieldAlert className={className} />;
      case 'Briefcase':
        return <Briefcase className={className} />;
      case 'FileCheck':
        return <FileCheck className={className} />;
      default:
        return <FileText className={className} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Alert Banner Container */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white px-6 py-3.5 rounded-xl shadow-xl font-medium text-sm"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-100" />
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="hover:text-emerald-200 ml-2">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 bg-rose-600 text-white px-6 py-4 rounded-xl shadow-xl font-medium max-w-xl text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-100" />
            <div className="flex-1">
              <p className="font-semibold text-white">Action Impossible</p>
              <p className="text-xs text-rose-100 mt-0.5 leading-relaxed">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} className="hover:text-rose-200 ml-2">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar backdrop */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-35 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Aside Left Sidebar navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 text-white flex flex-col shrink-0 border-r border-slate-900 transition-transform duration-300 md:translate-x-0 md:static ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-900">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/20 shrink-0">
              <FolderLock className="w-5 h-5" />
            </div>
            <div className="truncate">
              <span className="text-lg font-display font-bold tracking-tight text-white flex items-center gap-1">
                Candia <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400/20 animate-pulse" />
              </span>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase leading-none mt-1">SaaS de Soumission IA</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth status panel */}
        <div className="px-4 pt-4 shrink-0">
          {isLoggedIn && user ? (
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center uppercase text-sm border border-indigo-500/30">
                  {user.name ? user.name[0] : 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">{user.email}</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/40">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Plan actuel</span>
                <span className="text-[10px] font-bold text-indigo-400 uppercase">{user.plan}</span>
              </div>

              {!user.emailVerified && (
                <button
                  onClick={verifyEmailSimulated}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 justify-center bg-amber-500/10 border border-amber-500/20 py-1 rounded-lg cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3 animate-pulse" />
                  Adresse email non vérifiée • Certifier
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-center space-y-3">
              <p className="text-xs text-slate-300 leading-normal font-medium">Connectez-vous pour conserver vos fichiers à vie.</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setAuthMode('login'); setActiveTab('safe'); setIsMobileSidebarOpen(false); }}
                  className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Connexion
                </button>
                <button
                  onClick={() => { setAuthMode('signup'); setActiveTab('safe'); setIsMobileSidebarOpen(false); }}
                  className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Inscription
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Nav Tabs */}
        <nav className="flex-1 p-4 space-y-1.5 mt-4 overflow-y-auto">
          <p className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2 tracking-widest">Fonctionnalités</p>

          <button
            onClick={() => { setActiveTab('safe'); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-150 cursor-pointer text-left bg-[#000000] ${activeTab === 'safe' ? 'text-indigo-300 font-semibold border-l-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-[#000000]/50'}`}
          >
            <FolderLock className="w-4 h-4 shrink-0" />
            <span className="font-medium text-sm">1. Mon Coffre-fort</span>
            {safeDocs.length > 0 && (
              <span className="ml-auto bg-slate-900 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-800">
                {safeDocs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('new-application'); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-150 cursor-pointer text-left ${activeTab === 'new-application' ? 'bg-slate-900 text-indigo-300 font-semibold border-l-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}
          >
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span className="font-medium text-sm">2. Analyser un Appel</span>
          </button>

          <button
            onClick={() => {
              if (!currentOffer) {
                showError("Veuillez d'abord analyser un appel ou une offre de recrutement dans l'onglet 'Analyser un Appel'.");
                return;
              }
              setActiveTab('generator');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-150 cursor-pointer text-left ${!currentOffer ? 'opacity-40 cursor-not-allowed' : ''} ${activeTab === 'generator' ? 'bg-slate-900 text-indigo-300 font-semibold border-l-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="font-medium text-sm flex-1">3. Ordonner & Signer</span>
            {currentOffer && (
              <span className="ml-auto bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                Prêt
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('history'); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-150 cursor-pointer text-left ${activeTab === 'history' ? 'bg-slate-900 text-indigo-300 font-semibold border-l-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span className="font-medium text-sm">Historique</span>
            {history.length > 0 && (
              <span className="ml-auto bg-slate-900 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-800">
                {history.length}
              </span>
            )}
          </button>

          {isLoggedIn && user?.role === 'admin' && (
            <div className="pt-6 border-t border-slate-900 mt-6 space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2 tracking-widest">Administration</p>

              <button
                onClick={() => { setActiveTab('admin'); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-150 cursor-pointer text-left ${activeTab === 'admin' ? 'bg-slate-900 text-indigo-300 font-semibold border-l-2 border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="font-medium text-sm">Tableau de bord Admin</span>
                <span className="ml-auto bg-indigo-500/25 text-indigo-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Accès
                </span>
              </button>
            </div>
          )}
        </nav>

        {/* Sidebar Logged In Footer */}
        {isLoggedIn && user && (
          <div className="p-4 border-t border-slate-900 bg-slate-950/40 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              Générations : <span className="font-bold text-slate-100">{user.monthlyDossiersCreated} / {user.plan === 'free' ? '3' : '∞'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Se déconnecter
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {/* Header Ribbon bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-xs">
          <div className="flex items-center space-x-2 text-sm text-slate-500 font-medium overflow-hidden">
            {/* Hamburger button on mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 mr-1 shrink-0 cursor-pointer"
              title="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="hidden sm:inline hover:text-slate-800 transition-colors">Plateforme</span>
            <span className="hidden sm:inline text-slate-300">/</span>
            <span className="text-slate-950 font-semibold truncate max-w-[150px] sm:max-w-none">
              {activeTab === 'safe' && 'Mon Coffre-fort'}
              {activeTab === 'new-application' && 'Analyser un Appel'}
              {activeTab === 'generator' && (currentOffer ? currentOffer.title : 'Fusionner & Signer')}
              {activeTab === 'history' && 'Historique de Dossiers'}
              {activeTab === 'admin' && 'Espace Administrateur Senior'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-xs bg-linear-to-r from-amber-500 to-orange-500 text-white hover:shadow-md cursor-pointer hover:scale-101"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tarifs & Formules
            </button>
          </div>
        </header>

        {/* Scrollable Panel View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <AnimatePresence mode="wait">
            
            {/* 1. MON COFFRE-FORT TAB */}
            {activeTab === 'safe' && (
              <motion.div
                key="safe-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Simulated Login modal/prompt inside panel if not logged in */}
                {!isLoggedIn && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl max-w-xl mx-auto space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
                        <FolderLock className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-xl text-white">Conserver vos documents à vie ?</h2>
                        <p className="text-xs text-slate-400 mt-1">Créez votre compte ou connectez-vous pour sauvegarder vos documents de manière sécurisée.</p>
                      </div>
                    </div>

                    {authMode === 'login' ? (
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Adresse Email</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type="email"
                              required
                              value={authForm.email}
                              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                              placeholder="nom@exemple.com"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-10 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase flex justify-between">
                            <span>Mot de passe</span>
                            <button type="button" onClick={() => setAuthMode('forgot')} className="text-[10px] text-indigo-400 hover:underline">Mot de passe oublié ?</button>
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={authForm.password}
                              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                              placeholder="••••••••"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-10 pr-10 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
                              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3.5 pt-2">
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer shadow-sm shadow-indigo-600/20 text-center"
                          >
                            Se connecter
                          </button>

                          <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer border border-slate-800 text-center flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Se connecter avec Google (Gmail)
                          </button>

                        </div>

                        <p className="text-xs text-slate-500 text-center">
                          Vous n'avez pas de compte ?{' '}
                          <button type="button" onClick={() => setAuthMode('signup')} className="text-indigo-400 font-bold hover:underline">S'inscrire gratuitement</button>
                        </p>
                      </form>
                    ) : authMode === 'signup' ? (
                      <form onSubmit={handleSignup} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Nom complet</label>
                            <div className="relative">
                              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <input
                                type="text"
                                required
                                value={authForm.name}
                                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                                placeholder="Amadou Diallo"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-10 text-sm text-white focus:border-indigo-500 outline-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-bold uppercase">Pays de résidence</label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <select
                                value={authForm.country}
                                onChange={(e) => setAuthForm({ ...authForm, country: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-10 text-sm text-white focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                              >
                                <option value="Sénégal">Sénégal</option>
                                <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                                <option value="Cameroun">Cameroun</option>
                                <option value="Gabon">Gabon</option>
                                <option value="Mali">Mali</option>
                                <option value="Togo">Togo</option>
                                <option value="Bénin">Bénin</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Adresse Email</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type="email"
                              required
                              value={authForm.email}
                              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                              placeholder="amadou.diallo@gmail.com"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-10 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Mot de passe de sécurité</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={authForm.password}
                              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                              placeholder="Min. 6 caractères"
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-10 pr-10 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
                              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                         <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl text-sm transition-all cursor-pointer"
                        >
                          Créer mon compte de soumission
                        </button>

                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer border border-slate-800 text-center flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          S'inscrire avec Google (Gmail)
                        </button>
                        <p className="text-xs text-slate-500 text-center">
                          Vous possédez déjà un compte ?{' '}
                          <button type="button" onClick={() => setAuthMode('login')} className="text-indigo-400 font-bold hover:underline">Se connecter</button>
                        </p>
                      </form>
                    ) : (
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-400 font-bold uppercase">Votre Adresse Email</label>
                          <input
                            type="email"
                            required
                            value={authForm.email}
                            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                            placeholder="amadou.diallo@gmail.com"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer"
                        >
                          Envoyer le lien de réinitialisation
                        </button>

                        {resetSentInfo && (
                          <div className="bg-indigo-950/80 border border-indigo-900 rounded-xl p-4 space-y-2 mt-2">
                            <p className="text-xs text-indigo-200">
                              <span className="font-bold text-white block">Email envoyé (Simulé) :</span>
                              Un courriel de réinitialisation sécurisé a été généré. Pour les besoins de test, cliquez ci-dessous pour changer le mot de passe :
                            </p>
                            <a
                              href={resetSentInfo.link}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => {
                                const newPass = window.prompt("Saisissez votre nouveau mot de passe :");
                                if (newPass) {
                                  fetch(getApiUrl('/api/auth/reset-password'), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email: authForm.email, newPassword: newPass })
                                  }).then(r => r.json()).then(res => {
                                    showSuccess('Mot de passe mis à jour avec succès !');
                                    setAuthMode('login');
                                  });
                                }
                              }}
                              className="inline-block text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg mt-1"
                            >
                              Réinitialiser mon mot de passe maintenant
                            </a>
                          </div>
                        )}

                        <p className="text-xs text-slate-500 text-center pt-2">
                          <button type="button" onClick={() => setAuthMode('login')} className="text-indigo-400 font-bold hover:underline">Retourner à la connexion</button>
                        </p>
                      </form>
                    )}
                  </div>
                )}

                {/* Vault Grid Section */}
                {isLoggedIn ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="font-display font-bold text-xl text-slate-900">Bibliothèque Coffre-fort Sécurisé</h2>
                      <p className="text-xs text-slate-500 mt-1">Uploadez vos documents administratifs récurrents. L'IA les classera de façon sémantique.</p>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => setShowCustomDocModal(true)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Nouveau document
                      </button>
                      {user?.plan === 'free' && (
                        <span className="text-xs bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-indigo-800 font-medium">
                          Fichiers : <strong>{safeDocs.length}</strong> / 7 max
                        </span>
                      )}
                    </div>
                  </div>

                  {loadingSafe ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                      <p className="text-xs text-slate-500 font-medium">Récupération des fichiers chiffrés...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                      {STANDARD_CATEGORIES.map((cat) => {
                        const uploadedFiles = safeDocs.filter(d => d.category === cat.code);

                        return (
                          <div
                            key={cat.code}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleCategoryDrag(e, cat.code)}
                            onDragLeave={handleCategoryDragLeave}
                            onDrop={(e) => handleCategoryDrop(e, cat.code)}
                            className={`group flex flex-col justify-between bg-white border-2 rounded-2xl p-5 transition-all duration-300 min-h-[220px] ${dragActiveCategory === cat.code ? 'border-indigo-500 bg-indigo-50/40 scale-102 shadow-md' : uploadedFiles.length > 0 ? 'border-slate-200 hover:border-emerald-500' : 'border-dashed border-slate-300 hover:border-indigo-500'}`}
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <div className="bg-slate-100 p-2.5 rounded-xl group-hover:bg-indigo-100 transition-colors shrink-0">
                                  {renderCategoryIcon(cat.icon, 'w-5 h-5 text-indigo-600 group-hover:text-indigo-700')}
                                </div>
                                {uploadedFiles.length > 0 ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                                    <Check className="w-3 h-3" /> {uploadedFiles.length} fichier{uploadedFiles.length > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full uppercase">
                                    En attente
                                  </span>
                                )}
                              </div>

                              <h3 className="font-display font-bold text-sm text-slate-900 mt-4">{cat.label}</h3>
                              <p className="text-xs text-slate-500 mt-1 leading-normal">{cat.description}</p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 shrink-0">
                              <input
                                type="file"
                                accept=".pdf,image/png,image/jpeg,image/jpg"
                                className="hidden"
                                ref={(el) => { fileInputRefs.current[cat.code] = el; }}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleSafeFileUpload(e.target.files[0], cat.code);
                                  }
                                }}
                              />

                              {uploadedFiles.length > 0 ? (
                                <div className="space-y-3">
                                  {/* List of files in this category */}
                                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                    {uploadedFiles.map((file) => (
                                      <div key={file.id} className="flex items-center justify-between gap-2 text-xs bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-100 transition-colors">
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-slate-900 truncate text-xs" title={file.originalName}>
                                            {file.originalName}
                                          </p>
                                          <p className="text-[10px] text-slate-400 mt-0.5">
                                            {(file.size / 1024 / 1024).toFixed(2)} Mo • {new Date(file.uploadedAt).toLocaleDateString('fr-FR')}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => deleteSafeDoc(file.id, cat.label)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                          title="Supprimer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Add another file button */}
                                  <button
                                    onClick={() => fileInputRefs.current[cat.code]?.click()}
                                    disabled={uploadingCategory === cat.code}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/20 text-indigo-600 text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    {uploadingCategory === cat.code ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                                        <span>Téléversement...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3 h-3" />
                                        <span>Ajouter un autre fichier</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => fileInputRefs.current[cat.code]?.click()}
                                  disabled={uploadingCategory === cat.code}
                                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                                >
                                  {uploadingCategory === cat.code ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Téléversement...</span>
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud className="w-3.5 h-3.5" />
                                      <span>Déposer le document</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Custom uploaded documents */}
                      {safeDocs.filter(d => !STANDARD_CATEGORIES.some(cat => cat.code === d.category)).map((doc) => (
                        <div
                          key={doc.id}
                          className="group flex flex-col justify-between bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-2xl p-5 transition-all duration-300 min-h-[220px]"
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <div className="bg-amber-50 p-2.5 rounded-xl group-hover:bg-amber-100 transition-colors shrink-0">
                                <FileText className="w-5 h-5 text-amber-600 group-hover:text-amber-700" />
                              </div>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase">
                                Pièce personnalisée
                              </span>
                            </div>

                            <h3 className="font-display font-bold text-sm text-slate-900 mt-4">{doc.category}</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-normal">Document spécifique ajouté manuellement au coffre-fort.</p>
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-100 shrink-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate" title={doc.originalName}>{doc.originalName}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {(doc.size / 1024 / 1024).toFixed(2)} Mo • {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}
                                </p>
                              </div>
                              <button
                                onClick={() => deleteSafeDoc(doc.id, doc.category)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Quick Add Custom Document Card */}
                      <button
                        type="button"
                        onClick={() => setShowCustomDocModal(true)}
                        className="group flex flex-col items-center justify-center bg-slate-50/50 hover:bg-indigo-50/20 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 transition-all duration-300 min-h-[220px] cursor-pointer text-center"
                      >
                        <div className="bg-indigo-50 p-3.5 rounded-2xl group-hover:bg-indigo-100 transition-colors">
                          <Plus className="w-6 h-6 text-indigo-600 group-hover:scale-110 transition-transform" />
                        </div>
                        <h3 className="font-display font-bold text-sm text-slate-900 mt-4">Document personnalisé</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-normal">Uploadez une pièce spécifique demandée dans une offre avec un nom personnalisé.</p>
                      </button>
                    </div>
                  )}
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-2xs text-center max-w-xl mx-auto space-y-5">
                    <div className="mx-auto w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Lock className="w-6 h-6 animate-pulse" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-slate-900">Coffre-fort verrouillé</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      L'accès au coffre-fort et le téléversement de documents de candidature sont strictement réservés aux utilisateurs inscrits. Rejoignez Candia gratuitement pour stocker, classer et organiser vos documents administratifs de manière hautement sécurisée.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer"
                    >
                      S'inscrire gratuitement <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. ANALYSER UN APPEL TAB */}
            {activeTab === 'new-application' && (
              <motion.div
                key="new-app-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
                  <div className="text-center max-w-xl mx-auto space-y-2">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider">
                      Moteur d'extraction Intelligent
                    </span>
                    <h2 className="font-display font-bold text-2xl text-slate-900">Analyser un Appel à Candidature / Recrutement</h2>
                    <p className="text-sm text-slate-500">
                      Déposez les directives de soumission (PDF de l'appel, Word ou simple texte d'annonce). Notre IA détectera sémantiquement l'ordre de présentation obligatoire.
                    </p>
                  </div>

                  <form onSubmit={handleOfferAnalysis} className="mt-8 space-y-6">
                    {/* Offer File Input Drag/Drop */}
                    <div
                      onDragOver={handleDragOver}
                      onDragEnter={() => setDragOfferActive(true)}
                      onDragLeave={() => setDragOfferActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOfferActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          setOfferFile(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${dragOfferActive ? 'border-indigo-500 bg-indigo-50/30' : offerFile ? 'border-emerald-500 bg-emerald-50/5' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/30'}`}
                    >
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/jpg"
                        className="hidden"
                        ref={offerFileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setOfferFile(e.target.files[0]);
                          }
                        }}
                      />

                      <div className="flex flex-col items-center justify-center">
                        <div className={`p-4 rounded-full mb-4 ${offerFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {offerFile ? <FileCheck className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
                        </div>

                        {offerFile ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-950 text-sm">{offerFile.name}</p>
                            <p className="text-xs text-slate-500">{(offerFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                            <button
                              type="button"
                              onClick={() => setOfferFile(null)}
                              className="mt-2 text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                            >
                              Changer de fichier
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">Faites glisser votre document ici</p>
                            <p className="text-xs text-slate-500 mt-1">ou cliquez pour parcourir votre ordinateur</p>
                            <button
                              type="button"
                              onClick={() => offerFileInputRef.current?.click()}
                              className="mt-4 py-2 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer shadow-xs"
                            >
                              Sélectionner le fichier d'appel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Alternative : Coller le texte brut de l'appel
                      </label>
                      <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        rows={6}
                        placeholder="Copiez-collez l'intégralité de l'avis de recrutement ou du cahier des charges ici..."
                        className="w-full rounded-2xl border border-slate-200 p-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={analyzingOffer || (!offerFile && !rawText.trim())}
                      className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2.5 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 cursor-pointer text-base"
                    >
                      {analyzingOffer ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>L'IA analyse le dossier et structure l'ordonnancement...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>Lancer l'Analyse d'Appel IA</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* 3. ORDONNER & SIGNER (GENERATOR) TAB */}
            {activeTab === 'generator' && currentOffer && (
              <motion.div
                key="generator-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Left Column: Cover Page & Autosing settings */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Meta details */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase">
                      Directives sémantiques identifiées
                    </span>
                    <h3 className="font-display font-bold text-lg text-slate-900 mt-2.5">{currentOffer.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">Organisme : <strong>{currentOffer.organizer}</strong></p>
                    <p className="text-xs text-rose-600 font-semibold mt-1">Date Limite : {currentOffer.deadline}</p>
                  </div>

                  {/* Single Unit Payment Option (If Free plan has used 3/3 dossiers) */}
                  {(user?.plan === 'free' || !user?.plan) && (user?.monthlyDossiersCreated || 0) >= 3 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 space-y-4 shadow-2xs">
                      <div className="flex gap-2 text-amber-900">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-sm block">Limite mensuelle gratuite atteinte</span>
                          <p className="text-xs text-amber-700 mt-0.5 leading-normal">
                            Vous avez déjà généré {user?.monthlyDossiersCreated} dossiers ce mois-ci. Choisissez entre l'activation du Plan PRO illimité ou l'achat à l'unité de ce dossier unique.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-amber-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useUnitBilling}
                            onChange={(e) => setUseUnitBilling(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 accent-indigo-600 rounded mt-0.5 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 block">Paiement à l'unité (2 000 FCFA)</span>
                            <span className="text-slate-500 block mt-0.5">Régler uniquement pour générer ce dossier, sans engagement.</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Cover Page Options */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="font-display font-bold text-slate-900 text-sm">Générer une Page de Garde</h4>
                      <input
                        type="checkbox"
                        checked={coverPageEnabled}
                        onChange={(e) => setCoverPageEnabled(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 accent-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    {coverPageEnabled && (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Nom complet sur le dossier</label>
                          <input
                            type="text"
                            value={candidateName}
                            onChange={(e) => setCandidateName(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Adresse de contact</label>
                          <input
                            type="email"
                            value={candidateEmail}
                            onChange={(e) => setCandidateEmail(e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Note introductive au jury</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Ex: Je présente ma candidature respectueuse au poste..."
                            className="w-full text-xs rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-500 placeholder:text-slate-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600">Thème graphique de la page de garde</label>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {[
                              { id: 'classic', label: 'Bleu Classique', desc: 'Professionnel & Sobre' },
                              { id: 'modern', label: 'Moderne Ardoise', desc: 'Épuré & Minimaliste' },
                              { id: 'editorial', label: 'Académique Vert', desc: 'Littéraire & Élégant' },
                              { id: 'creative', label: 'Technique Violet', desc: 'Moderne & Monospace' },
                            ].map((themeOpt) => (
                              <button
                                key={themeOpt.id}
                                type="button"
                                onClick={() => setCoverPageTheme(themeOpt.id)}
                                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                                  coverPageTheme === themeOpt.id
                                    ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                              >
                                <span className={`text-[10px] font-bold ${coverPageTheme === themeOpt.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                                  {themeOpt.label}
                                </span>
                                <span className="text-[8px] text-slate-400 font-medium leading-none mt-0.5">
                                  {themeOpt.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Automatic Signature configuration */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <h4 className="font-display font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-indigo-600" />
                        Signature Automatique IA
                      </h4>
                      <input
                        type="checkbox"
                        checked={signatureEnabled}
                        onChange={(e) => setSignatureEnabled(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 accent-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    {signatureEnabled ? (
                      !safeDocs.some(d => d.category === 'SIGNATURE') ? (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-2">
                          <p className="text-[11px] text-rose-700 leading-normal">
                            Aucune signature manuscrite enregistrée dans votre coffre-fort. Uploadez une image (PNG/JPG) pour signer vos lettres automatiquement.
                          </p>
                          <button
                            onClick={() => setActiveTab('safe')}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                          >
                            Uploader ma signature
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-2">
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase block text-center">
                            Signature configurée dans le coffre-fort
                          </span>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-600">Page cible pour la signature</label>
                              <select
                                value={signatureCoords.pageIndex}
                                onChange={(e) => setSignatureCoords({ ...signatureCoords, pageIndex: parseInt(e.target.value) })}
                                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-500"
                              >
                                <option value="0">Dernière page du PDF final (Recommandé)</option>
                                <option value="1">Page 1 du dossier</option>
                                <option value="2">Page 2 du dossier</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-600">Position prédéfinie</label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {['bottom-left', 'bottom-center', 'bottom-right'].map(preset => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => applySignaturePreset(preset)}
                                    className={`text-[10px] font-bold py-1.5 px-2 rounded-lg border cursor-pointer transition-all ${signatureCoords.preset === preset ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                  >
                                    {preset === 'bottom-left' ? 'Bas Gauche' : preset === 'bottom-center' ? 'Bas Milieu' : 'Bas Droite'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Coordinate manual adjustment */}
                            <div className="space-y-1.5 pt-1.5">
                              <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                                <span>Ajustement X ({signatureCoords.x} pt)</span>
                              </div>
                              <input
                                type="range"
                                min="20"
                                max="500"
                                value={signatureCoords.x}
                                onChange={(e) => setSignatureCoords({ ...signatureCoords, x: parseInt(e.target.value), preset: '' })}
                                className="w-full accent-indigo-600"
                              />

                              <div className="flex justify-between text-[10px] text-slate-500 font-bold pt-1">
                                <span>Ajustement Y ({signatureCoords.y} pt)</span>
                              </div>
                              <input
                                type="range"
                                min="20"
                                max="700"
                                value={signatureCoords.y}
                                onChange={(e) => setSignatureCoords({ ...signatureCoords, y: parseInt(e.target.value), preset: '' })}
                                className="w-full accent-indigo-600"
                              />
                            </div>
                          </div>

                          {/* Live Interactive Mockup Signature positioning Preview */}
                          <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-center space-y-1.5 relative overflow-hidden">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Prévisualisation visuelle</span>
                            <div className="w-full h-36 bg-white border border-slate-200 shadow-sm mx-auto relative rounded-lg" style={{ maxWidth: '100px' }}>
                              <div className="absolute top-1 border-b border-slate-100 w-full text-[6px] text-slate-300 text-center uppercase tracking-widest font-bold leading-none py-1">motivation</div>
                              <div className="absolute w-2/3 h-1 bg-slate-100 left-3 top-7"></div>
                              <div className="absolute w-1/2 h-1 bg-slate-100 left-3 top-10"></div>
                              <div className="absolute w-3/4 h-1 bg-slate-100 left-3 top-13"></div>
                              
                              {/* Representative signature box */}
                              <div
                                className="absolute bg-indigo-500/10 border-2 border-indigo-500/30 rounded flex items-center justify-center text-[5px] text-indigo-600 font-bold leading-none p-0.5"
                                style={{
                                  left: `${Math.max(5, Math.min(65, (signatureCoords.x / 500) * 100))}%`,
                                  bottom: `${Math.max(5, Math.min(80, (signatureCoords.y / 700) * 100))}%`,
                                  width: '30px',
                                  height: '15px'
                                }}
                              >
                                Signé
                              </div>
                            </div>
                            <span className="text-[9px] text-slate-400 leading-tight block">Faites glisser les curseurs pour ajuster visuellement.</span>
                          </div>

                          {/* Legal Disclaimer Box */}
                          <div className="p-3 bg-indigo-950/95 border border-indigo-900 rounded-xl text-[10px] text-indigo-200 leading-normal">
                            <span className="font-bold text-white block mb-0.5 flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-amber-500" />
                              Valeur Juridique
                            </span>
                            Cette signature numérisée constitue un commencement de preuve par écrit. Bien qu'elle soit universellement admise pour les dossiers administratifs d'appels à candidatures en Afrique, elle ne remplace pas une signature électronique cryptographique qualifiée RGS/eIDAS.
                          </div>
                        </div>
                      )
                    ) : (
                      <p className="text-xs text-slate-400">Signature automatique désactivée pour ce dossier.</p>
                    )}
                  </div>

                  {/* AI Cover Letter Generator Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                      <h4 className="font-display font-bold text-slate-900 text-sm">Lettre de Motivation IA</h4>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Proposez une lettre de motivation sur-mesure rédigée par l'IA en analysant l'appel d'offre et vos pièces jointes (ex: votre CV).
                    </p>

                    <div className="space-y-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Document de référence (CV)</label>
                        <select
                          value={selectedCvForLetter}
                          onChange={(e) => setSelectedCvForLetter(e.target.value)}
                          className="w-full text-xs rounded-xl border border-slate-200 p-2.5 outline-none focus:border-indigo-500"
                        >
                          <option value="">-- Sans document (Générique) --</option>
                          {safeDocs.filter(d => d.category === 'CV').map(cv => (
                            <option key={cv.id} value={cv.id}>
                              {cv.originalName}
                            </option>
                          ))}
                        </select>
                        {safeDocs.filter(d => d.category === 'CV').length === 0 && (
                          <span className="text-[10px] text-amber-600 font-semibold block mt-1">
                            Aucun CV détecté dans le coffre-fort. La lettre sera générique.
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateCoverLetter}
                        disabled={isGeneratingLetter}
                        className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-100"
                      >
                        {isGeneratingLetter ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Génération en cours...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Rédiger ma lettre avec l'IA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Generate Button Wrapper */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
                    <p className="text-xs text-slate-500 text-center leading-normal">
                      Vérifiez que toutes les pièces obligatoires sont assignées à gauche avant de finaliser.
                    </p>
                    <button
                      onClick={handleGenerateDossier}
                      disabled={generatingDossier || mappings.filter(m => m.documentId).length === 0}
                      className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 cursor-pointer text-sm"
                    >
                      {generatingDossier ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Fusion & signature en cours...</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4" />
                          <span>Fusionner & Générer mon Dossier PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Column: Piece Match list */}
                <div className="lg:col-span-2 space-y-6">
                  {generationSuccess && (
                    <div className="bg-emerald-50 border-2 border-emerald-500/20 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                      <div className="flex gap-3 items-start text-emerald-900">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-base block">Dossier de soumission PDF disponible !</span>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Les pièces jointes ont été classées, ordonnées, et dotées d'un sommaire dynamique de garde.
                          </p>
                          <p className="text-[10px] text-emerald-600 mt-1">
                            Taille finale : <strong>{(generationSuccess.size / 1024 / 1024).toFixed(2)} Mo</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDownloadClick(e, generationSuccess.id, generationSuccess.title)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl text-sm transition-all shadow-md shadow-emerald-100 cursor-pointer w-full sm:w-auto justify-center shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger le dossier PDF
                      </button>
                    </div>
                  )}

                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-6">
                    <div>
                      <h3 className="font-display font-bold text-lg text-slate-900">Correspondance des documents requis</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Associez chaque pièce exigée par l'appel à un document de votre coffre-fort. L'IA a pré-sélectionné les meilleures correspondances sémantiques.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {mappings.map((mapItem, idx) => {
                        // All documents matching the category or the piece name
                        const eligibleFiles = safeDocs.filter(d => d.category === mapItem.category || d.category === mapItem.pieceName);
                        const otherFiles = safeDocs.filter(d => d.category !== mapItem.category && d.category !== mapItem.pieceName);

                        return (
                          <div key={mapItem.pieceId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/40">
                            <div className="space-y-1 max-w-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                  #{mapItem.ordre}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${mapItem.obligatoire ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-500'}`}>
                                  {mapItem.obligatoire ? 'Obligatoire' : 'Facultatif'}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-900 text-xs sm:text-sm">{mapItem.pieceName}</h5>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sémantique : {getCategoryLabel(mapItem.category)}</p>
                            </div>

                            {/* Dropdown document mapper */}
                            <div className="w-full sm:w-64 shrink-0">
                              <select
                                value={mapItem.documentId || ''}
                                onChange={(e) => {
                                  const val = e.target.value || null;
                                  setMappings(mappings.map(m => m.pieceId === mapItem.pieceId ? { ...m, documentId: val } : m));
                                }}
                                className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 shadow-3xs"
                              >
                                <option value="">-- Sélectionner un fichier --</option>
                                {eligibleFiles.length > 0 && (
                                  <optgroup label="Recommandés pour cette pièce">
                                    {eligibleFiles.map((file) => (
                                      <option key={file.id} value={file.id}>
                                        {file.originalName} ({(file.size / 1024 / 1024).toFixed(2)} Mo)
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {otherFiles.length > 0 && (
                                  <optgroup label="Autres documents du coffre-fort">
                                    {otherFiles.map((file) => (
                                      <option key={file.id} value={file.id}>
                                        {file.originalName} ({(file.size / 1024 / 1024).toFixed(2)} Mo - {file.category})
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {safeDocs.length === 0 && (
                                  <option disabled>Votre coffre-fort est vide</option>
                                )}
                              </select>

                              {/* Direct dynamic upload inside mapping list */}
                              <div className="mt-2.5 flex flex-col gap-1.5">
                                <input
                                  type="file"
                                  id={`mapping-upload-${mapItem.pieceId}`}
                                  accept=".pdf,image/png,image/jpeg,image/jpg"
                                  className="hidden"
                                  onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      const file = e.target.files[0];
                                      const categoryToUse = mapItem.pieceName || mapItem.category;
                                      const doc = await handleSafeFileUpload(file, categoryToUse);
                                      if (doc) {
                                        // Auto select this document for the mapping!
                                        setMappings(prev => prev.map(m => m.pieceId === mapItem.pieceId ? { ...m, documentId: doc.id } : m));
                                      }
                                    }
                                  }}
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const el = document.getElementById(`mapping-upload-${mapItem.pieceId}`);
                                      if (el) (el as HTMLInputElement).click();
                                    }}
                                    disabled={uploadingCategory === (mapItem.pieceName || mapItem.category)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100/30 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    {uploadingCategory === (mapItem.pieceName || mapItem.category) ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                                        Téléversement...
                                      </>
                                    ) : (
                                      <>
                                        <UploadCloud className="w-3 h-3 text-indigo-500" />
                                        {eligibleFiles.length === 0 ? 'Déposer directement cette pièce' : 'Déposer une nouvelle version'}
                                      </>
                                    )}
                                  </button>
                                  {eligibleFiles.length === 0 && (
                                    <button
                                      onClick={() => setActiveTab('safe')}
                                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100/80 hover:bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200/50 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      Aller au coffre-fort
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. HISTORIQUE TAB */}
            {activeTab === 'history' && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
                  <div>
                    <h2 className="font-display font-bold text-xl text-slate-900">Vos Dossiers de Soumission Générés</h2>
                    <p className="text-xs text-slate-500 mt-1">Historique complet de vos compilations. Les dossiers sont conservés 30 jours (ou à vie sur l'offre Pro).</p>
                  </div>

                  {loadingHistory ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                      <p className="text-xs text-slate-500">Chargement de votre historique...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100 mt-6 space-y-3">
                      <History className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-sm font-semibold text-slate-700">Aucun dossier généré pour le moment</p>
                      <button
                        onClick={() => setActiveTab('new-application')}
                        className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl cursor-pointer"
                      >
                        Créer ma première soumission
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 mt-6">
                      {history.map((item) => (
                        <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-100 hover:border-indigo-500/20 bg-slate-50/20 transition-all">
                          <div className="space-y-1.5 min-w-0">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase">
                              Génération confirmée
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm truncate">{item.title}</h4>
                            <p className="text-xs text-slate-500">
                              Organisateur : <strong>{item.organizer}</strong> • Créé le {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Sommaire : {item.piecesIncluded.length} pièces jointes • {(item.size / 1024 / 1024).toFixed(2)} Mo
                            </p>
                          </div>

                          <div className="flex gap-2 w-full md:w-auto shrink-0">
                            <button
                              onClick={(e) => handleDownloadClick(e, item.id, item.title)}
                              className="flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 py-2.5 px-4 rounded-xl border border-slate-200 cursor-pointer shadow-3xs text-center justify-center w-full md:w-auto"
                            >
                              <Download className="w-4 h-4 text-slate-500" />
                              Télécharger
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 5. TABLEAU DE BORD ADMINISTRATEUR TAB */}
            {activeTab === 'admin' && user?.role === 'admin' && (
              <motion.div
                key="admin-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* System & FedaPay Gateway Status Banner */}
                {fedaPayStatus && (
                  <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    fedaPayStatus.mode === 'live'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : fedaPayStatus.mode === 'sandbox_real'
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-display font-extrabold text-sm">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          fedaPayStatus.mode === 'live' ? 'bg-emerald-500' : fedaPayStatus.mode === 'sandbox_real' ? 'bg-blue-500' : 'bg-amber-500 animate-pulse'
                        }`} />
                        {fedaPayStatus.mode === 'live' && <span>Passerelle de Paiement FedaPay : MODE RÉEL ACTIF (Production)</span>}
                        {fedaPayStatus.mode === 'sandbox_real' && <span>Passerelle de Paiement FedaPay : MODE SANDBOX RÉEL (Test)</span>}
                        {fedaPayStatus.mode === 'simulation_local' && <span>Passerelle de Paiement FedaPay : MODE SIMULATION LOCALE</span>}
                      </div>
                      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                        {fedaPayStatus.mode === 'simulation_local' 
                          ? "L'application fonctionne actuellement en mode simulation locale Candia car aucune clé secrète FedaPay n'est configurée dans vos variables d'environnement. Configurez FEDAPAY_SECRET_KEY et VITE_FEDAPAY_PUBLIC_KEY dans les réglages du projet pour basculer en mode réel."
                          : `La passerelle de paiement FedaPay est configurée avec succès ! Les transactions de Mobile Money et Cartes Bancaires transitent directement par vos clés API FedaPay (${fedaPayStatus.mode === 'live' ? 'Production' : 'Sandbox'}). Préfixe de la clé : ${fedaPayStatus.secretKeyPrefix}.`
                        }
                      </p>
                    </div>
                    {fedaPayStatus.mode === 'simulation_local' && (
                      <div className="bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl shrink-0 self-start md:self-center">
                        ⚠️ Configuration Requise
                      </div>
                    )}
                  </div>
                )}



                {/* Executive overview row of KPI cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* Total Users */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inscriptions totales</span>
                    <h3 className="font-mono text-3xl font-extrabold text-slate-950 mt-1.5">
                      {loadingAdmin ? '...' : adminStats?.totalUsers || 0}
                    </h3>
                    <p className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +14.5% croissance ce mois
                    </p>
                  </div>

                  {/* Active Users */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Utilisateurs Actifs</span>
                    <h3 className="font-mono text-3xl font-extrabold text-slate-950 mt-1.5">
                      {loadingAdmin ? '...' : adminStats?.activeUsers || 0}
                    </h3>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      Activités constatées (≤ 30 j)
                    </p>
                  </div>

                  {/* MRR (FCFA) */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-amber-50 p-2.5 rounded-xl text-amber-600">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Revenu Mensuel Récurrent</span>
                    <h3 className="font-mono text-xl sm:text-2xl font-extrabold text-slate-950 mt-2">
                      {loadingAdmin ? '...' : `${(adminStats?.mrr || 0).toLocaleString()} FCFA`}
                    </h3>
                    <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
                      Taux de conversion : <strong>{adminStats?.conversionRate}%</strong>
                    </p>
                  </div>

                  {/* Total PDF Dossiers generated */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-slate-100 p-2.5 rounded-xl text-slate-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dossiers PDF Générés</span>
                    <h3 className="font-mono text-3xl font-extrabold text-slate-950 mt-1.5">
                      {loadingAdmin ? '...' : adminStats?.totalDossiers || 0}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Fusions physiques de PDF lib
                    </p>
                  </div>
                </div>

                {/* Subsections: Geographical, Subscription tiers & AI stats charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Region Table */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs lg:col-span-1">
                    <h4 className="font-display font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      Répartition Afrique de l'Ouest / Centrale
                    </h4>
                    
                    <div className="mt-4 space-y-3">
                      {loadingAdmin ? (
                        <p className="text-xs text-slate-400 text-center py-6">Calcul en cours...</p>
                      ) : adminStats?.regionalDistribution.map((item) => (
                        <div key={item.country} className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">{item.country}</span>
                          <div className="flex gap-2 font-mono">
                            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-extrabold">{item.users} candidats</span>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.dossiers} dossiers</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subscription breakdown stats */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs lg:col-span-1">
                    <h4 className="font-display font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      Abonnements par Formule
                    </h4>

                    <div className="mt-4 space-y-3">
                      {loadingAdmin ? (
                        <p className="text-xs text-slate-400 text-center py-6">Calcul en cours...</p>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Essentiel (3 000 FCFA)</span>
                              <span className="font-mono font-bold">{adminStats?.subscribersByPlan.essentiel} utilisateurs</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-indigo-500 h-full" style={{ width: `${(adminStats?.subscribersByPlan.essentiel || 0) / (adminStats?.totalUsers || 1) * 100}%` }}></div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Pro (7 500 FCFA)</span>
                              <span className="font-mono font-bold">{adminStats?.subscribersByPlan.pro} utilisateurs</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full" style={{ width: `${(adminStats?.subscribersByPlan.pro || 0) / (adminStats?.totalUsers || 1) * 100}%` }}></div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Business (15 000 FCFA)</span>
                              <span className="font-mono font-bold">{adminStats?.subscribersByPlan.business} agences</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${(adminStats?.subscribersByPlan.business || 0) / (adminStats?.totalUsers || 1) * 100}%` }}></div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>Gratuit</span>
                              <span className="font-mono">{adminStats?.subscribersByPlan.free} inscrits</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-slate-300 h-full" style={{ width: `${(adminStats?.subscribersByPlan.free || 0) / (adminStats?.totalUsers || 1) * 100}%` }}></div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* AI Costs Tracker */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs lg:col-span-1">
                    <h4 className="font-display font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-indigo-500" />
                      Usage & Performances de l'IA (Gemini)
                    </h4>

                    <div className="mt-4 space-y-3.5 text-xs text-slate-700">
                      <div className="flex justify-between items-center">
                        <span>Extractions d'avis réussies :</span>
                        <strong className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-extrabold">{adminStats?.aiStats.totalAnalyses} analyses</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Lettres IA rédigées :</span>
                        <strong className="font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded">{adminStats?.aiStats.totalLetters} lettres</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Taux d'erreur LLM :</span>
                        <strong className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{adminStats?.aiStats.errorRate}</strong>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span>Facturation estimée API :</span>
                        <strong className="font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-extrabold">{adminStats?.aiStats.estimatedCostEuro} EUR</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Users list database, search, filters & action controls */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
                    <div>
                      <h4 className="font-display font-bold text-slate-900 text-base">Base de Données des Utilisateurs</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Recherchez des candidats, suspendez des comptes frauduleux, ou modifiez leur abonnement manuellement.</p>
                    </div>

                    <a
                      href="/api/admin/export-csv"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      Exporter CSV de la base
                    </a>
                  </div>

                  {/* Filtering elements */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mt-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recherche nominale / email</label>
                      <input
                        type="text"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        placeholder="Rechercher Amadou, Diallo..."
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtrer par formule</label>
                      <select
                        value={adminFilterPlan}
                        onChange={(e) => setAdminFilterPlan(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500"
                      >
                        <option value="all">Toutes les formules</option>
                        <option value="free">Gratuit</option>
                        <option value="essentiel">Essentiel (3k/m)</option>
                        <option value="pro">Pro (7.5k/m)</option>
                        <option value="business">Business (15k/m)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtrer par pays</label>
                      <select
                        value={adminFilterCountry}
                        onChange={(e) => setAdminFilterCountry(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500"
                      >
                        <option value="all">Tous les pays</option>
                        <option value="Sénégal">Sénégal</option>
                        <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                        <option value="Cameroun">Cameroun</option>
                        <option value="Gabon">Gabon</option>
                        <option value="Mali">Mali</option>
                        <option value="Togo">Togo</option>
                      </select>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto mt-6">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50 border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-4">Candidat</th>
                          <th className="py-3 px-4">Pays</th>
                          <th className="py-3 px-4">Abonnement</th>
                          <th className="py-3 px-4 text-center">Dossiers générés</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions administratives</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminUsers.map((u, index) => (
                          <tr key={`${u.id || 'u'}-${index}`} className="hover:bg-slate-50/40">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 block">{u.name}</span>
                              <span className="text-[10px] text-slate-400 block">{u.email}</span>
                              {u.createdAt && (
                                <span className="text-[9px] text-indigo-600 font-semibold block mt-0.5">
                                  Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">{u.country || 'Sénégal'}</td>
                            <td className="py-3.5 px-4 font-mono">
                              <select
                                value={u.plan}
                                onChange={(e) => adminChangeUserPlan(u.id, e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-bold text-indigo-600 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="free">free (Gratuit)</option>
                                <option value="essentiel">essentiel (3k/m)</option>
                                <option value="pro">pro (7.5k/m)</option>
                                <option value="business">business (15k/m)</option>
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">{u.monthlyDossiersCreated || 0}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${u.isSuspended ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {u.isSuspended ? 'Suspendu' : 'Actif'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right shrink-0">
                              <button
                                onClick={() => toggleUserSuspension(u.id)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${u.isSuspended ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'}`}
                              >
                                {u.isSuspended ? 'Activer' : 'Suspendre'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {adminUsers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-slate-400">Aucun utilisateur trouvé.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit trail activity log of server */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6">
                  <h4 className="font-display font-bold text-slate-900 text-base pb-3 border-b border-slate-100">Journal d'Audit d'Activité (SaaS)</h4>
                  
                  <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
                    {adminLogs.map((log, index) => (
                      <div key={`${log.id || 'log'}-${index}`} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5">
                        <div className="space-y-0.5">
                          <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded mr-2 uppercase ${log.action === 'GENERATE' ? 'bg-emerald-100 text-emerald-800' : log.action === 'ANALYZE' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>
                            {log.action}
                          </span>
                          <span className="text-slate-800 font-medium">{log.details}</span>
                        </div>
                        <div className="text-right shrink-0 font-mono text-[10px] text-slate-400">
                          <span>{log.country}</span>
                          <span className="block">{new Date(log.timestamp).toLocaleTimeString('fr-FR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Custom Document Modal */}
      {showCustomDocModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-md w-full border border-slate-200 overflow-hidden shadow-2xl p-6 sm:p-8"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Ajouter un document personnalisé
              </h3>
              <button
                onClick={() => {
                  setShowCustomDocModal(false);
                  setCustomDocName('');
                  setCustomDocFile(null);
                }}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomDocSubmit} className="space-y-5 mt-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nom de la pièce (ex: Justificatif de domicile...)</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Justificatif de Domicile, Lettre de Recommandation..."
                  value={customDocName}
                  onChange={(e) => setCustomDocName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-3xs"
                />
                <p className="text-[10px] text-slate-400">Ce nom sera utilisé pour associer la pièce aux exigences des offres.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Sélectionner le fichier</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    customDocFile 
                      ? 'border-emerald-500 bg-emerald-50/10' 
                      : 'border-slate-200 hover:border-indigo-500 bg-slate-50/50'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setCustomDocFile(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <input
                    type="file"
                    id="custom-file-input"
                    required
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCustomDocFile(e.target.files[0]);
                      }
                    }}
                  />
                  
                  {customDocFile ? (
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="w-8 h-8 text-emerald-500" />
                      <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{customDocFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(customDocFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                      <button
                        type="button"
                        onClick={() => setCustomDocFile(null)}
                        className="text-[10px] text-rose-600 hover:underline font-bold mt-1.5"
                      >
                        Changer de fichier
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => document.getElementById('custom-file-input')?.click()}
                      className="flex flex-col items-center justify-center gap-2 cursor-pointer w-full"
                    >
                      <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
                      <div className="text-xs text-slate-600">
                        <span className="font-bold text-indigo-600 hover:underline">Cliquez pour téléverser</span> ou glissez-déposez
                      </div>
                      <p className="text-[10px] text-slate-400">Format PDF, PNG, JPG jusqu'à 10 Mo</p>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomDocModal(false);
                    setCustomDocName('');
                    setCustomDocFile(null);
                  }}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={customUploading}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {customUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Ajouter au coffre-fort
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Pricing / Formules Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 overflow-hidden shadow-2xl p-5 sm:p-8 max-h-[calc(100vh-2rem)] flex flex-col"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
              <h3 className="font-display font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 fill-amber-100" />
                Formules & Tarification Candia
              </h3>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 mt-4 sm:mt-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                
                {/* Formule Gratuite (Essai) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between transition-all">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Mode Essai
                    </span>
                    <div className="mt-3">
                      <span className="font-display font-extrabold text-2xl text-slate-900">Gratuit</span>
                      <span className="text-slate-500 text-xs"> (Premier essai)</span>
                    </div>
                    <ul className="mt-4 space-y-2 text-xs text-slate-600">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <strong>1er téléchargement PDF 100% offert</strong>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        Création libre de dossiers de soumission
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        Coffre-fort complet sécurisé
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        Assistance IA et lettre de motivation
                      </li>
                    </ul>
                  </div>
                  <div className="mt-6 text-center text-xs font-bold text-slate-600 bg-slate-100 py-2.5 rounded-xl border border-slate-200">
                    Plan Actif par Défaut 🟢
                  </div>
                </div>

                {/* Mode Principal : Achat à l'acte */}
                <div className="rounded-2xl border-2 border-indigo-600 bg-indigo-50/10 p-5 flex flex-col justify-between transition-all relative">
                  <div className="absolute top-4 right-4 bg-indigo-600 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-500">
                    Mode Principal 🚀
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Paiement à l'acte
                    </span>
                    <div className="mt-3">
                      <span className="font-display font-extrabold text-xl text-slate-900">Pas d'abonnement</span>
                      <span className="text-slate-500 text-xs block mt-0.5">Payez uniquement au téléchargement</span>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="text-slate-600">Moins de 15 pages</span>
                        <span className="font-bold text-slate-900">1 500 F CFA <span className="text-[10px] text-slate-400 font-normal">(~2.50$)</span></span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="text-slate-600">De 15 à 50 pages</span>
                        <span className="font-bold text-slate-900">5 000 F CFA <span className="text-[10px] text-slate-400 font-normal">(~8.33$)</span></span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-0.5">
                        <span className="text-slate-600">50 pages et plus</span>
                        <span className="font-bold text-slate-900">10 000 F CFA <span className="text-[10px] text-slate-400 font-normal">(~16.67$)</span></span>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-500 mt-4 leading-normal">
                      FedaPay prend en charge <strong>Orange Money, MTN Mobile Money, Wave, Moov</strong> et les cartes bancaires en toute sécurité.
                    </p>
                  </div>
                  <div className="mt-6 text-center text-xs font-semibold text-indigo-700 bg-indigo-50 py-2.5 rounded-xl border border-indigo-100">
                    Paiement unitaire par dossier
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* FedaPay Checkout Choice Modal */}
      {showFedaPayModal && dossierToDownload && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 overflow-hidden shadow-2xl p-5 sm:p-8 max-h-[calc(100vh-2rem)] flex flex-col"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                Déverrouiller le téléchargement 🔓
              </h3>
              <button
                onClick={() => setShowFedaPayModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 mt-4 flex-1 space-y-5">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Dossier sélectionné</span>
                <h4 className="font-bold text-slate-800 text-sm mt-1">{dossierToDownload.title}</h4>
                <p className="text-xs text-slate-500 mt-2">
                  Le dossier PDF a été entièrement compilé et ordonné de façon certifiée. Pour le télécharger sur votre appareil, veuillez choisir l'un des modes de règlement ci-dessous :
                </p>
              </div>

              {fedaPayStatus && (
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                  fedaPayStatus.mode === 'live'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : fedaPayStatus.mode === 'sandbox_real'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <div className={`w-2 h-2 rounded-full ${
                      fedaPayStatus.mode === 'live' ? 'bg-emerald-500' : fedaPayStatus.mode === 'sandbox_real' ? 'bg-blue-500' : 'bg-amber-500 animate-pulse'
                    }`} />
                    {fedaPayStatus.mode === 'live' && <span>🟢 Mode Réel FedaPay Actif (Production)</span>}
                    {fedaPayStatus.mode === 'sandbox_real' && <span>🔵 Mode Sandbox FedaPay Actif (Test)</span>}
                    {fedaPayStatus.mode === 'simulation_local' && <span>⚠️ Mode Simulation (Pas de clé FedaPay)</span>}
                  </div>
                  {fedaPayStatus.mode === 'simulation_local' ? (
                    <p className="text-[10px] text-amber-700 leading-normal">
                      L'application est en mode simulation locale car aucune clé API FedaPay n'est définie. Pour encaisser de <strong>vrais paiements Mobile Money / Carte</strong>, ajoutez vos variables d'environnement <code className="bg-amber-100 px-1 rounded">FEDAPAY_SECRET_KEY</code> et <code className="bg-amber-100 px-1 rounded">VITE_FEDAPAY_PUBLIC_KEY</code>.
                    </p>
                  ) : (
                    <p className="text-[10px] leading-normal opacity-90">
                      Connexion sécurisée établie avec FedaPay ({fedaPayStatus.mode === 'live' ? 'Production' : 'Sandbox'}). Clé : <code className="bg-black/5 px-1 rounded">{fedaPayStatus.secretKeyPrefix}</code>. Vous allez être redirigé vers l'interface de paiement officielle.
                    </p>
                  )}
                </div>
              )}

              <div>
                
                {/* Option unique: Acte */}
                {(() => {
                  const dp = getDossierPrice(dossierToDownload);
                  return (
                    <button
                      onClick={() => payWithFedaPay(dp.usd, `Achat Unitaire Dossier: ${dossierToDownload.title}`, false, dossierToDownload.id, dp.fcfa)}
                      disabled={isPaying}
                      className="w-full rounded-2xl border-2 border-indigo-600 bg-indigo-50/10 p-5 flex flex-col justify-between text-left transition-all hover:bg-indigo-50/20 cursor-pointer disabled:opacity-50 relative"
                    >
                      <div className="absolute top-4 right-4 bg-indigo-600 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-500">
                        Mode Principal 🚀
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Achat de PDF à l'acte ({dossierToDownload.pageCount || 12} pages)
                        </span>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="font-display font-extrabold text-2xl text-slate-900">{dp.fcfa.toLocaleString()} FCFA</span>
                          <span className="text-slate-500 text-xs font-normal">~{dp.usd} USD</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed font-normal">
                          Règlement unitaire et sécurisé pour déverrouiller ce document de façon définitive et à vie dans votre espace sécurisé. Tarif progressif : <strong>{dp.label}</strong>.
                        </p>
                      </div>
                      <span className="mt-6 text-xs font-bold text-indigo-600 flex items-center gap-1.5 self-start">
                        Déverrouiller et Télécharger maintenant <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  );
                })()}

              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3 text-slate-400">
                <Shield className="w-8 h-8 text-emerald-600 shrink-0" />
                <div className="text-[10px] text-slate-500 leading-normal">
                  Passerelle de paiement sécurisée **FedaPay**. Vos fonds et vos transactions de Mobile Money (Orange, MTN, Wave, Moov, Free) et Cartes Bancaires (Visa, MasterCard) sont chiffrés et sécurisés.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* FedaPay Sandbox Simulator Modal */}
      {showFedaPaySimulator && fedaPaySimulatedData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-md w-full border border-slate-200 overflow-hidden shadow-2xl p-6"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600 font-extrabold text-[10px] tracking-wider">FedaPay</div>
                <span className="text-[10px] font-bold text-slate-400">| Sandbox Simulator</span>
              </div>
              {!isSimulatingProcess && (
                <button
                  onClick={() => {
                    setShowFedaPaySimulator(false);
                    setIsPaying(false);
                  }}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Merchant info & amount */}
            <div className="my-5 text-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Marchand</span>
              <h4 className="font-bold text-slate-800 text-xs">Candia - Concours Agricoles</h4>
              
              <div className="mt-3">
                <span className="text-xl font-extrabold text-slate-900">
                  {(fedaPaySimulatedData.amountCFA || Math.round(fedaPaySimulatedData.amountUSD * 600)).toLocaleString()} FCFA
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">({fedaPaySimulatedData.amountUSD} USD)</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 bg-white px-2 py-1 rounded-md border border-slate-100 truncate">
                {fedaPaySimulatedData.description}
              </p>
            </div>

            {isSimulatingProcess ? (
              /* Simulated payment steps */
              <div className="py-6 flex flex-col items-center justify-center text-center">
                {simulatingStep === 1 && (
                  <div className="space-y-4">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                    <h4 className="font-bold text-slate-800 text-xs">Validation des informations...</h4>
                    <p className="text-[11px] text-slate-500">Nous vérifions vos coordonnées de paiement.</p>
                  </div>
                )}
                {simulatingStep === 2 && (
                  <div className="space-y-4">
                    <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                    <h4 className="font-bold text-slate-800 text-xs">Connexion sécurisée à FedaPay...</h4>
                    <p className="text-[11px] text-slate-500">Établissement du canal sécurisé SSL.</p>
                  </div>
                )}
                {simulatingStep === 3 && (
                  <div className="space-y-4">
                    <div className="relative mx-auto w-10 h-10 flex items-center justify-center">
                      <Smartphone className="w-8 h-8 text-amber-500 animate-bounce" />
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full text-[9px] font-bold w-4 h-4 flex items-center justify-center animate-pulse">
                        {simulatingCountdown}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs">Validation USSD en cours...</h4>
                    <p className="text-[11px] text-slate-600 px-4 leading-relaxed">
                      Saisissez votre code secret sur le prompt Mobile Money de votre téléphone pour valider le débit de <strong className="text-slate-900">{Math.round(fedaPaySimulatedData.amountUSD * 600)} FCFA</strong>.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[9px] text-amber-800 max-w-xs mx-auto">
                      Simulation en cours. Ne fermez pas cette fenêtre.
                    </div>
                  </div>
                )}
                {simulatingStep === 4 && (
                  <div className="space-y-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto animate-pulse" />
                    <h4 className="font-bold text-emerald-700 text-xs">Paiement approuvé ! 🎉</h4>
                    <p className="text-[11px] text-slate-500">Votre transaction a été validée avec succès.</p>
                    <p className="text-[9px] text-slate-400">Redirection automatique dans un instant...</p>
                  </div>
                )}
              </div>
            ) : (
              /* Simulation Form */
              <form onSubmit={handleSimulatedPayment} className="space-y-4">
                {/* Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSimulatedMethod('momo')}
                    className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      simulatedMethod === 'momo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedMethod('card')}
                    className={`py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      simulatedMethod === 'card' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Carte Bancaire
                  </button>
                </div>

                {simulatedMethod === 'momo' ? (
                  /* Mobile Money Form */
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Opérateur</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'mtn', name: 'MTN', color: 'bg-yellow-400 text-yellow-950 border-yellow-500' },
                          { id: 'moov', name: 'Moov', color: 'bg-blue-600 text-white border-blue-700' },
                          { id: 'orange', name: 'Orange', color: 'bg-orange-500 text-white border-orange-600' },
                          { id: 'wave', name: 'Wave', color: 'bg-sky-400 text-white border-sky-500' }
                        ].map((op) => (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => setSimulatedOperator(op.id)}
                            className={`py-1 px-1 rounded-lg border text-[10px] font-bold text-center cursor-pointer transition-all ${
                              simulatedOperator === op.id ? `${op.color} ring-2 ring-indigo-500/30 scale-105` : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {op.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Numéro de téléphone</label>
                      <input
                        type="tel"
                        required
                        placeholder="Ex: +229 97 00 00 00"
                        value={simulatedPhoneNumber}
                        onChange={(e) => setSimulatedPhoneNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                      <span className="text-[9px] text-slate-400 block mt-1">Saisissez votre numéro de téléphone de paiement mobile.</span>
                    </div>
                  </div>
                ) : (
                  /* Card Form */
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Numéro de carte</label>
                      <input
                        type="text"
                        required
                        maxLength={19}
                        placeholder="4000 1234 5678 9010"
                        value={simulatedCardNumber}
                        onChange={(e) => setSimulatedCardNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Expiration</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          placeholder="MM/AA"
                          value={simulatedCardExpiry}
                          onChange={(e) => setSimulatedCardExpiry(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block mb-1">CVC</label>
                        <input
                          type="text"
                          required
                          maxLength={3}
                          placeholder="123"
                          value={simulatedCardCVC}
                          onChange={(e) => setSimulatedCardCVC(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  type="submit"
                  className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Payer {Math.round(fedaPaySimulatedData.amountUSD * 600).toLocaleString()} FCFA
                </button>

                <p className="text-[8px] text-center text-slate-400 px-4 leading-normal mt-2">
                  En cliquant sur Payer, vous initiez une transaction simulée dans le sandbox FedaPay de l'application. Aucun solde réel ne sera débité.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* Cover Letter AI Assistant Modal */}
      {isCoverLetterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 overflow-hidden shadow-2xl flex flex-col h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900">
                    Lettre de Motivation IA
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Modifiez le texte généré par l'IA avant de l'enregistrer dans votre coffre-fort.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCoverLetterModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Editor */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {coverLetterError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{coverLetterError}</span>
                </div>
              )}

              {coverLetterSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Lettre de motivation enregistrée avec succès et ajoutée au dossier !</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Texte de la lettre de motivation (Éditable)
                </label>
                <textarea
                  value={coverLetterText}
                  onChange={(e) => setCoverLetterText(e.target.value)}
                  className="w-full h-80 text-xs rounded-xl border border-slate-200 p-4 outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none bg-slate-50/50"
                  placeholder="Écrivez ou collez votre lettre de motivation ici..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Thème graphique de la lettre de motivation
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'classic', label: 'Classique', desc: 'Bleu Pro' },
                    { id: 'modern', label: 'Moderne', desc: 'Ardoise' },
                    { id: 'editorial', label: 'Académique', desc: 'Chaleureux' },
                    { id: 'creative', label: 'Créatif', desc: 'Monospace' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCoverLetterTheme(t.id)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        coverLetterTheme === t.id
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${coverLetterTheme === t.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {t.label}
                      </span>
                      <span className="text-[8px] text-slate-400 font-medium leading-none mt-0.5">
                        {t.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nom du fichier de destination (PDF)
                  </label>
                  <input
                    type="text"
                    value={letterFilename}
                    onChange={(e) => setLetterFilename(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500"
                    placeholder="Ex: Lettre_de_Motivation.pdf"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Associer à la catégorie du coffre-fort
                  </label>
                  <select
                    value={letterSaveCategory}
                    onChange={(e) => setLetterSaveCategory(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-500 bg-white"
                  >
                    {STANDARD_CATEGORIES.map(cat => (
                      <option key={cat.code} value={cat.code}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">
                La lettre sera automatiquement convertie en PDF de haute qualité.
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsCoverLetterModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveCoverLetter}
                  disabled={isSavingLetter || !coverLetterText.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingLetter ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Valider & Enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
