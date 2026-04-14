'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EquipmentTag {
  id: string;
  tag: string;
  description: string;
  type: string;
  createdBy: string;
  createdAt: Timestamp;
  photoCount: number;
}

interface PhotoMeta {
  id: string;
  tag: string;
  date: string;
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Timestamp;
  fileSizeKb: number;
  originalSizeKb: number;
  notes: string;
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
  { value: 'standard' as const, label: 'Estándar', desc: '1920 px · ~600 KB', maxPx: 1920, q: 0.82 },
  { value: 'hd' as const, label: 'Alta Calidad', desc: '3840 px · ~2.5 MB', maxPx: 3840, q: 0.90 },
  { value: 'original' as const, label: 'Original', desc: 'Sin compresión', maxPx: 0, q: 1 },
];

type Quality = 'standard' | 'hd' | 'original';

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
            resolve({ compressed: new File([blob], name, { type: 'image/jpeg' }), width: w, height: h });
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

  // ── State ──────────────────────────────────────────────────────────────────
  const [tags, setTags] = useState<EquipmentTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadQuality, setUploadQuality] = useState<Quality>('standard');
  const [uploadNote, setUploadNote] = useState('');
  const [uploadContractor, setUploadContractor] = useState('Sin asignar');
  const [uploading, setUploading] = useState(false);

  // New TAG modal
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagId, setNewTagId] = useState('');
  const [newTagDesc, setNewTagDesc] = useState('');
  const [newTagType, setNewTagType] = useState('');
  const [savingTag, setSavingTag] = useState(false);

  // Lightbox
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

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
          orderBy('uploadedAt', 'desc'),
        ),
      );
      setPhotos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PhotoMeta)));
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
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
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
      if (e.key === 'Escape') setLightboxIdx(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, photos.length]);

  // ── Create TAG ─────────────────────────────────────────────────────────────
  const handleCreateTag = async () => {
    if (!firestore || !newTagId.trim()) return;
    setSavingTag(true);
    try {
      const tag = newTagId.trim().toUpperCase();
      const tagDoc = {
        tag,
        description: newTagDesc.trim(),
        type: newTagType || 'Otro',
        createdBy: user?.uid ?? '',
        createdAt: Timestamp.now(),
        photoCount: 0,
      };
      await setDoc(doc(firestore, 'equipment_photo_tags', tag), tagDoc);
      const newEntry: EquipmentTag = { id: tag, ...tagDoc };
      setTags((prev) => [...prev, newEntry].sort((a, b) => a.tag.localeCompare(b.tag)));
      setSelectedTag(tag);
      setTagSearch(tag);
      setShowNewTag(false);
      setShowTagDropdown(false);
      setNewTagId('');
      setNewTagDesc('');
      setNewTagType('');
      toast({ title: 'TAG creado', description: `${tag} registrado. La carpeta se crea automáticamente al subir la primera foto.` });
    } catch {
      toast({ title: 'Error al crear TAG', variant: 'destructive' });
    } finally {
      setSavingTag(false);
    }
  };

  // ── File selection ─────────────────────────────────────────────────────────
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items: UploadItem[] = Array.from(files).map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: 'pending',
      progress: 0,
      compressedSizeKb: 0,
      originalSizeKb: Math.round(f.size / 1024),
    }));
    setUploadItems((prev) => {
      const existing = prev.filter((p) => p.status !== 'done');
      return [...existing, ...items];
    });
    setShowUpload(true);
  };

  // ── Cleanup preview URLs on modal close ───────────────────────────────────
  const closeUploadModal = () => {
    uploadItems.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setShowUpload(false);
    setUploadItems([]);
  };

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!storage || !firestore || !selectedTag) return;
    const pending = uploadItems.filter((i) => i.status === 'pending');
    if (pending.length === 0) return;

    const qOpt = QUALITY_OPTIONS.find((q) => q.value === uploadQuality)!;
    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < uploadItems.length; i++) {
      if (uploadItems[i].status !== 'pending') continue;

      // Compressing
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

        // Build storage path: equipment_photos/{TAG}/{YYYY-MM-DD}/{ts}_{name}
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
                contratista: uploadContractor,
                compressed: uploadQuality !== 'original',
                width,
                height,
              });
              // Increment counter (best-effort)
              updateDoc(doc(firestore, 'equipment_photo_tags', selectedTag), {
                photoCount: increment(1),
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

  // ── Delete ─────────────────────────────────────────────────────────────────
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

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredTags = tags.filter(
    (t) =>
      !tagSearch ||
      t.tag.toLowerCase().includes(tagSearch.toLowerCase()) ||
      (t.description ?? '').toLowerCase().includes(tagSearch.toLowerCase()),
  );

  const showCreateNew =
    tagSearch.trim().length >= 2 &&
    !tags.some((t) => t.tag.toLowerCase() === tagSearch.trim().toLowerCase());

  const navigateDate = (delta: number) => {
    const d = parseISO(selectedDate);
    setSelectedDate(format(delta > 0 ? addDays(d, 1) : subDays(d, 1), 'yyyy-MM-dd'));
  };

  const selectedTagObj = tags.find((t) => t.tag === selectedTag);
  const totalMb = (photos.reduce((s, p) => s + p.fileSizeKb, 0) / 1024).toFixed(1);

  // ─────────────────────────────────────────────────────────────────────────
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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-black tracking-widest uppercase text-cyan-400">
                GALERÍA DE CAMPO
              </h1>
              <p className="text-xs text-slate-500 font-mono tracking-wider mt-1">
                Registro fotográfico por equipo · Firebase Storage
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
            {/* Hidden file input — accepts images + direct camera on mobile */}
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
            {/* ── Left panel ──────────────────────────────────────────────── */}
            <div className="space-y-4">
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
                          placeholder="Buscar TAG..."
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
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-2xl z-50 max-h-64 overflow-y-auto">
                        {loadingTags ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          </div>
                        ) : (
                          <>
                            {filteredTags.map((t) => (
                              <button
                                key={t.id}
                                className={cn(
                                  'w-full text-left px-3 py-2.5 hover:bg-slate-700 transition-colors flex items-center justify-between group',
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
                                      selectedTag === t.tag ? 'text-cyan-400' : 'text-slate-200',
                                    )}
                                  >
                                    {t.tag}
                                  </p>
                                  {t.description && (
                                    <p className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                      {t.description}
                                    </p>
                                  )}
                                </div>
                                <Badge className="text-[9px] bg-slate-700 text-slate-400 border-none ml-2 shrink-0">
                                  {t.photoCount ?? 0}
                                </Badge>
                              </button>
                            ))}

                            {/* Create new option */}
                            {showCreateNew && (
                              <button
                                className="w-full text-left px-3 py-2.5 bg-cyan-500/5 hover:bg-cyan-500/15 transition-colors flex items-center gap-2 border-t border-slate-700"
                                onClick={() => {
                                  setNewTagId(tagSearch.toUpperCase());
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

                            {filteredTags.length === 0 && !showCreateNew && (
                              <p className="text-xs text-slate-500 text-center py-5">
                                No se encontraron TAGs
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected TAG info card */}
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
                      <p className="text-[10px] text-slate-500 mt-1">
                        {selectedTagObj.photoCount ?? 0} fotos en total
                      </p>
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
                    {format(parseISO(selectedDate), "EEEE d 'de' MMMM yyyy", { locale: es })}
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
                          fotos hoy
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
                    {/* Quick upload from stats panel */}
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 text-xs"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Agregar fotos al día
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── Right panel: Gallery ─────────────────────────────────────── */}
            <div>
              {!selectedTag ? (
                <div className="flex flex-col items-center justify-center h-72 border border-dashed border-slate-700/60 rounded-xl gap-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center">
                    <Tag className="w-7 h-7 text-slate-600" />
                  </div>
                  <p className="text-slate-500 text-sm font-mono">Selecciona un TAG para ver las fotos</p>
                  <p className="text-slate-600 text-xs">o crea uno nuevo con el botón +</p>
                </div>
              ) : loadingPhotos ? (
                <div className="flex items-center justify-center h-72">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                </div>
              ) : photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-72 border border-dashed border-slate-700/40 rounded-xl gap-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 text-slate-600" />
                  </div>
                  <p className="text-slate-500 text-sm font-mono">Sin fotos para este TAG y fecha</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-cyan-400 hover:text-cyan-300 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" /> Subir la primera foto
                  </Button>
                </div>
              ) : (
                <>
                  {/* Gallery header */}
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="text-xs font-display font-black text-slate-400 uppercase tracking-widest">
                      {selectedTag}
                    </span>
                    <span className="text-slate-700">/</span>
                    <span className="text-xs font-mono text-slate-500">{selectedDate}</span>
                    <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">
                      {photos.length} foto{photos.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px]">
                      {totalMb} MB
                    </Badge>
                  </div>

                  {/* Photo grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {photos.map((photo, idx) => (
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
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-[9px] text-slate-300 font-mono truncate">
                              {photo.fileName}
                            </p>
                            <p className="text-[9px] text-slate-400">{fmtSize(photo.fileSizeKb)}</p>
                          </div>
                          <Eye className="absolute top-2 right-2 w-4 h-4 text-white/60" />
                        </div>
                        {/* Contractor badge */}
                        {photo.contratista && photo.contratista !== 'Sin asignar' && (
                          <Badge className="absolute top-1.5 left-1.5 text-[8px] bg-black/70 text-white border-none backdrop-blur-sm px-1.5 py-0.5">
                            {photo.contratista}
                          </Badge>
                        )}
                        {/* Note indicator */}
                        {photo.notes && (
                          <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400/80" title={photo.notes} />
                        )}
                      </div>
                    ))}
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
                placeholder="ej: TK-005, SAG-SHELL, FB-03"
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
                placeholder="ej: Tanque de agua potable N°5"
                className="bg-slate-800 border-slate-700 text-slate-200 mt-1"
              />
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
                    <SelectItem key={t} value={t} className="text-slate-200 hover:bg-slate-700">
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
          Modal: Subir fotos
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showUpload}
        onOpenChange={(v) => {
          if (!uploading && !v) closeUploadModal();
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-black tracking-widest uppercase text-cyan-400 flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4" /> SUBIR FOTOS
            </DialogTitle>
            <p className="text-[10px] text-slate-500 font-mono">
              {selectedTag} · {selectedDate} ·{' '}
              {uploadItems.length} archivo{uploadItems.length !== 1 ? 's' : ''} seleccionado{uploadItems.length !== 1 ? 's' : ''}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* File list */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-700">
              {uploadItems.map((item, i) => (
                <div
                  key={i}
                  className="bg-slate-800/80 rounded-md p-2 flex items-center gap-3 border border-slate-700/40"
                >
                  {/* Thumbnail preview */}
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
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">{item.progress}%</span>
                      </div>
                    )}
                    {item.status === 'compressing' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-300 truncate">{item.file.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500">{fmtSize(item.originalSizeKb)} original</span>
                      {item.compressedSizeKb > 0 && item.status !== 'pending' && (
                        <>
                          <span className="text-slate-700">→</span>
                          <span className="text-[10px] text-cyan-500">
                            {fmtSize(item.compressedSizeKb)} comprimido
                          </span>
                          <span className="text-[10px] text-emerald-400">
                            ({Math.round((1 - item.compressedSizeKb / item.originalSizeKb) * 100)}% menos)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Status badge */}
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

            {/* Add more */}
            {!uploading && (
              <button
                className="w-full border border-dashed border-slate-700 rounded-md py-3 flex items-center justify-center gap-2 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-4 h-4" /> Agregar más fotos
              </button>
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
                  Nota
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

          <DialogFooter>
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
          Lightbox
      ══════════════════════════════════════════════════════════════════════ */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div
          className="fixed inset-0 bg-black/96 z-50 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10 bg-black/40 rounded-full p-2"
            onClick={() => setLightboxIdx(null)}
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/50 text-xs font-mono z-10">
            {lightboxIdx + 1} / {photos.length}
          </div>

          {/* Nav prev */}
          {lightboxIdx > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors z-10 bg-black/50 rounded-full p-3 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((i) => (i ?? 1) - 1);
              }}
              aria-label="Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Nav next */}
          {lightboxIdx < photos.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors z-10 bg-black/50 rounded-full p-3 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx((i) => (i ?? 0) + 1);
              }}
              aria-label="Siguiente"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <div
            className="flex flex-col items-center max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIdx].downloadUrl}
              alt={photos[lightboxIdx].fileName}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />

            {/* Info bar */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-slate-400">
              <span className="text-slate-300">{photos[lightboxIdx].fileName}</span>
              <span className="text-slate-700">·</span>
              <span>{fmtSize(photos[lightboxIdx].fileSizeKb)}</span>
              {photos[lightboxIdx].originalSizeKb > photos[lightboxIdx].fileSizeKb && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-emerald-400">
                    {Math.round(
                      (1 - photos[lightboxIdx].fileSizeKb / photos[lightboxIdx].originalSizeKb) * 100,
                    )}
                    % comprimido
                  </span>
                </>
              )}
              {photos[lightboxIdx].width > 0 && (
                <>
                  <span className="text-slate-700">·</span>
                  <span>
                    {photos[lightboxIdx].width}×{photos[lightboxIdx].height} px
                  </span>
                </>
              )}
              {photos[lightboxIdx].contratista &&
                photos[lightboxIdx].contratista !== 'Sin asignar' && (
                  <>
                    <span className="text-slate-700">·</span>
                    <Badge className="text-[9px] bg-slate-800 text-slate-300 border-slate-700">
                      {photos[lightboxIdx].contratista}
                    </Badge>
                  </>
                )}
              {photos[lightboxIdx].notes && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-amber-300 italic">{photos[lightboxIdx].notes}</span>
                </>
              )}
              <span className="text-slate-700">·</span>
              <span>por {photos[lightboxIdx].uploadedByName}</span>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-3">
              <a
                href={photos[lightboxIdx].downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors bg-slate-800/90 px-3 py-1.5 rounded-md border border-slate-700 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-3.5 h-3.5" /> Descargar
              </a>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deleting === photos[lightboxIdx].id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photos[lightboxIdx]);
                  }}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-8 px-3 border border-red-500/20"
                >
                  {deleting === photos[lightboxIdx].id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Eliminar
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
