/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'essentiel' | 'pro' | 'business';
  monthlyDossiersCreated: number;
  country?: string;
  isSuspended?: boolean;
  createdAt?: string;
  emailVerified?: boolean;
  role?: 'admin' | 'user';
}

export type DocumentCategory =
  | 'CV'
  | 'CNI'
  | 'NAISSANCE'
  | 'DIPLOME'
  | 'MOTIVATION'
  | 'CASIER'
  | 'PORTFOLIO'
  | 'ATTESTATION'
  | 'SIGNATURE'
  | 'AUTRE';

export interface CategoryDefinition {
  code: DocumentCategory;
  label: string;
  description: string;
  icon: string;
}

export const STANDARD_CATEGORIES: CategoryDefinition[] = [
  {
    code: 'CV',
    label: 'Curriculum Vitae (CV)',
    description: 'Votre parcours professionnel détaillé et à jour.',
    icon: 'FileUser',
  },
  {
    code: 'CNI',
    label: "Pièce d'Identité (CNI / Passeport)",
    description: "Carte d'identité nationale, passeport ou titre de séjour en cours de validité.",
    icon: 'FileBadge',
  },
  {
    code: 'NAISSANCE',
    label: 'Acte de Naissance',
    description: 'Copie intégrale ou extrait avec filiation récent (moins de 3 mois).',
    icon: 'Baby',
  },
  {
    code: 'DIPLOME',
    label: 'Diplômes et Certificats',
    description: 'Vos diplômes d\'études, certifications ou titres académiques.',
    icon: 'GraduationCap',
  },
  {
    code: 'MOTIVATION',
    label: 'Lettre de Motivation',
    description: 'Lettre de motivation générale ou spécifique à vos candidatures.',
    icon: 'Mail',
  },
  {
    code: 'CASIER',
    label: 'Casier Judiciaire',
    description: 'Extrait de casier judiciaire (bulletin n°3 de moins de 3 mois).',
    icon: 'ShieldAlert',
  },
  {
    code: 'PORTFOLIO',
    label: 'Portfolio / Références',
    description: 'Exemples de réalisations, portfolio de projets, lettres de recommandation.',
    icon: 'Briefcase',
  },
  {
    code: 'ATTESTATION',
    label: 'Attestations Diverses',
    description: 'Attestations d\'emploi, de stage, fiscales, de régularité ou de sécurité sociale.',
    icon: 'FileCheck',
  },
  {
    code: 'SIGNATURE',
    label: 'Signature Manuscrite',
    description: 'Votre signature manuscrite sur fond transparent (PNG) pour signature automatique.',
    icon: 'FileCheck',
  },
  {
    code: 'AUTRE',
    label: 'Autres Documents',
    description: 'Tout autre document requis pour vos soumissions (justificatif de domicile, etc.).',
    icon: 'FileText',
  },
];

export interface SafeDocument {
  id: string;
  userId: string;
  category: DocumentCategory;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  path: string; // Internal file path
}

export interface RecruitmentOffer {
  id: string;
  userId: string;
  title: string;
  organizer: string;
  deadline: string;
  originalFileName: string;
  extractedPieces: ExtractedPiece[];
  rawText?: string;
  analyzedAt: string;
}

export interface ExtractedPiece {
  id: string;
  nomOriginal: string; // e.g. "CV actualisé"
  description: string; // e.g. "Un CV à jour présentant vos compétences"
  categorieProposee: DocumentCategory; // e.g. "CV"
  obligatoire: boolean;
  ordre: number; // Order in the final PDF (1, 2, etc.)
  matchDocumentId: string | null; // Selected file ID from the safe
}

export interface GeneratedDossier {
  id: string;
  userId: string;
  title: string;
  organizer: string;
  createdAt: string;
  pdfPath: string; // Path to generated PDF file
  size: number;
  piecesIncluded: {
    nomOriginal: string;
    categorie: DocumentCategory;
    fileName: string;
    pageCount: number;
  }[];
  hasCoverPage: boolean;
  status: 'success' | 'failed';
}

export interface MatchConfirmationRequest {
  offerId: string;
  coverPageOptions: {
    enabled: boolean;
    candidateName: string;
    candidateEmail: string;
    notes?: string;
  };
  mappings: {
    pieceId: string;
    documentId: string | null; // User confirmed or matched document
    ordre: number;
  }[];
}
