import { useState, useCallback } from "react";
import { collection, doc, setDoc, updateDoc, query, where, orderBy, getDocs, deleteDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { NonConformity, NCFormData, NCStatus, NC_STATUS_LABELS } from "@/lib/quality-types";
import { useToast } from "@/hooks/use-toast";

export function useNonConformities(projectCode?: string) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [ncs, setNcs] = useState<NonConformity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNcs = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      let q = collection(firestore, "quality_ncs");
      if (projectCode) {
        q = query(q, where("project_code", "==", projectCode)) as any;
      }
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ ...doc.data() } as NonConformity));
      // Sort desc by creation_date
      data.sort((a, b) => new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime());
      setNcs(data);
    } catch (err) {
      console.error("Error fetching NCs:", err);
      toast({ variant: "destructive", title: "ERROR", description: "No se pudieron cargar los hallazgos." });
    } finally {
      setLoading(false);
    }
  }, [firestore, projectCode, toast]);

  const generateNcId = (count: number) => {
    const year = new Date().getFullYear();
    const padCount = String(count + 1).padStart(4, "0");
    return `NC-${year}-${padCount}`;
  };

  const createNc = async (data: NCFormData) => {
    if (!firestore || !user) return null;
    try {
      setLoading(true);
      // Fetch latest to determine ID
      const allSnapshot = await getDocs(collection(firestore, "quality_ncs"));
      const newId = data.nc_id || generateNcId(allSnapshot.size);

      const newNc: NonConformity = {
        ...data,
        nc_id: newId,
        status: "abierto",
        reported_by: user.displayName || "Ingeniero",
        reported_by_uid: user.uid,
        creation_date: new Date().toISOString(),
      };

      await setDoc(doc(firestore, "quality_ncs", newId), newNc);
      toast({ title: "NC CREADA", description: `Hallazgo ${newId} registrado correctamente.` });
      
      // Update local state without re-fetching everything
      setNcs(prev => [newNc, ...prev]);
      return newId;
    } catch (err) {
      console.error("Error creating NC:", err);
      toast({ variant: "destructive", title: "ERROR", description: "No se pudo crear la No Conformidad." });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateNcStatus = async (ncId: string, newStatus: NCStatus, observations?: string, rootCause?: string, correctionPlan?: string) => {
    if (!firestore) return;
    try {
      const updateData: Partial<NonConformity> = { status: newStatus };
      if (newStatus === "cerrado") {
        updateData.closure_date = new Date().toISOString();
      }
      if (observations) updateData.observations = observations;
      if (rootCause) updateData.root_cause = rootCause;
      if (correctionPlan) updateData.correction_plan = correctionPlan;

      await updateDoc(doc(firestore, "quality_ncs", ncId), updateData);
      
      toast({ title: "ESTADO ACTUALIZADO", description: `NC ${ncId} ahora está ${NC_STATUS_LABELS[newStatus]}.` });
      
      // Update local state
      setNcs(prev => prev.map(nc => nc.nc_id === ncId ? { ...nc, ...updateData } : nc));
    } catch (err) {
      console.error("Error updating NC:", err);
      toast({ variant: "destructive", title: "ERROR", description: "No se pudo actualizar la NC." });
    }
  };


  // Borrar NC por ID
  const deleteNc = async (ncId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "quality_ncs", ncId));
      toast({ title: "NC ELIMINADA", description: `NC ${ncId} eliminada correctamente.` });
      setNcs(prev => prev.filter(nc => nc.nc_id !== ncId));
    } catch (err) {
      console.error("Error deleting NC:", err);
      toast({ variant: "destructive", title: "ERROR", description: "No se pudo eliminar la NC." });
    }
  };

  return {
    ncs,
    loading,
    fetchNcs,
    createNc,
    updateNcStatus,
    deleteNc,
  };
}
