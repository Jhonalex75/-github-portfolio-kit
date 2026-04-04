"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, AlertTriangle, FileWarning, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DocumentType, Discipline, DOCUMENT_TYPE_LABELS, DISCIPLINE_LABELS,
  DEFAULT_PROJECT, ProjectDocumentFormData,
  isAllowedFileType, isFileSizeAllowed, formatFileSize,
  MAX_FILE_SIZE_BYTES, ALLOWED_FILE_EXTENSIONS,
} from "@/lib/project-data-types";

interface UploadDialogProps {
  onSubmit: (formData: ProjectDocumentFormData, file: File) => void;
  isUploading: boolean;
}

const INITIAL_FORM: ProjectDocumentFormData = {
  document_id: "",
  project_code: DEFAULT_PROJECT.code,
  project_name: DEFAULT_PROJECT.name,
  client: DEFAULT_PROJECT.client,
  contractor: DEFAULT_PROJECT.contractor,
  document_type: "procedimiento",
  title: "",
  revision: "Rev.0",
  discipline: "mecánica",
  tags: "",
  observations: "",
  related_equipment: "",
};

export function UploadDialog({ onSubmit, isUploading }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProjectDocumentFormData>({ ...INITIAL_FORM });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const updateField = (field: keyof ProjectDocumentFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setFileError(null);
    if (!selected) { setFile(null); return; }
    if (!isAllowedFileType(selected.name)) {
      setFileError(`Tipo no permitido. Acepta: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`);
      setFile(null); return;
    }
    if (!isFileSizeAllowed(selected.size)) {
      setFileError(`Archivo excede ${formatFileSize(MAX_FILE_SIZE_BYTES)}. Comprima el documento.`);
      setFile(null); return;
    }
    setFile(selected);
  };

  const isValid = form.project_code && form.title && form.revision && form.discipline && form.document_type && file && !fileError;

  const handleSubmit = () => {
    if (!isValid || !file) return;
    onSubmit(form, file);
    setForm({ ...INITIAL_FORM });
    setFile(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground rounded-none h-11 px-6 font-display text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(0,229,255,0.3)] relative overflow-hidden group">
          <Plus className="w-4 h-4 mr-2" />
          <span>Registrar Documento</span>
          <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0A0E14] border-primary/20 max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide backdrop-blur-xl">
        <DialogHeader className="border-b border-primary/10 pb-4">
          <DialogTitle className="text-primary font-display text-sm uppercase tracking-widest flex items-center gap-2">
            <Upload className="w-4 h-4" /> Registro de Documento Técnico
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* FILE SELECTOR */}
          <div className="space-y-2">
            <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Archivo *</Label>
            <div className={cn(
              "border-2 border-dashed rounded-sm p-4 text-center transition-all cursor-pointer hover:border-primary/50",
              file ? "border-emerald-500/40 bg-emerald-500/5" : "border-primary/20 bg-primary/[0.02]",
              fileError ? "border-red-500/40 bg-red-500/5" : ""
            )}>
              <input type="file" className="hidden" id="doc-file-input" onChange={handleFileSelect}
                accept={ALLOWED_FILE_EXTENSIONS.map(e => `.${e}`).join(",")} />
              <label htmlFor="doc-file-input" className="cursor-pointer block">
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-xs font-display text-emerald-400 uppercase">{file.name}</p>
                      <p className="text-[10px] font-mono-tech text-emerald-400/60">{formatFileSize(file.size)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:bg-red-500/10"
                      onClick={(e) => { e.preventDefault(); setFile(null); }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="py-2">
                    <Upload className="w-8 h-8 mx-auto text-primary/30 mb-2" />
                    <p className="text-[10px] font-mono-tech text-primary/50 uppercase">Click para seleccionar archivo</p>
                    <p className="text-[9px] font-mono-tech text-primary/30 mt-1">
                      {ALLOWED_FILE_EXTENSIONS.join(" · ")} — Máx {formatFileSize(MAX_FILE_SIZE_BYTES)}
                    </p>
                  </div>
                )}
              </label>
            </div>
            {fileError && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/5 border border-red-500/20 p-2">
                <FileWarning className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-mono-tech">{fileError}</span>
              </div>
            )}
          </div>

          {/* ROW: Project Code + Project Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Código Proyecto *</Label>
              <Input value={form.project_code} onChange={(e) => updateField("project_code", e.target.value)}
                className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9" placeholder="AMM_OC_20000" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Nombre Proyecto</Label>
              <Input value={form.project_name} onChange={(e) => updateField("project_name", e.target.value)}
                className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9" />
            </div>
          </div>

          {/* ROW: Client + Contractor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Cliente</Label>
              <Input value={form.client} onChange={(e) => updateField("client", e.target.value)}
                className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Contratista</Label>
              <Input value={form.contractor} onChange={(e) => updateField("contractor", e.target.value)}
                className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Título del Documento *</Label>
            <Input value={form.title} onChange={(e) => updateField("title", e.target.value)}
              className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9"
              placeholder="Procedimiento de reparación de bridas..." />
          </div>

          {/* ROW: Type + Discipline + Revision */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Tipo *</Label>
              <Select value={form.document_type} onValueChange={(v) => updateField("document_type", v)}>
                <SelectTrigger className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0E14] border-primary/20">
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Disciplina *</Label>
              <Select value={form.discipline} onValueChange={(v) => updateField("discipline", v)}>
                <SelectTrigger className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0E14] border-primary/20">
                  {Object.entries(DISCIPLINE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Revisión *</Label>
              <Input value={form.revision} onChange={(e) => updateField("revision", e.target.value)}
                className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9" placeholder="Rev.0" />
            </div>
          </div>

          {/* Document ID (optional) + Equipment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">
                Document ID <span className="text-primary/30">(auto si vacío)</span>
              </Label>
              <Input value={form.document_id || ""} onChange={(e) => updateField("document_id", e.target.value)}
                className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9" placeholder="PR-MEC-001" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Equipo Relacionado</Label>
              <Input value={form.related_equipment} onChange={(e) => updateField("related_equipment", e.target.value)}
                className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9" placeholder="HRT-035 Thickener" />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">
              Tags <span className="text-primary/30">(separados por coma)</span>
            </Label>
            <Input value={form.tags} onChange={(e) => updateField("tags", e.target.value)}
              className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9"
              placeholder="brida, epóxico, molino, reparación" />
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Observaciones</Label>
            <Textarea value={form.observations} onChange={(e) => updateField("observations", e.target.value)}
              className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs min-h-[60px] resize-none" />
          </div>

          {/* SUBMIT */}
          <Button onClick={handleSubmit} disabled={!isValid || isUploading}
            className={cn(
              "w-full rounded-none h-12 font-display text-[10px] uppercase tracking-widest relative overflow-hidden transition-all",
              isValid
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "bg-primary/10 text-primary/30 cursor-not-allowed"
            )}>
            {!isValid && <AlertTriangle className="w-4 h-4 mr-2" />}
            {isValid ? "REGISTRAR EN BÓVEDA DOCUMENTAL" : "COMPLETE CAMPOS OBLIGATORIOS"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
