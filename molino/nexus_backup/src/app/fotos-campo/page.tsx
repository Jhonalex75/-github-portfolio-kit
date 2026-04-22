'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Camera,
  Upload,
  Search,
  Plus,
  X,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FolderPlus,
  Calendar,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  Edit3,
  Save,
  Layers,
  FileText,
} from 'lucide-react';
import { useUser, useFirestore, useStorage } from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  increment,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { EQUIPOS_TECNICOS } from '@/lib/equipment-data';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EquipmentTag {
  id: string;
  tag: string;
  description: string;
  type: string;
  wbs: string;
  createdBy: string;
  createdAt: Timestamp;
  photoCount: number;
  lastPhotoDate?: string;
}

interface PhotoMeta {
  id: string;
  tag: string;
  wbs: string;
  date: string;
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Timestamp;
  fileSizeKb: number;
  originalSizeKb: number;
  // Notas de campo — editables post-upload
  notes: string;
  hallazgos: string;
  autorNota: string;
  estadoEquipo: string;
  etiquetas: string[];
  contratista: string;
  compressed: boolean;
  width: number;
  height: number;
}

interface UploadItem {
  file: File;
  previewUrl: string;
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
  progress: number;
  compressedSizeKb: number;
  originalSizeKb: number;
  errorMsg?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const OWNER_UID = 'R3MVwE12nVMg128Kv6bdwJ6MKav1';

const TAG_TYPES = [
  'Tanque',
  'Estructura',
  'Equipamiento',
  'Tubería',
  'Civil',
  'Eléctrico',
  'Mecánico',
  'SAG Mill',
  'Ball Mill',
  'Otro',
];

const CONTRACTORS = ['Sin asignar', 'HL-GISAICO', 'TECNITANQUES', 'CYC'];

const QUALITY_OPTIONS = [
  {
    value: 'standard' as const,
    label: 'Estándar',
    desc: '1920 px · ~600 KB',
    maxPx: 1920,
    q: 0.82,
  },
  {
    value: 'hd' as const,
    label: 'Alta Calidad',
    desc: '3840 px · ~2.5 MB',
    maxPx: 3840,
    q: 0.9,
  },
  {
    value: 'original' as const,
    label: 'Original',
    desc: 'Sin compresión',
    maxPx: 0,
    q: 1,
  },
];

type Quality = 'standard' | 'hd' | 'original';

const ESTADO_OPTIONS: { value: string; color: string; bg: string }[] = [
  { value: 'Pendiente', color: 'text-slate-400', bg: 'bg-slate-600' },
  { value: 'En progreso', color: 'text-blue-400', bg: 'bg-blue-600' },
  { value: 'Completado', color: 'text-emerald-400', bg: 'bg-emerald-600' },
  { value: 'Con observaciones', color: 'text-amber-400', bg: 'bg-amber-600' },
  { value: 'Bloqueado', color: 'text-red-400', bg: 'bg-red-600' },
];

const ETIQUETAS_OPTIONS = [
  'Montaje',
  'Inspección',
  'Soldadura',
  'Alineación',
  'Prueba',
  'Defecto',
  'Corrección',
  'Documentación',
  'Seguridad',
  'Civil',
];

// ─────────────────────────────────────────────────────────────────────────────
// WBS areas — derived once at module level from equipment data
// ─────────────────────────────────────────────────────────────────────────────

interface WbsArea {
  raw: string;   // "WBS 1205 Molienda SAG"
  code: string;  // "1205"
  label: string; // "Molienda SAG"
  count: number; // equipment count
}

function buildWbsAreas(): WbsArea[] {
  const map = new Map<string, number>();
  for (const e of EQUIPOS_TECNICOS) {
    if (e.sub_wbs) map.set(e.sub_wbs, (map.get(e.sub_wbs) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([raw, count]) => {
      const m = raw.match(/WBS\s+(\d+)\s+(.*)/);
      return {
        raw,
        code: m ? m[1] : raw,
        label: m ? m[2] : raw,
        count,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

const WBS_AREAS: WbsArea[] = buildWbsAreas();

// ─────────────────────────────────────────────────────────────────────────────
// Image compression via Canvas API (no external dependency)
// ─────────────────────────────────────────────────────────────────────────────

async function compressImage(
  file: File,
  maxPx: number,
  quality: number,
): Promise<{ compressed: File; width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (maxPx > 0 && (w > maxPx || h > maxPx)) {
        const ratio = Math.min(maxPx / w, maxPx / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const name = file.name.replace(/\.[^.]+$/, '.jpg');
            resolve({
              compressed: new File([blob], name, { type: 'image/jpeg' }),
              width: w,
              height: h,
            });
          } else {
            resolve({ compressed: file, width: w, height: h });
          }
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ compressed: file, width: 0, height: 0 });
    };
    img.src = url;
  });
}

function fmtSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function getEstadoStyle(estado: string) {
  return ESTADO_OPTIONS.find((o) => o.value === estado);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function FotosCampoPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const isAdmin = user?.uid === OWNER_UID;
  const today = format(new Date(), 'yyyy-MM-dd');

  // ── Navigation state ───────────────────────────────────────────────────────
  const [selectedWbs, setSelectedWbs] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(today);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [tags, setTags] = useState<EquipmentTag[]>([]);
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // ── TAG search dropdown ────────────────────────────────────────────────────
  const [tagSearch, setTagSearch] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // ── Upload modal ───────────────────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadQuality, setUploadQuality] = useState<Quality>('standard');
  const [uploadNote, setUploadNote] = useState('');
  const [uploadContractor, setUploadContractor] = useState('Sin asignar');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // ── New TAG modal ──────────────────────────────────────────────────────────
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagId, setNewTagId] = useState('');
  const [newTagDesc, setNewTagDesc] = useState('');
  const [newTagType, setNewTagType] = useState('');
  const [newTagWbs, setNewTagWbs] = useState('');
  const [savingTag, setSavingTag] = useState(false);

  // ── Lightbox ───────────────────────────────────────────────────────────────
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // ── Note edit panel (inside lightbox) ─────────────────────────────────────
  const [showNotePanel, setShowNotePanel] = useState(false);
  const [noteEdit, setNoteEdit] = useState({
    notes: '',
    hallazgos: '',
    autorNota: '',
    estadoEquipo: '',
    etiquetas: [] as string[],
  });
  const [savingNote, setSavingNote] = useState(false);

  // ── Folder preview dialog ──────────────────────────────────────────────────
  const [showFolderPreview, setShowFolderPreview] = useState(false);
  const [folderPhotos, setFolderPhotos]           = useState<PhotoMeta[]>([]);
  const [loadingFolderPhotos, setLoadingFolderPhotos] = useState(false);
  const [folderNoteTarget, setFolderNoteTarget]   = useState<PhotoMeta | null>(null);
  const [folderNoteText, setFolderNoteText]       = useState('');
  const [folderHallazgos, setFolderHallazgos]     = useState('');
  const [savingFolderNote, setSavingFolderNote]   = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isUserLoading && !user) router.push('/auth');
  }, [user, isUserLoading, router]);

  // ── Load tags ──────────────────────────────────────────────────────────────
  const loadTags = useCallback(async () => {
    if (!firestore) return;
    setLoadingTags(true);
    try {
      const snap = await getDocs(
        query(collection(firestore, 'equipment_photo_tags'), orderBy('tag')),
      );
      setTags(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EquipmentTag)));
    } catch (e) {
      console.error('loadTags:', e);
    } finally {
      setLoadingTags(false);
    }
  }, [firestore]);

  useEffect(() => {
    if (user) loadTags();
  }, [user, loadTags]);

  // ── Load photos ────────────────────────────────────────────────────────────
  const loadPhotos = useCallback(async () => {
    if (!firestore || !selectedTag) {
      setPhotos([]);
      return;
    }
    setLoadingPhotos(true);
    try {
      const snap = await getDocs(
        query(
          collection(firestore, 'equipment_photos_meta'),
          where('tag', '==', selectedTag),
          where('date', '==', selectedDate),
        ),
      );
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as PhotoMeta))
        .sort((a, b) => (b.uploadedAt?.seconds ?? 0) - (a.uploadedAt?.seconds ?? 0));
      setPhotos(sorted);
    } catch (e) {
      console.error('loadPhotos:', e);
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, [firestore, selectedTag, selectedDate]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // ── Close dropdown on outside click ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(e.target as Node)
      ) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Keyboard navigation for lightbox ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIdx === null) return;
      if (e.key === 'ArrowRight' && lightboxIdx < photos.length - 1)
        setLightboxIdx((i) => (i ?? 0) + 1);
      if (e.key === 'ArrowLeft' && lightboxIdx > 0)
        setLightboxIdx((i) => (i ?? 0) - 1);
      if (e.key === 'Escape') {
        if (showNotePanel) setShowNotePanel(false);
        else setLightboxIdx(null);
      }
      if (e.key === 'z' || e.key === 'Z') setZoomed((z) => !z);
      if ((e.key === 'e' || e.key === 'E') && !showNotePanel) openNotePanel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx, photos.length, showNotePanel]);

  // ── Filmstrip auto-scroll + reset state on slide change ───────────────────
  useEffect(() => {
    if (lightboxIdx === null) return;
    setImgLoading(true);
    setZoomed(false);
    setShowNotePanel(false);
    if (filmstripRef.current) {
      const el = filmstripRef.current.children[lightboxIdx] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [lightboxIdx]);

  // ── Open note panel for current photo ─────────────────────────────────────
  const openNotePanel = useCallback(() => {
    if (lightboxIdx === null || !photos[lightboxIdx]) return;
    const p = photos[lightboxIdx];
    setNoteEdit({
      notes: p.notes ?? '',
      hallazgos: p.hallazgos ?? '',
      autorNota: p.autorNota || user?.displayName || '',
      estadoEquipo: p.estadoEquipo ?? '',
      etiquetas: p.etiquetas ?? [],
    });
    setShowNotePanel(true);
  }, [lightboxIdx, photos, user]);

  // ── Save notes to Firestore ────────────────────────────────────────────────
  const handleSaveNote = async () => {
    if (!firestore || lightboxIdx === null || !photos[lightboxIdx]) return;
    setSavingNote(true);
    const photo = photos[lightboxIdx];
    try {
      await updateDoc(doc(firestore, 'equipment_photos_meta', photo.id), {
        notes: noteEdit.notes,
        hallazgos: noteEdit.hallazgos,
        autorNota: noteEdit.autorNota,
        estadoEquipo: noteEdit.estadoEquipo,
        etiquetas: noteEdit.etiquetas,
      });
      setPhotos((prev) =>
        prev.map((p, i) => (i === lightboxIdx ? { ...p, ...noteEdit } : p)),
      );
      setShowNotePanel(false);
      toast({ title: 'Notas guardadas', description: `${photo.tag} · ${photo.date}` });
    } catch {
      toast({ title: 'Error al guardar notas', variant: 'destructive' });
    } finally {
      setSavingNote(false);
    }
  };

  // ── Load ALL photos for a TAG (folder preview — no date filter) ────────────
  const loadFolderPhotos = useCallback(async (tag: string) => {
    if (!firestore) return;
    setLoadingFolderPhotos(true);
    try {
      const snap = await getDocs(
        query(
          collection(firestore, 'equipment_photos_meta'),
          where('tag', '==', tag),
        ),
      );
      // Sort entirely client-side to avoid composite index requirement
      const sorted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as PhotoMeta))
        .sort((a, b) => b.date.localeCompare(a.date) || (b.uploadedAt?.seconds ?? 0) - (a.uploadedAt?.seconds ?? 0));
      setFolderPhotos(sorted);
    } catch (e) {
      console.error('loadFolderPhotos:', e);
    } finally {
      setLoadingFolderPhotos(false);
    }
  }, [firestore]);

  // ── Download helpers ───────────────────────────────────────────────────────
  const downloadPhoto = (photo: PhotoMeta) => {
    const a = document.createElement('a');
    a.href = photo.downloadUrl;
    a.download = photo.fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAll = (list: PhotoMeta[]) => {
    list.forEach((photo, i) => {
      setTimeout(() => downloadPhoto(photo), i * 600);
    });
    toast({ title: `Descargando ${list.length} fotos…`, description: 'Los archivos se descargarán uno por uno.' });
  };

  // ── Save note from folder preview ──────────────────────────────────────────
  const handleSaveFolderNote = async () => {
    if (!firestore || !folderNoteTarget) return;
    setSavingFolderNote(true);
    try {
      await updateDoc(doc(firestore, 'equipment_photos_meta', folderNoteTarget.id), {
        notes:      folderNoteText,
        hallazgos:  folderHallazgos,
        autorNota:  user?.displayName || '',
      });
      setFolderPhotos((prev) =>
        prev.map((p) =>
          p.id === folderNoteTarget.id
            ? { ...p, notes: folderNoteText, hallazgos: folderHallazgos }
            : p,
        ),
      );
      setFolderNoteTarget(null);
      toast({ title: 'Nota guardada', description: folderNoteTarget.tag });
    } catch {
      toast({ title: 'Error al guardar nota', variant: 'destructive' });
    } finally {
      setSavingFolderNote(false);
    }
  };

  // ── Create new TAG ─────────────────────────────────────────────────────────
  const handleCreateTag = async () => {
    if (!firestore || !newTagId.trim()) return;
    setSavingTag(true);
    try {
      const tag = newTagId.trim().toUpperCase();
      const tagDoc = {
        tag,
        description: newTagDesc.trim(),
        type: newTagType || 'Otro',
        wbs: newTagWbs,
        createdBy: user?.uid ?? '',
        createdAt: Timestamp.now(),
        photoCount: 0,
      };
      await setDoc(doc(firestore, 'equipment_photo_tags', tag), tagDoc);
      const newEntry: EquipmentTag = { id: tag, ...tagDoc };
      setTags((prev) =>
        [...prev, newEntry].sort((a, b) => a.tag.localeCompare(b.tag)),
      );
      setSelectedTag(tag);
      setTagSearch(tag);
      setShowNewTag(false);
      setShowTagDropdown(false);
      setNewTagId('');
      setNewTagDesc('');
      setNewTagType('');
      setNewTagWbs('');
      toast({
        title: 'TAG creado',
        description: `${tag} registrado. La carpeta se crea al subir la primera foto.`,
      });
    } catch {
      toast({ title: 'Error al crear TAG', variant: 'destructive' });
    } finally {
      setSavingTag(false);
    }
  };

  // ── File selection (click or drag) ─────────────────────────────────────────
  const handleFilesSelected = useCallback(
    (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;
      if (!selectedTag) {
        toast({ title: 'Selecciona un TAG primero', variant: 'destructive' });
        return;
      }
      const items: UploadItem[] = Array.from(files).map((f) => ({
        file: f,
        previewUrl: URL.createObjectURL(f),
        status: 'pending',
        progress: 0,
        compressedSizeKb: 0,
        originalSizeKb: Math.round(f.size / 1024),
      }));
      setUploadItems((prev) => [...prev.filter((p) => p.status !== 'done'), ...items]);
      setShowUpload(true);
    },
    [selectedTag, toast],
  );

  // ── Cleanup preview URLs on modal close ───────────────────────────────────
  const closeUploadModal = () => {
    uploadItems.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setShowUpload(false);
    setUploadItems([]);
  };

  // ── Batch upload ───────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!storage || !firestore || !selectedTag) return;
    if (!uploadItems.some((i) => i.status === 'pending')) return;

    const qOpt = QUALITY_OPTIONS.find((q) => q.value === uploadQuality)!;
    const tagObj = tags.find((t) => t.tag === selectedTag);
    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < uploadItems.length; i++) {
      if (uploadItems[i].status !== 'pending') continue;

      setUploadItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'compressing' } : it)),
      );

      let fileToUpload = uploadItems[i].file;
      let width = 0;
      let height = 0;

      try {
        if (uploadQuality !== 'original') {
          const result = await compressImage(uploadItems[i].file, qOpt.maxPx, qOpt.q);
          fileToUpload = result.compressed;
          width = result.width;
          height = result.height;
        }

        const compressedSizeKb = Math.round(fileToUpload.size / 1024);
        setUploadItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, compressedSizeKb } : it)),
        );

        // Storage path: equipment_photos/{TAG}/{YYYY-MM-DD}/{timestamp}_{filename}
        const ts = Date.now();
        const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `equipment_photos/${selectedTag}/${selectedDate}/${ts}_${safeName}`;
        const storageRef = ref(storage, storagePath);

        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, fileToUpload);
          task.on(
            'state_changed',
            (snap) => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setUploadItems((prev) =>
                prev.map((it, idx) =>
                  idx === i ? { ...it, status: 'uploading', progress: pct } : it,
                ),
              );
            },
            reject,
            async () => {
              const downloadUrl = await getDownloadURL(task.snapshot.ref);
              await addDoc(collection(firestore, 'equipment_photos_meta'), {
                tag: selectedTag,
                wbs: tagObj?.wbs ?? selectedWbs,
                date: selectedDate,
                storagePath,
                downloadUrl,
                fileName: fileToUpload.name,
                uploadedBy: user?.uid ?? '',
                uploadedByName: user?.displayName || user?.email || 'Usuario',
                uploadedAt: Timestamp.now(),
                fileSizeKb: compressedSizeKb,
                originalSizeKb: uploadItems[i].originalSizeKb,
                notes: uploadNote.trim(),
                hallazgos: '',
                autorNota: user?.displayName || '',
                estadoEquipo: '',
                etiquetas: [],
                contratista: uploadContractor,
                compressed: uploadQuality !== 'original',
                width,
                height,
              });
              // Update tag counters (best-effort)
              updateDoc(doc(firestore, 'equipment_photo_tags', selectedTag), {
                photoCount: increment(1),
                lastPhotoDate: selectedDate,
              }).catch(() => {});
              successCount++;
              setUploadItems((prev) =>
                prev.map((it, idx) =>
                  idx === i ? { ...it, status: 'done', progress: 100 } : it,
                ),
              );
              resolve();
            },
          );
        });
      } catch {
        setUploadItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'error', errorMsg: 'Error al subir' } : it,
          ),
        );
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast({
        title: `${successCount} foto(s) guardadas`,
        description: `${selectedTag} / ${selectedDate}`,
      });
      await loadPhotos();
      await loadTags();
      setTimeout(() => {
        setShowUpload(false);
        setUploadItems([]);
        setUploadNote('');
        setUploadContractor('Sin asignar');
      }, 1000);
    }
  };

  // ── Delete photo (admin only) ──────────────────────────────────────────────
  const handleDelete = async (photo: PhotoMeta) => {
    if (!isAdmin || !storage || !firestore) return;
    setDeleting(photo.id);
    try {
      await deleteObject(ref(storage, photo.storagePath));
      await deleteDoc(doc(firestore, 'equipment_photos_meta', photo.id));
      updateDoc(doc(firestore, 'equipment_photo_tags', photo.tag), {
        photoCount: increment(-1),
      }).catch(() => {});
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setLightboxIdx(null);
      toast({ title: 'Foto eliminada' });
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  // ── Pre-fill new TAG from equipment catalog ────────────────────────────────
  const prefillFromEquipment = (tag: string, nombre: string, subWbs: string) => {
    setNewTagId(tag.toUpperCase());
    setNewTagDesc(nombre);
    setNewTagWbs(subWbs);
    setShowNewTag(true);
    setShowTagDropdown(false);
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  // Equipment from EQUIPOS_TECNICOS filtered by WBS area
  const wbsEquipmentCount = useMemo(() => {
    if (!selectedWbs) return 0;
    return EQUIPOS_TECNICOS.filter((e) => e.sub_wbs === selectedWbs).length;
  }, [selectedWbs]);

  // Registered tags filtered by WBS and search
  const filteredTags = useMemo(() => {
    return tags.filter((t) => {
      const matchWbs = !selectedWbs || t.wbs === selectedWbs;
      const matchSearch =
        !tagSearch ||
        t.tag.toLowerCase().includes(tagSearch.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(tagSearch.toLowerCase());
      return matchWbs && matchSearch;
    });
  }, [tags, selectedWbs, tagSearch]);

  // Equipment from catalog not yet in Firestore (show as suggestions)
  const equipmentSuggestions = useMemo(() => {
    if (tagSearch.length < 2) return [];
    const registered = new Set(tags.map((t) => t.tag));
    return EQUIPOS_TECNICOS.filter((e) => {
      if (registered.has(e.tag)) return false;
      const matchWbs = !selectedWbs || e.sub_wbs === selectedWbs;
      const matchSearch =
        e.tag.toLowerCase().includes(tagSearch.toLowerCase()) ||
        e.nombre.toLowerCase().includes(tagSearch.toLowerCase());
      return matchWbs && matchSearch;
    }).slice(0, 5);
  }, [tagSearch, tags, selectedWbs]);

  const showCreateNew =
    tagSearch.trim().length >= 2 &&
    !tags.some((t) => t.tag.toLowerCase() === tagSearch.trim().toLowerCase()) &&
    !equipmentSuggestions.some(
      (e) => e.tag.toLowerCase() === tagSearch.trim().toLowerCase(),
    );

  const navigateDate = (delta: number) => {
    const d = parseISO(selectedDate);
    setSelectedDate(
      format(delta > 0 ? addDays(d, 1) : subDays(d, 1), 'yyyy-MM-dd'),
    );
  };

  const selectedTagObj = tags.find((t) => t.tag === selectedTag);
  const totalMb = (photos.reduce((s, p) => s + p.fileSizeKb, 0) / 1024).toFixed(1);
  const currentPhoto = lightboxIdx !== null ? photos[lightboxIdx] : null;

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#020617]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-200">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-auto p-6">
          {/* ── Page header ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-black tracking-widest uppercase text-cyan-400">
                GALERÍA DE CAMPO
              </h1>
              <p className="text-xs text-slate-500 font-mono tracking-wider mt-1">
                Registro fotográfico · Área WBS → Equipo → Fecha
              </p>
            </div>
            <Button
              onClick={() => {
                if (!selectedTag) {
                  toast({ title: 'Selecciona un TAG primero', variant: 'destructive' });
                  return;
                }
                fileInputRef.current?.click();
              }}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 font-display font-black tracking-widest text-xs uppercase"
            >
              <Camera className="w-4 h-4 mr-2" />
              SUBIR FOTOS
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
              onClick={(e) => {
                (e.target as HTMLInputElement).value = '';
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            {/* ── LEFT PANEL ────────────────────────────────────────────── */}
            <div className="space-y-4">

              {/* WBS Area Navigator */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-display font-black tracking-widest uppercase text-cyan-400 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" /> ÁREA WBS
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-0.5 max-h-56 overflow-y-auto">
                    {/* All areas option */}
                    <button
                      className={cn(
                        'w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors',
                        !selectedWbs
                          ? 'bg-cyan-500/15 text-cyan-400'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                      )}
                      onClick={() => {
                        setSelectedWbs('');
                        setSelectedTag('');
                        setTagSearch('');
                      }}
                    >
                      <span className="font-bold">Todas las áreas</span>
                      <span className="text-slate-600 ml-2 text-[10px]">
                        ({EQUIPOS_TECNICOS.length})
                      </span>
                    </button>

                    {WBS_AREAS.map((area) => (
                      <button
                        key={area.code}
                        className={cn(
                          'w-full text-left px-2.5 py-1.5 rounded-md transition-colors flex items-start justify-between gap-1',
                          selectedWbs === area.raw
                            ? 'bg-cyan-500/15 text-cyan-400'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                        )}
                        onClick={() => {
                          setSelectedWbs(area.raw);
                          setSelectedTag('');
                          setTagSearch('');
                        }}
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold font-mono block leading-tight">
                            {area.code}
                          </span>
                          <span className="text-[9px] text-slate-500 truncate block leading-tight">
                            {area.label}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-600 shrink-0 mt-0.5">
                          {area.count}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedWbs && (
                    <p className="text-[9px] text-slate-600 font-mono mt-2 pt-2 border-t border-slate-800">
                      {wbsEquipmentCount} equipos en esta área
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* TAG selector */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-display font-black tracking-widest uppercase text-cyan-400 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" /> EQUIPO / TAG
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="relative" ref={tagDropdownRef}>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                        <Input
                          placeholder="Buscar TAG o equipo..."
                          value={tagSearch}
                          onChange={(e) => {
                            setTagSearch(e.target.value);
                            setShowTagDropdown(true);
                          }}
                          onFocus={() => setShowTagDropdown(true)}
                          className="pl-9 bg-slate-800 border-slate-700 text-slate-200 text-xs font-mono h-9"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Crear nuevo TAG"
                        onClick={() => {
                          setNewTagId(tagSearch.toUpperCase());
                          setNewTagWbs(selectedWbs);
                          setShowNewTag(true);
                          setShowTagDropdown(false);
                        }}
                        className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 h-9 px-2.5 shrink-0"
                      >
                        <FolderPlus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Dropdown */}
                    {showTagDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-2xl z-50 max-h-72 overflow-y-auto">
                        {loadingTags ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          </div>
                        ) : (
                          <>
                            {/* Registered TAGs */}
                            {filteredTags.map((t) => (
                              <button
                                key={t.id}
                                className={cn(
                                  'w-full text-left px-3 py-2.5 hover:bg-slate-700 transition-colors flex items-center justify-between',
                                  selectedTag === t.tag && 'bg-cyan-500/10',
                                )}
                                onClick={() => {
                                  setSelectedTag(t.tag);
                                  setTagSearch(t.tag);
                                  setShowTagDropdown(false);
                                }}
                              >
                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      'text-xs font-mono font-bold truncate',
                                      selectedTag === t.tag
                                        ? 'text-cyan-400'
                                        : 'text-slate-200',
                                    )}
                                  >
                                    {t.tag}
                                  </p>
                                  {t.description && (
                                    <p className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                      {t.description}
                                    </p>
                                  )}
                                  {t.wbs && (
                                    <p className="text-[9px] text-slate-600 truncate">
                                      {t.wbs}
                                    </p>
                                  )}
                                </div>
                                <Badge className="text-[9px] bg-slate-700 text-slate-400 border-none ml-2 shrink-0">
                                  {t.photoCount ?? 0}
                                </Badge>
                              </button>
                            ))}

                            {/* Equipment from catalog not yet registered */}
                            {equipmentSuggestions.length > 0 && (
                              <>
                                {filteredTags.length > 0 && (
                                  <div className="px-3 py-1.5 text-[9px] text-slate-600 uppercase tracking-widest border-t border-slate-700/50 font-display">
                                    Del catálogo de equipos
                                  </div>
                                )}
                                {equipmentSuggestions.map((e) => (
                                  <button
                                    key={e.tag}
                                    className="w-full text-left px-3 py-2.5 hover:bg-slate-700/60 transition-colors flex items-center justify-between"
                                    onClick={() =>
                                      prefillFromEquipment(e.tag, e.nombre, e.sub_wbs)
                                    }
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-mono text-slate-400 truncate">
                                        {e.tag}
                                      </p>
                                      <p className="text-[10px] text-slate-600 truncate max-w-[160px]">
                                        {e.nombre}
                                      </p>
                                    </div>
                                    <span className="text-[9px] text-cyan-500/60 shrink-0 ml-2">
                                      + Registrar
                                    </span>
                                  </button>
                                ))}
                              </>
                            )}

                            {/* Create custom option */}
                            {showCreateNew && (
                              <button
                                className="w-full text-left px-3 py-2.5 bg-cyan-500/5 hover:bg-cyan-500/15 transition-colors flex items-center gap-2 border-t border-slate-700"
                                onClick={() => {
                                  setNewTagId(tagSearch.toUpperCase());
                                  setNewTagWbs(selectedWbs);
                                  setShowNewTag(true);
                                  setShowTagDropdown(false);
                                }}
                              >
                                <FolderPlus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="text-xs font-mono text-cyan-400">
                                  + Crear TAG &ldquo;{tagSearch.toUpperCase()}&rdquo;
                                </span>
                              </button>
                            )}

                            {filteredTags.length === 0 &&
                              equipmentSuggestions.length === 0 &&
                              !showCreateNew && (
                                <p className="text-xs text-slate-500 text-center py-5">
                                  No se encontraron TAGs
                                </p>
                              )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected TAG info */}
                  {selectedTagObj && (
                    <div className="mt-3 p-3 bg-slate-800/60 rounded-md border border-slate-700/40">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                        <span className="text-[11px] font-display font-black text-cyan-400 tracking-widest">
                          {selectedTagObj.tag}
                        </span>
                        <Badge className="text-[9px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30 ml-auto">
                          {selectedTagObj.type}
                        </Badge>
                      </div>
                      {selectedTagObj.description && (
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                          {selectedTagObj.description}
                        </p>
                      )}
                      {selectedTagObj.wbs && (
                        <p className="text-[9px] text-slate-600 mt-1 font-mono">
                          {selectedTagObj.wbs}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-slate-500">
                          {selectedTagObj.photoCount ?? 0} fotos en total
                        </p>
                        <button
                          onClick={() => {
                            loadFolderPhotos(selectedTag);
                            setShowFolderPreview(true);
                          }}
                          className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> Ver carpeta
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Date navigator */}
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-display font-black tracking-widest uppercase text-cyan-400 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> FECHA
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-200 text-xs font-mono h-9 [color-scheme:dark]"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate(-1)}
                      className="flex-1 border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono h-8"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(today)}
                      disabled={selectedDate === today}
                      className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs font-mono h-8 px-3"
                    >
                      Hoy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate(1)}
                      className="flex-1 border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono h-8"
                    >
                      Siguiente <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                  <p className="text-center text-[11px] text-slate-400 font-mono capitalize">
                    {format(parseISO(selectedDate), "EEEE d 'de' MMMM yyyy", {
                      locale: es,
                    })}
                  </p>
                </CardContent>
              </Card>

              {/* Stats */}
              {selectedTag && (
                <Card className="bg-slate-900/50 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800/60 rounded-lg p-3 text-center border border-slate-700/30">
                        <p className="text-2xl font-display font-black text-cyan-400 leading-none">
                          {photos.length}
                        </p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">
                          fotos del día
                        </p>
                      </div>
                      <div className="bg-slate-800/60 rounded-lg p-3 text-center border border-slate-700/30">
                        <p className="text-2xl font-display font-black text-cyan-400 leading-none">
                          {totalMb}
                        </p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">
                          MB total
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 text-xs"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Agregar fotos
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── RIGHT PANEL: Gallery + Drag & Drop ────────────────────── */}
            <div
              ref={dropZoneRef}
              className={cn(
                'relative rounded-xl transition-all duration-200',
                dragOver &&
                  'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#020617]',
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const files = Array.from(e.dataTransfer.files).filter((f) =>
                  f.type.startsWith('image/'),
                );
                if (files.length > 0) handleFilesSelected(files);
              }}
            >
              {/* Drag overlay */}
              {dragOver && (
                <div className="absolute inset-0 bg-cyan-500/10 backdrop-blur-sm rounded-xl z-20 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-cyan-400 pointer-events-none">
                  <Upload className="w-10 h-10 text-cyan-400" />
                  <p className="text-cyan-300 font-display font-black text-lg tracking-widest uppercase">
                    Suelta las fotos aquí
                  </p>
                  {selectedTag && (
                    <p className="text-cyan-400/60 text-xs font-mono">
                      {selectedTag} · {selectedDate}
                    </p>
                  )}
                </div>
              )}

              {/* Empty — no TAG */}
              {!selectedTag ? (
                <div className="flex flex-col items-center justify-center h-80 border border-dashed border-slate-700/60 rounded-xl gap-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center">
                    <Tag className="w-7 h-7 text-slate-600" />
                  </div>
                  <p className="text-slate-500 text-sm font-mono">
                    Selecciona un área WBS y un equipo
                  </p>
                  <p className="text-slate-600 text-xs">
                    o arrastra fotos aquí para subir directamente
                  </p>
                </div>
              ) : loadingPhotos ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-slate-800/60 rounded-lg border border-slate-700/30 animate-pulse"
                    />
                  ))}
                </div>
              ) : photos.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-80 border border-dashed border-slate-700/40 rounded-xl gap-3 cursor-pointer hover:border-cyan-500/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-slate-600" />
                  </div>
                  <p className="text-slate-500 text-sm font-mono">
                    Sin fotos para {selectedTag} · {selectedDate}
                  </p>
                  <p className="text-slate-600 text-xs">
                    Haz clic o arrastra imágenes para subir
                  </p>
                </div>
              ) : (
                <>
                  {/* Gallery header / breadcrumb */}
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {selectedTagObj?.wbs && (
                      <>
                        <span className="text-[10px] font-mono text-slate-600">
                          {selectedTagObj.wbs}
                        </span>
                        <span className="text-slate-700">/</span>
                      </>
                    )}
                    <span className="text-xs font-display font-black text-slate-400 uppercase tracking-widest">
                      {selectedTag}
                    </span>
                    <span className="text-slate-700">/</span>
                    <span className="text-xs font-mono text-slate-500">
                      {selectedDate}
                    </span>
                    <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">
                      {photos.length} foto{photos.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px]">
                      {totalMb} MB
                    </Badge>
                  </div>

                  {/* Photo grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {photos.map((photo, idx) => {
                      const estadoStyle = getEstadoStyle(photo.estadoEquipo);
                      return (
                        <div
                          key={photo.id}
                          className="group relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700/40 hover:border-cyan-500/50 transition-all cursor-pointer aspect-square shadow-md"
                          onClick={() => setLightboxIdx(idx)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.downloadUrl}
                            alt={photo.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          {/* Index badge */}
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center group-hover:opacity-0 transition-opacity">
                            <span className="text-[9px] font-mono text-white/70 leading-none">
                              {idx + 1}
                            </span>
                          </div>
                          {/* Estado indicator */}
                          {estadoStyle && (
                            <div
                              className={cn(
                                'absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/30',
                                estadoStyle.bg,
                              )}
                              title={photo.estadoEquipo}
                            />
                          )}
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                              <Eye className="w-4 h-4 text-white/80" />
                              <span className="text-[8px] font-mono text-white/50">
                                {idx + 1}/{photos.length}
                              </span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-2 space-y-0.5">
                              <p className="text-[9px] text-slate-200 font-mono truncate leading-tight">
                                {photo.fileName}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-cyan-400">
                                  {fmtSize(photo.fileSizeKb)}
                                </span>
                                {photo.width > 0 && (
                                  <span className="text-[8px] text-slate-500">
                                    {photo.width}×{photo.height}
                                  </span>
                                )}
                              </div>
                              {photo.etiquetas?.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {photo.etiquetas.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Contractor badge */}
                          {photo.contratista && photo.contratista !== 'Sin asignar' && (
                            <Badge className="absolute bottom-1.5 left-1.5 text-[8px] bg-black/70 text-white border-none backdrop-blur-sm px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {photo.contratista}
                            </Badge>
                          )}
                          {/* Note indicator */}
                          {(photo.notes || photo.hallazgos) && (
                            <div
                              className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400/80"
                              title={photo.hallazgos || photo.notes}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Nuevo TAG
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showNewTag} onOpenChange={setShowNewTag}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black tracking-widest uppercase text-cyan-400 flex items-center gap-2 text-sm">
              <FolderPlus className="w-4 h-4" /> NUEVO TAG DE EQUIPO
            </DialogTitle>
            <p className="text-[10px] text-slate-500 font-mono">
              La carpeta se crea automáticamente al subir la primera foto.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                TAG *
              </Label>
              <Input
                value={newTagId}
                onChange={(e) => setNewTagId(e.target.value.toUpperCase())}
                placeholder="ej: 1205-ML-001, 1110-GZ-001"
                className="bg-slate-800 border-slate-700 text-slate-200 font-mono mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                Descripción
              </Label>
              <Input
                value={newTagDesc}
                onChange={(e) => setNewTagDesc(e.target.value)}
                placeholder="Nombre del equipo"
                className="bg-slate-800 border-slate-700 text-slate-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                Área WBS
              </Label>
              <Select value={newTagWbs} onValueChange={setNewTagWbs}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 mt-1">
                  <SelectValue placeholder="Seleccionar área..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-56">
                  {WBS_AREAS.map((area) => (
                    <SelectItem
                      key={area.code}
                      value={area.raw}
                      className="text-slate-200 hover:bg-slate-700 text-xs"
                    >
                      <span className="font-mono">{area.code}</span> · {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                Tipo de equipo
              </Label>
              <Select value={newTagType} onValueChange={setNewTagType}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 mt-1">
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {TAG_TYPES.map((t) => (
                    <SelectItem
                      key={t}
                      value={t}
                      className="text-slate-200 hover:bg-slate-700"
                    >
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowNewTag(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTag}
              disabled={!newTagId.trim() || savingTag}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
            >
              {savingTag ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Crear TAG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Vista de Carpeta — todas las fotos del TAG
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showFolderPreview} onOpenChange={setShowFolderPreview}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden p-0">
          <DialogTitle className="sr-only">Vista de Carpeta — {selectedTag}</DialogTitle>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-display font-black tracking-widest uppercase text-cyan-400 truncate">
                  {selectedTag}
                </h2>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  {selectedTagObj?.description} · {folderPhotos.length} foto{folderPhotos.length !== 1 ? 's' : ''} en total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {folderPhotos.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => downloadAll(folderPhotos)}
                  className="bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-xs font-mono h-8"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Descargar todas
                </Button>
              )}
              <button
                onClick={() => setShowFolderPreview(false)}
                className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loadingFolderPhotos ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : folderPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <ImageIcon className="w-10 h-10 text-slate-600" />
                <p className="text-slate-500 text-sm font-mono">Sin fotos registradas para {selectedTag}</p>
              </div>
            ) : (
              (() => {
                // Group by date
                const byDate = folderPhotos.reduce<Record<string, PhotoMeta[]>>((acc, p) => {
                  (acc[p.date] = acc[p.date] ?? []).push(p);
                  return acc;
                }, {});
                const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
                return (
                  <div className="space-y-6">
                    {dates.map((date) => {
                      const dayPhotos = byDate[date];
                      const dayMb = (dayPhotos.reduce((s, p) => s + p.fileSizeKb, 0) / 1024).toFixed(1);
                      return (
                        <div key={date}>
                          {/* Date header */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-cyan-400/60" />
                              <span className="text-xs font-mono font-bold text-slate-300">
                                {format(parseISO(date), "EEEE d 'de' MMMM yyyy", { locale: es })}
                              </span>
                            </div>
                            <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[9px]">
                              {dayPhotos.length} foto{dayPhotos.length !== 1 ? 's' : ''}
                            </Badge>
                            <Badge className="bg-slate-800 text-slate-500 border-slate-700 text-[9px]">
                              {dayMb} MB
                            </Badge>
                            <button
                              onClick={() => downloadAll(dayPhotos)}
                              className="ml-auto flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
                            >
                              <Download className="w-3 h-3" /> Descargar día
                            </button>
                          </div>

                          {/* Photo grid for this date */}
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                            {dayPhotos.map((photo) => {
                              const hasNote = !!(photo.notes || photo.hallazgos);
                              return (
                                <div key={photo.id} className="group relative rounded-lg overflow-hidden bg-slate-800 border border-slate-700/40 hover:border-cyan-500/40 transition-all aspect-square">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photo.downloadUrl}
                                    alt={photo.fileName}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                  />
                                  {/* Note dot */}
                                  {hasNote && (
                                    <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-400" title={photo.hallazgos || photo.notes} />
                                  )}
                                  {/* Hover overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Action buttons */}
                                    <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                                      <button
                                        onClick={() => downloadPhoto(photo)}
                                        className="w-6 h-6 rounded bg-black/70 backdrop-blur-sm flex items-center justify-center text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                                        title="Descargar"
                                      >
                                        <Download className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setFolderNoteTarget(photo);
                                          setFolderNoteText(photo.notes ?? '');
                                          setFolderHallazgos(photo.hallazgos ?? '');
                                        }}
                                        className="w-6 h-6 rounded bg-black/70 backdrop-blur-sm flex items-center justify-center text-amber-400 hover:bg-amber-500/30 transition-colors"
                                        title="Agregar / editar nota"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    {/* Bottom info */}
                                    <div className="absolute bottom-0 left-0 right-0 p-1.5 space-y-0.5">
                                      <p className="text-[8px] text-slate-200 font-mono truncate leading-tight">{photo.fileName}</p>
                                      <p className="text-[8px] text-cyan-400 font-mono">{fmtSize(photo.fileSizeKb)}</p>
                                      {photo.contratista && photo.contratista !== 'Sin asignar' && (
                                        <span className="text-[7px] bg-black/60 text-white px-1 rounded">{photo.contratista}</span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Note preview on hover — bottom strip */}
                                  {hasNote && (
                                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-amber-500/10 border-t border-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                      <p className="text-[8px] text-amber-300 truncate font-mono">{photo.hallazgos || photo.notes}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Note panel (folder preview) ────────────────────────────────────── */}
      <Dialog open={!!folderNoteTarget} onOpenChange={(v) => { if (!v) setFolderNoteTarget(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black tracking-widest uppercase text-amber-400 flex items-center gap-2 text-sm">
              <Edit3 className="w-4 h-4" /> NOTA DE CAMPO
            </DialogTitle>
            <p className="text-[10px] text-slate-500 font-mono">
              {folderNoteTarget?.tag} · {folderNoteTarget?.date} · {folderNoteTarget?.fileName}
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                Hallazgos / Observaciones
              </Label>
              <Textarea
                value={folderHallazgos}
                onChange={(e) => setFolderHallazgos(e.target.value)}
                placeholder="Describe hallazgos, defectos o puntos de atención…"
                className="bg-slate-800 border-slate-700 text-slate-200 text-xs font-mono mt-1 min-h-[80px] resize-none"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                Nota general
              </Label>
              <Textarea
                value={folderNoteText}
                onChange={(e) => setFolderNoteText(e.target.value)}
                placeholder="Notas adicionales sobre la imagen…"
                className="bg-slate-800 border-slate-700 text-slate-200 text-xs font-mono mt-1 min-h-[60px] resize-none"
              />
            </div>
            {/* Preview de la foto */}
            {folderNoteTarget && (
              <div className="rounded-lg overflow-hidden border border-slate-700/40 max-h-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={folderNoteTarget.downloadUrl} alt="" className="w-full h-40 object-cover" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFolderNoteTarget(null)} className="text-slate-400 hover:text-slate-200">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveFolderNote}
              disabled={savingFolderNote}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40"
            >
              {savingFolderNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Modal: Subir fotos (con Drag & Drop interno)
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showUpload}
        onOpenChange={(v) => {
          if (!uploading && !v) closeUploadModal();
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-display font-black tracking-widest uppercase text-cyan-400 flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4" /> SUBIR FOTOS
            </DialogTitle>
            <p className="text-[10px] text-slate-500 font-mono">
              {selectedTag} · {selectedDate} ·{' '}
              {uploadItems.length} archivo{uploadItems.length !== 1 ? 's' : ''}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-1">
            {/* File list with previews */}
            <div className="space-y-2">
              {uploadItems.map((item, i) => (
                <div
                  key={i}
                  className="bg-slate-800/80 rounded-md p-2 flex items-center gap-3 border border-slate-700/40"
                >
                  <div className="shrink-0 w-14 h-14 rounded-md overflow-hidden bg-slate-700 border border-slate-600 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                    {item.status === 'done' && (
                      <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                    )}
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">
                          {item.progress}%
                        </span>
                      </div>
                    )}
                    {item.status === 'compressing' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-300 truncate">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500">
                        {fmtSize(item.originalSizeKb)} original
                      </span>
                      {item.compressedSizeKb > 0 && item.status !== 'pending' && (
                        <>
                          <span className="text-slate-700">→</span>
                          <span className="text-[10px] text-cyan-500">
                            {fmtSize(item.compressedSizeKb)}
                          </span>
                          <span className="text-[10px] text-emerald-400">
                            (
                            {Math.round(
                              (1 - item.compressedSizeKb / item.originalSizeKb) * 100,
                            )}
                            % menos)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 w-24 text-right">
                    {item.status === 'pending' && (
                      <span className="text-[10px] text-slate-500">En espera</span>
                    )}
                    {item.status === 'compressing' && (
                      <span className="text-[10px] text-amber-400">Comprimiendo...</span>
                    )}
                    {item.status === 'uploading' && (
                      <div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-cyan-400">{item.progress}%</span>
                      </div>
                    )}
                    {item.status === 'done' && (
                      <span className="text-[10px] text-emerald-400 font-bold">✓ Listo</span>
                    )}
                    {item.status === 'error' && (
                      <div className="flex items-center justify-end gap-1 text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-[10px]">Error</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Drop zone to add more files */}
            {!uploading && (
              <div
                className="w-full border border-dashed border-slate-700 rounded-md py-4 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors cursor-pointer text-xs"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files).filter((f) =>
                    f.type.startsWith('image/'),
                  );
                  if (files.length > 0) handleFilesSelected(files);
                }}
              >
                <Upload className="w-5 h-5" />
                <span>Arrastra más fotos o haz clic para agregar</span>
              </div>
            )}

            {/* Quality selector */}
            <div>
              <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                Calidad de subida
              </Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q.value}
                    disabled={uploading}
                    onClick={() => setUploadQuality(q.value)}
                    className={cn(
                      'rounded-md p-2.5 border text-left transition-all',
                      uploadQuality === q.value
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600',
                    )}
                  >
                    <p className="text-[11px] font-display font-black">{q.label}</p>
                    <p className="text-[9px] font-mono text-slate-500 mt-0.5">{q.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Note + Contractor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                  Nota inicial
                </Label>
                <Input
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  placeholder="Descripción opcional..."
                  disabled={uploading}
                  className="bg-slate-800 border-slate-700 text-slate-200 text-xs mt-1 h-8"
                />
              </div>
              <div>
                <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                  Contratista
                </Label>
                <Select
                  value={uploadContractor}
                  onValueChange={setUploadContractor}
                  disabled={uploading}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 text-xs mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {CONTRACTORS.map((c) => (
                      <SelectItem key={c} value={c} className="text-slate-200 text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-2 border-t border-slate-800">
            <Button
              variant="ghost"
              onClick={closeUploadModal}
              disabled={uploading}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                uploading ||
                uploadItems.length === 0 ||
                uploadItems.every((i) => i.status === 'done')
              }
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Subir {uploadItems.filter((i) => i.status === 'pending').length} foto(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Lightbox con panel de Notas de Campo
      ══════════════════════════════════════════════════════════════════════ */}
      {lightboxIdx !== null && currentPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex flex-col"
          onClick={() => {
            if (showNotePanel) setShowNotePanel(false);
            else setLightboxIdx(null);
          }}
        >
          {/* ── Top bar ───────────────────────────────────────────────────── */}
          <div
            className="shrink-0 flex items-center justify-between px-4 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white/60 text-xs font-mono">
                {lightboxIdx + 1} / {photos.length}
              </span>
              <Badge className="text-[9px] bg-slate-800/80 text-slate-300 border-slate-700 backdrop-blur-sm">
                {selectedTag}
              </Badge>
              {currentPhoto.wbs && (
                <span className="text-slate-600 text-[10px] font-mono hidden sm:block">
                  {currentPhoto.wbs}
                </span>
              )}
              <span className="text-slate-600 text-xs font-mono">{selectedDate}</span>
              {currentPhoto.estadoEquipo && (() => {
                const s = getEstadoStyle(currentPhoto.estadoEquipo);
                return s ? (
                  <Badge className={cn('text-[9px] border-none text-white', s.bg)}>
                    {currentPhoto.estadoEquipo}
                  </Badge>
                ) : null;
              })()}
            </div>
            <div className="flex items-center gap-2">
              {/* Edit notes toggle */}
              <button
                title="Notas de campo (E)"
                onClick={(e) => {
                  e.stopPropagation();
                  if (showNotePanel) setShowNotePanel(false);
                  else openNotePanel();
                }}
                className={cn(
                  'transition-colors rounded-full p-2',
                  showNotePanel
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-white/50 hover:text-white bg-black/40',
                )}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              {/* Zoom */}
              <button
                title={zoomed ? 'Ajustar (Z)' : 'Ampliar (Z)'}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomed((z) => !z);
                }}
                className="text-white/50 hover:text-white transition-colors bg-black/40 rounded-full p-2"
              >
                {zoomed ? (
                  <ZoomOut className="w-4 h-4" />
                ) : (
                  <ZoomIn className="w-4 h-4" />
                )}
              </button>
              <button
                className="text-white/60 hover:text-white transition-colors bg-black/40 rounded-full p-2"
                onClick={() => setLightboxIdx(null)}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Image area + Note panel ────────────────────────────────────── */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Image */}
            <div
              className={cn(
                'flex items-center justify-center relative min-h-0 overflow-hidden transition-all duration-300',
                showNotePanel ? 'flex-1 px-10' : 'w-full px-14',
              )}
            >
              {/* Prev */}
              {lightboxIdx > 0 && (
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors z-10 bg-black/50 hover:bg-black/70 rounded-full p-3 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIdx((i) => (i ?? 1) - 1);
                  }}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              <div
                className={cn(
                  'relative flex items-center justify-center transition-all duration-200',
                  zoomed
                    ? 'overflow-auto w-full h-full cursor-zoom-out'
                    : 'cursor-zoom-in',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!showNotePanel) setZoomed((z) => !z);
                }}
              >
                {imgLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400/70" />
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={currentPhoto.id}
                  src={currentPhoto.downloadUrl}
                  alt={currentPhoto.fileName}
                  onLoad={() => setImgLoading(false)}
                  className={cn(
                    'rounded-lg shadow-2xl transition-opacity duration-300 select-none',
                    imgLoading ? 'opacity-0' : 'opacity-100',
                    zoomed
                      ? 'max-w-none max-h-none w-auto h-auto'
                      : 'max-w-full max-h-[calc(100vh-230px)] object-contain',
                  )}
                />
              </div>

              {/* Next */}
              {lightboxIdx < photos.length - 1 && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors z-10 bg-black/50 hover:bg-black/70 rounded-full p-3 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIdx((i) => (i ?? 0) + 1);
                  }}
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* ── NOTE PANEL ────────────────────────────────────────────────── */}
            {showNotePanel && (
              <div
                className="w-80 shrink-0 bg-slate-900/98 border-l border-slate-800 flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
                  <h3 className="text-xs font-display font-black tracking-widest uppercase text-amber-400 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> NOTAS DE CAMPO
                  </h3>
                  <button
                    onClick={() => setShowNotePanel(false)}
                    className="text-slate-500 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Panel content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Photo context */}
                  <div className="bg-slate-800/60 rounded-md p-2.5 space-y-0.5">
                    <p className="text-[10px] font-mono text-slate-300 truncate">
                      {currentPhoto.fileName}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      {currentPhoto.tag} · {currentPhoto.date}
                    </p>
                    <p className="text-[10px] font-mono text-slate-600">
                      por {currentPhoto.uploadedByName}
                    </p>
                  </div>

                  {/* Estado del equipo */}
                  <div>
                    <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                      Estado del equipo
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      {ESTADO_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() =>
                            setNoteEdit((n) => ({
                              ...n,
                              estadoEquipo:
                                n.estadoEquipo === opt.value ? '' : opt.value,
                            }))
                          }
                          className={cn(
                            'px-2 py-1.5 rounded text-[10px] font-display font-bold text-left transition-all border',
                            noteEdit.estadoEquipo === opt.value
                              ? cn('text-white border-transparent', opt.bg)
                              : 'text-slate-400 border-slate-700 bg-slate-800/60 hover:border-slate-600',
                          )}
                        >
                          {opt.value}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notas de campo */}
                  <div>
                    <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                      Notas de campo
                    </Label>
                    <Textarea
                      value={noteEdit.notes}
                      onChange={(e) =>
                        setNoteEdit((n) => ({ ...n, notes: e.target.value }))
                      }
                      placeholder="Describe el avance o condición observada..."
                      rows={3}
                      className="bg-slate-800 border-slate-700 text-slate-200 text-xs mt-1.5 resize-none"
                    />
                  </div>

                  {/* Hallazgos */}
                  <div>
                    <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                      Hallazgos / Observaciones
                    </Label>
                    <Textarea
                      value={noteEdit.hallazgos}
                      onChange={(e) =>
                        setNoteEdit((n) => ({ ...n, hallazgos: e.target.value }))
                      }
                      placeholder="Defectos, no conformidades, pendientes..."
                      rows={3}
                      className="bg-slate-800 border-slate-700 text-slate-200 text-xs mt-1.5 resize-none"
                    />
                  </div>

                  {/* Autor */}
                  <div>
                    <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                      Autor de la nota
                    </Label>
                    <Input
                      value={noteEdit.autorNota}
                      onChange={(e) =>
                        setNoteEdit((n) => ({ ...n, autorNota: e.target.value }))
                      }
                      placeholder="Nombre del inspector"
                      className="bg-slate-800 border-slate-700 text-slate-200 text-xs mt-1.5 h-8"
                    />
                  </div>

                  {/* Etiquetas */}
                  <div>
                    <Label className="text-[10px] font-display tracking-widest text-slate-400 uppercase">
                      Etiquetas
                    </Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {ETIQUETAS_OPTIONS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() =>
                            setNoteEdit((n) => ({
                              ...n,
                              etiquetas: n.etiquetas.includes(tag)
                                ? n.etiquetas.filter((t) => t !== tag)
                                : [...n.etiquetas, tag],
                            }))
                          }
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] transition-all border',
                            noteEdit.etiquetas.includes(tag)
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                              : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600',
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Panel actions */}
                <div className="shrink-0 p-4 border-t border-slate-800 space-y-2">
                  <Button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs"
                  >
                    {savingNote ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar notas
                  </Button>
                  <div className="flex gap-2">
                    <a
                      href={currentPhoto.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors text-[10px]"
                    >
                      <Download className="w-3 h-3" /> Descargar
                    </a>
                    {isAdmin && (
                      <button
                        disabled={deleting === currentPhoto.id}
                        onClick={() => handleDelete(currentPhoto)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors text-[10px] disabled:opacity-50"
                      >
                        {deleting === currentPhoto.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Info + actions bar (hidden when note panel is open) ────────── */}
          {!showNotePanel && (
            <div
              className="shrink-0 px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-mono text-slate-400"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-slate-200 font-medium">{currentPhoto.fileName}</span>
              <span className="text-slate-700">·</span>
              <span className="text-cyan-400">{fmtSize(currentPhoto.fileSizeKb)}</span>
              {currentPhoto.originalSizeKb > currentPhoto.fileSizeKb && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-emerald-400">
                    {Math.round(
                      (1 - currentPhoto.fileSizeKb / currentPhoto.originalSizeKb) * 100,
                    )}
                    % comprimido
                  </span>
                </>
              )}
              {currentPhoto.width > 0 && (
                <>
                  <span className="text-slate-700">·</span>
                  <span>
                    {currentPhoto.width}×{currentPhoto.height} px
                  </span>
                </>
              )}
              {currentPhoto.contratista && currentPhoto.contratista !== 'Sin asignar' && (
                <>
                  <span className="text-slate-700">·</span>
                  <Badge className="text-[9px] bg-slate-800 text-slate-300 border-slate-700">
                    {currentPhoto.contratista}
                  </Badge>
                </>
              )}
              {currentPhoto.notes && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-amber-300 italic truncate max-w-xs">
                    {currentPhoto.notes}
                  </span>
                </>
              )}
              {currentPhoto.hallazgos && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-orange-400 italic truncate max-w-xs">
                    ⚠ {currentPhoto.hallazgos}
                  </span>
                </>
              )}
              <span className="text-slate-700">·</span>
              <span className="text-slate-500">por {currentPhoto.uploadedByName}</span>
              <span className="text-slate-700 mx-1">|</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openNotePanel();
                }}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
              >
                <Edit3 className="w-3 h-3" /> Editar notas
              </button>
              <span className="text-slate-700">·</span>
              <a
                href={currentPhoto.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-3 h-3" /> Descargar
              </a>
              {isAdmin && (
                <>
                  <span className="text-slate-700">·</span>
                  <button
                    disabled={deleting === currentPhoto.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(currentPhoto);
                    }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {deleting === currentPhoto.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Filmstrip ─────────────────────────────────────────────────── */}
          <div
            ref={filmstripRef}
            className="shrink-0 flex gap-2 px-4 pb-4 pt-1 overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setLightboxIdx(i)}
                className={cn(
                  'shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all duration-150',
                  i === lightboxIdx
                    ? 'border-cyan-400 scale-110 shadow-lg shadow-cyan-500/30'
                    : 'border-transparent opacity-50 hover:opacity-80 hover:border-slate-500',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.downloadUrl}
                  alt={p.fileName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
