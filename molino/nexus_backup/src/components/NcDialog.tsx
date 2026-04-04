"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NCFormData, NCSeverity, NCOrigin, NC_SEVERITY_LABELS, NC_ORIGIN_LABELS } from "@/lib/quality-types";
import { PLANT_EQUIPMENT } from "@/lib/mill-plant-data";
import { ShieldAlert, Send } from "lucide-react";

interface NcDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NCFormData) => Promise<boolean>;
  initialData?: Partial<NCFormData>;
}

export function NcDialog({ open, onOpenChange, onSubmit, initialData }: NcDialogProps) {
  const [formData, setFormData] = useState<Partial<NCFormData>>(initialData || {});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens with new initialData
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && initialData) {
      setFormData(initialData);
    } else if (!isOpen) {
      setFormData({});
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_code || !formData.title || !formData.description || !formData.severity || !formData.origin) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit(formData as NCFormData);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#0A0E14] border-red-500/20 max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader className="border-b border-red-500/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-red-500 font-display text-sm uppercase tracking-widest">
                Registrar Hallazgo (NC)
              </DialogTitle>
              <p className="text-[10px] font-mono-tech text-red-400/50 mt-1">Formulario de reporte de Producto No Conforme</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 focus-within:text-red-400 text-primary/50 transition-colors">
              <label className="text-[9px] font-display uppercase tracking-widest">Código de Proyecto *</label>
              <Input
                required
                value={formData.project_code || ""}
                onChange={e => setFormData(p => ({ ...p, project_code: e.target.value.toUpperCase() }))}
                className="bg-primary/[0.02] border-primary/20 focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500/50 h-9 rounded-none font-mono-tech text-xs placeholder:text-primary/20"
                placeholder="Ej. PRJ-2026"
              />
            </div>
            <div className="space-y-1.5 focus-within:text-red-400 text-primary/50 transition-colors">
              <label className="text-[9px] font-display uppercase tracking-widest">Severidad *</label>
              <Select required value={formData.severity} onValueChange={(val: NCSeverity) => setFormData(p => ({ ...p, severity: val }))}>
                <SelectTrigger className="bg-primary/[0.02] border-primary/20 h-9 rounded-none font-mono-tech text-xs">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-[#020617] border-primary/20 rounded-none">
                  {Object.entries(NC_SEVERITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="font-mono-tech text-xs uppercase cursor-pointer hover:bg-primary/10">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 focus-within:text-red-400 text-primary/50 transition-colors">
            <label className="text-[9px] font-display uppercase tracking-widest">Título del Hallazgo *</label>
            <Input
              required
              value={formData.title || ""}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              className="bg-primary/[0.02] border-primary/20 focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500/50 h-9 rounded-none font-mono-tech text-xs"
              placeholder="Descripción breve del problema"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 focus-within:text-red-400 text-primary/50 transition-colors">
              <label className="text-[9px] font-display uppercase tracking-widest">Origen *</label>
              <Select required value={formData.origin} onValueChange={(val: NCOrigin) => setFormData(p => ({ ...p, origin: val }))}>
                <SelectTrigger className="bg-primary/[0.02] border-primary/20 h-9 rounded-none font-mono-tech text-xs">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-[#020617] border-primary/20 rounded-none">
                  {Object.entries(NC_ORIGIN_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="font-mono-tech text-xs uppercase cursor-pointer hover:bg-primary/10">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5 focus-within:text-red-400 text-primary/50 transition-colors">
              <label className="text-[9px] font-display uppercase tracking-widest">Equipo / TAG (Opcional)</label>
              <Select
                value={formData.related_equipment || "__none__"}
                onValueChange={(val) =>
                  setFormData(p => ({ ...p, related_equipment: val === "__none__" ? undefined : val }))
                }
              >
                <SelectTrigger className="bg-primary/[0.02] border-primary/20 h-9 rounded-none font-mono-tech text-xs">
                  <SelectValue placeholder="Seleccionar equipo..." />
                </SelectTrigger>
                <SelectContent className="bg-[#020617] border-primary/20 rounded-none max-h-60">
                  <SelectItem value="__none__" className="font-mono-tech text-xs text-white/40">— Sin equipo —</SelectItem>
                  {PLANT_EQUIPMENT.map((eq) => (
                    <SelectItem
                      key={eq.tag}
                      value={eq.tag}
                      className="font-mono-tech text-xs cursor-pointer hover:bg-primary/10"
                    >
                      <span className="font-bold text-orange-400">{eq.tag}</span>
                      <span className="text-white/50 ml-2">— {eq.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 focus-within:text-red-400 text-primary/50 transition-colors">
            <label className="text-[9px] font-display uppercase tracking-widest">Descripción Detallada *</label>
            <Textarea
              required
              value={formData.description || ""}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              className="bg-primary/[0.02] border-primary/20 focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500/50 min-h-[100px] resize-none rounded-none font-mono-tech text-xs"
              placeholder="Describa el hallazgo o desviación..."
            />
          </div>

          {formData.related_document_id && (
            <div className="pt-2 text-[10px] font-mono-tech text-red-400/80 p-2 bg-red-500/5 border border-red-500/10">
              <span className="font-bold">Doc Relacionado:</span> {formData.related_document_id}
            </div>
          )}

          <div className="pt-4 border-t border-red-500/10 flex justify-end gap-3">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-none bg-transparent hover:bg-primary/5 text-primary border border-primary/20 font-display text-[10px] tracking-widest uppercase h-10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-none bg-red-600 hover:bg-red-500 text-white font-display text-[10px] tracking-widest uppercase h-10 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all duration-300 disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? "Registrando..." : "Registrar NC"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
