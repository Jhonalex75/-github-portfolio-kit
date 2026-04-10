import { useState, useCallback } from "react";
import {
  collection, doc, setDoc, getDocs, updateDoc,
  addDoc, query, orderBy,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getApp } from "firebase/app";
import { useFirestore, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  EquipmentRecord, AssemblyActivity,
  OperationalStatus, ActivityType, ActivityStatus,
  OPERATIONAL_STATUS_LABELS, NewActivityData,
  AssemblyStep, PunchListItem, PunchDiscipline, PunchPriority, PunchStatus,
} from "@/lib/quality-types";
import { MILL_ASSEMBLY_PLANS } from "@/lib/mill-plant-data";

const ACTIVE_PROJECT = 'default-nexus-project';

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useEquipmentRecords() {
  const firestore   = useFirestore();
  const { user }    = useUser();
  const { toast }   = useToast();

  const [records,        setRecords]        = useState<Record<string, EquipmentRecord>>({});
  const [activities,     setActivities]     = useState<AssemblyActivity[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [assemblySteps,  setAssemblySteps]  = useState<AssemblyStep[]>([]);
  const [stepsLoading,   setStepsLoading]   = useState(false);
  const [punchList,      setPunchList]      = useState<PunchListItem[]>([]);
  const [punchLoading,   setPunchLoading]   = useState(false);

  // ── Fetch all equipment records ─────────────────────────────────────────
  const fetchAllRecords = useCallback(async () => {
    if (!firestore) return;
    try {
      const snap = await getDocs(collection(firestore, "projects", ACTIVE_PROJECT, "equipment_records"));
      const data: Record<string, EquipmentRecord> = {};
      snap.docs.forEach(d => { data[d.id] = d.data() as EquipmentRecord; });
      setRecords(data);
    } catch (err) {
      console.error("useEquipmentRecords.fetchAllRecords:", err);
    }
  }, [firestore]);

  // ── Update operational status ───────────────────────────────────────────
  const updateOperationalStatus = useCallback(
    async (tag: string, status: OperationalStatus) => {
      if (!firestore || !user) return;
      try {
        const record: EquipmentRecord = {
          tag,
          operational_status: status,
          last_updated: new Date().toISOString(),
          updated_by: user.displayName || user.email || "Ingeniero",
        };
        await setDoc(doc(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag), record, { merge: true });
        setRecords(prev => ({ ...prev, [tag]: record }));
        toast({ title: "ESTADO ACTUALIZADO", description: `${tag} → ${OPERATIONAL_STATUS_LABELS[status]}` });
      } catch (err) {
        console.error("useEquipmentRecords.updateOperationalStatus:", err);
        toast({ variant: "destructive", title: "ERROR", description: "No se pudo actualizar el estado operacional." });
      }
    },
    [firestore, user, toast],
  );

  // ── Fetch activities for one equipment ─────────────────────────────────
  const fetchActivities = useCallback(async (tag: string) => {
    if (!firestore) return;
    setLoading(true);
    try {
      const q = query(
        collection(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "assembly_activities"),
        orderBy("date", "desc"),
      );
      const snap = await getDocs(q);
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssemblyActivity)));
    } catch (err) {
      console.error("useEquipmentRecords.fetchActivities:", err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [firestore]);

  // ── Add activity ────────────────────────────────────────────────────────
  const addActivity = useCallback(
    async (tag: string, data: NewActivityData): Promise<string | null> => {
      if (!firestore) return null;
      if (!user) {
        toast({ variant: "destructive", title: "ERROR", description: "No hay sesión activa. Por favor inicie sesión." });
        return null;
      }
      try {
        // Ensure the equipment record exists in the correctly prefixed path
        await setDoc(doc(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag), { tag }, { merge: true });
        
        const payload = {
          ...data,
          equipment_tag:  tag,
          photo_urls:     [] as string[],
          photo_paths:    [] as string[],
          created_by:     user.displayName || user.email || "Ingeniero",
          created_by_uid: user.uid,
          created_at:     new Date().toISOString(),
        };
        const docRef = await addDoc(
          collection(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "assembly_activities"),
          payload,
        );
        const newActivity: AssemblyActivity = { id: docRef.id, ...payload };
        setActivities(prev => [newActivity, ...prev]);
        toast({ title: "ACTIVIDAD REGISTRADA", description: `Actividad agregada al equipo ${tag}.` });
        return docRef.id;
      } catch (err: any) {
        console.error("useEquipmentRecords.addActivity:", err);
        const errMsg = err?.message || "Error desconocido";
        toast({ 
          variant: "destructive", 
          title: "ERROR", 
          description: `No se pudo registrar la actividad: ${errMsg}` 
        });
        return null;
      }
    },
    [firestore, user, toast],
  );

  // ── Update activity ─────────────────────────────────────────────────────
  const updateActivity = useCallback(
    async (tag: string, activityId: string, data: Partial<NewActivityData>) => {
      if (!firestore || !user) return false;
      try {
        const actRef = doc(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "assembly_activities", activityId);
        await updateDoc(actRef, { ...data });
        
        setActivities(prev => prev.map(a => a.id === activityId ? { ...a, ...data } : a));
        toast({ title: "ACTIVIDAD ACTUALIZADA", description: "Los cambios han sido guardados." });
        return true;
      } catch (err) {
        console.error("useEquipmentRecords.updateActivity:", err);
        toast({ variant: "destructive", title: "ERROR", description: "No se pudo actualizar la actividad." });
        return false;
      }
    },
    [firestore, user, toast],
  );

  // ── Delete activity ─────────────────────────────────────────────────────
  const deleteActivity = useCallback(
    async (tag: string, activityId: string) => {
      if (!firestore || !user) return false;
      // In a real app, we might also want to delete photos from Storage here.
      try {
        const { deleteDoc } = await import("firebase/firestore");
        const actRef = doc(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "assembly_activities", activityId);
        await deleteDoc(actRef);
        
        setActivities(prev => prev.filter(a => a.id !== activityId));
        toast({ title: "ACTIVIDAD ELIMINADA", description: "El registro ha sido removido." });
        return true;
      } catch (err) {
        console.error("useEquipmentRecords.deleteActivity:", err);
        toast({ variant: "destructive", title: "ERROR", description: "No se pudo eliminar la actividad." });
        return false;
      }
    },
    [firestore, user, toast],
  );

  // ── Upload photo to an existing activity ───────────────────────────────
  const uploadActivityPhoto = useCallback(
    async (tag: string, activityId: string, file: File): Promise<string | null> => {
      if (!firestore || !user) return null;
      try {
        setUploadProgress(0);
        const storage  = getStorage(getApp());
        const timestamp = Date.now();
        const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `equipment_records/${tag}/activities/${activityId}/${timestamp}_${safeName}`;
        const storageRef  = ref(storage, storagePath);

        setUploadProgress(20);
        const snapshot    = await uploadBytes(storageRef, file);
        setUploadProgress(80);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        setUploadProgress(100);

        // Update Firestore activity document
        const actRef = doc(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "assembly_activities", activityId);
        const target = activities.find(a => a.id === activityId);
        const prevUrls  = target?.photo_urls  ?? [];
        const prevPaths = target?.photo_paths ?? [];
        await updateDoc(actRef, {
          photo_urls:  [...prevUrls,  downloadUrl],
          photo_paths: [...prevPaths, storagePath],
        });

        // Update local state
        setActivities(prev => prev.map(a =>
          a.id === activityId
            ? { ...a, photo_urls: [...(a.photo_urls ?? []), downloadUrl], photo_paths: [...(a.photo_paths ?? []), storagePath] }
            : a
        ));

        toast({ title: "FOTO ADJUNTADA", description: `Imagen cargada para actividad ${activityId.slice(0, 8)}.` });
        setUploadProgress(null);
        return downloadUrl;
      } catch (err) {
        console.error("useEquipmentRecords.uploadActivityPhoto:", err);
        toast({ variant: "destructive", title: "ERROR", description: "No se pudo cargar la foto." });
        setUploadProgress(null);
        return null;
      }
    },
    [firestore, user, activities, toast],
  );

  // ── Fetch assembly steps ────────────────────────────────────────────────
  const fetchAssemblySteps = useCallback(async (tag: string) => {
    if (!firestore) return;
    setStepsLoading(true);
    try {
      const q = query(
        collection(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "assembly_steps"),
        orderBy("step_number", "asc"),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        // Seed from static plan if Firebase is empty
        const staticPlan = MILL_ASSEMBLY_PLANS[tag] ?? [];
        if (staticPlan.length > 0) {
          await setDoc(doc(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag), { tag }, { merge: true });
          const seeded: AssemblyStep[] = [];
          for (const s of staticPlan) {
            const payload: Omit<AssemblyStep, "id"> = {
              equipment_tag: tag,
              step_number:   s.step_number,
              title:         s.title,
              description:   s.description,
              weight_pct:    s.weight_pct,
              status:        "pendiente",
              iom_ref:       s.iom_ref,
              proc_ref:      s.proc_ref,
            };
            const docRef = await addDoc(
              collection(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "assembly_steps"),
              payload,
            );
            seeded.push({ id: docRef.id, ...payload });
          }
          setAssemblySteps(seeded);
          toast({ title: "PLAN INICIALIZADO", description: `${seeded.length} etapas cargadas para ${tag}.` });
        } else {
          setAssemblySteps([]);
        }
      } else {
        setAssemblySteps(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssemblyStep)));
      }
    } catch (err) {
      console.error("useEquipmentRecords.fetchAssemblySteps:", err);
      setAssemblySteps([]);
    } finally {
      setStepsLoading(false);
    }
  }, [firestore, toast]);

  // ── Update single assembly step ─────────────────────────────────────────
  const updateAssemblyStep = useCallback(
    async (tag: string, stepId: string, data: Partial<AssemblyStep>): Promise<boolean> => {
      if (!firestore || !user) return false;
      try {
        const stepRef = doc(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "assembly_steps", stepId);
        const stepPayload = Object.fromEntries(
          Object.entries({ ...data, updated_by: user.displayName || user.email || "Ingeniero", updated_at: new Date().toISOString() }).filter(([, v]) => v !== undefined),
        );
        await updateDoc(stepRef, stepPayload);
        setAssemblySteps(prev => prev.map(s => s.id === stepId ? { ...s, ...data } : s));
        toast({ title: "ETAPA ACTUALIZADA", description: `Etapa #${data.step_number ?? ""} guardada.` });
        return true;
      } catch (err) {
        console.error("useEquipmentRecords.updateAssemblyStep:", err);
        toast({ variant: "destructive", title: "ERROR", description: "No se pudo actualizar la etapa." });
        return false;
      }
    },
    [firestore, user, toast],
  );

  // ── Upload photo to an assembly step ────────────────────────────────────
  const uploadStepPhoto = useCallback(
    async (tag: string, stepId: string, file: File): Promise<string | null> => {
      if (!firestore || !user) return null;
      try {
        setUploadProgress(0);
        const storage     = getStorage(getApp());
        const timestamp   = Date.now();
        const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `equipment_records/${tag}/steps/${stepId}/${timestamp}_${safeName}`;
        const storageRef  = ref(storage, storagePath);
        setUploadProgress(20);
        const snapshot    = await uploadBytes(storageRef, file);
        setUploadProgress(80);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        setUploadProgress(100);
        const stepRef = doc(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "assembly_steps", stepId);
        const target  = assemblySteps.find(s => s.id === stepId);
        const prevUrls  = target?.photo_urls  ?? [];
        const prevPaths = target?.photo_paths ?? [];
        await updateDoc(stepRef, { photo_urls: [...prevUrls, downloadUrl], photo_paths: [...prevPaths, storagePath] });
        setAssemblySteps(prev => prev.map(s =>
          s.id === stepId
            ? { ...s, photo_urls: [...(s.photo_urls ?? []), downloadUrl], photo_paths: [...(s.photo_paths ?? []), storagePath] }
            : s
        ));
        toast({ title: "FOTO ADJUNTADA", description: "Imagen cargada para la etapa." });
        setUploadProgress(null);
        return downloadUrl;
      } catch (err) {
        console.error("useEquipmentRecords.uploadStepPhoto:", err);
        toast({ variant: "destructive", title: "ERROR", description: "No se pudo cargar la foto." });
        setUploadProgress(null);
        return null;
      }
    },
    [firestore, user, assemblySteps, toast],
  );

  // ── Fetch punch list ────────────────────────────────────────────────────
  const fetchPunchList = useCallback(async (tag: string) => {
    if (!firestore) return;
    setPunchLoading(true);
    try {
      const q = query(
        collection(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "punch_list"),
        orderBy("created_at", "desc"),
      );
      const snap = await getDocs(q);
      setPunchList(snap.docs.map(d => ({ id: d.id, ...d.data() } as PunchListItem)));
    } catch (err) {
      console.error("useEquipmentRecords.fetchPunchList:", err);
      setPunchList([]);
    } finally {
      setPunchLoading(false);
    }
  }, [firestore]);

  // ── Add punch list item ─────────────────────────────────────────────────
  const addPunchItem = useCallback(
    async (tag: string, data: Omit<PunchListItem, "id" | "equipment_tag" | "created_at" | "created_by" | "created_by_uid">): Promise<string | null> => {
      if (!firestore || !user) return null;
      try {
        await setDoc(doc(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag), { tag }, { merge: true });
        const rawPayload: Omit<PunchListItem, "id"> = {
          ...data,
          equipment_tag:   tag,
          created_by:      user.displayName || user.email || "Ingeniero",
          created_by_uid:  user.uid,
          created_at:      new Date().toISOString(),
        };
        // Firestore rejects undefined field values — strip them before writing
        const payload = Object.fromEntries(
          Object.entries(rawPayload).filter(([, v]) => v !== undefined),
        ) as Omit<PunchListItem, "id">;
        const docRef = await addDoc(
          collection(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "punch_list"),
          payload,
        );
        const newItem: PunchListItem = { id: docRef.id, ...payload };
        setPunchList(prev => [newItem, ...prev]);
        toast({ title: "PENDIENTE REGISTRADO", description: "Asunto agregado a la lista de pendientes." });
        return docRef.id;
      } catch (err: any) {
        console.error("useEquipmentRecords.addPunchItem:", err);
        toast({ variant: "destructive", title: "ERROR", description: err?.message || "No se pudo guardar el pendiente." });
        return null;
      }
    },
    [firestore, user, toast],
  );

  // ── Update punch list item ──────────────────────────────────────────────
  const updatePunchItem = useCallback(
    async (tag: string, itemId: string, data: Partial<PunchListItem>): Promise<boolean> => {
      if (!firestore || !user) return false;
      try {
        const itemRef = doc(firestore, "projects", ACTIVE_PROJECT, "equipment_records", tag, "punch_list", itemId);
        const extra = data.status === "cerrado" && !data.closed_at
          ? { closed_at: new Date().toISOString(), closed_by: user.displayName || user.email || "Ingeniero" }
          : {};
        const updatePayload = Object.fromEntries(
          Object.entries({ ...data, ...extra }).filter(([, v]) => v !== undefined),
        );
        await updateDoc(itemRef, updatePayload);
        setPunchList(prev => prev.map(p => p.id === itemId ? { ...p, ...data, ...extra } : p));
        toast({ title: "PENDIENTE ACTUALIZADO", description: "Estado del asunto actualizado." });
        return true;
      } catch (err) {
        console.error("useEquipmentRecords.updatePunchItem:", err);
        toast({ variant: "destructive", title: "ERROR", description: "No se pudo actualizar el pendiente." });
        return false;
      }
    },
    [firestore, user, toast],
  );

  return {
    records,
    activities,
    loading,
    uploadProgress,
    assemblySteps,
    stepsLoading,
    punchList,
    punchLoading,
    fetchAllRecords,
    updateOperationalStatus,
    fetchActivities,
    addActivity,
    updateActivity,
    deleteActivity,
    uploadActivityPhoto,
    fetchAssemblySteps,
    updateAssemblyStep,
    uploadStepPhoto,
    fetchPunchList,
    addPunchItem,
    updatePunchItem,
  };
}
