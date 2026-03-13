"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import ProtectedRoute from "../../components/ProtectedRoute";

interface SectorParameter {
  id: string;
  sectorName: string;
  defaultNotes: string;
}

interface LocationHierarchy {
  stateName: string;
  districts: string[];
}

type RequiredDocKey = "eiaReport" | "empPlan" | "complianceReport";

type StoredDocument = {
  key: RequiredDocKey;
  name: string;
  url: string;
  contentType: string;
};

type ExistingApplication = {
  id: string;
  status: "draft" | "eds";
  projectName: string;
  location: string;
  state?: string;
  district?: string;
  description: string;
  category: string;
  sector: string;
  payment?: {
    method?: "upi" | "qr";
    reference?: string;
    status?: "verified" | "pending";
    verifiedAt?: string;
  };
  documents?: StoredDocument[];
  eds?: {
    active?: boolean;
    remarks?: string;
    requestedAt?: string;
    responseNotes?: string;
    respondedAt?: string;
    resubmissionCount?: number;
  };
};

const REQUIRED_DOCUMENTS: Array<{ key: RequiredDocKey; label: string }> = [
  { key: "eiaReport", label: "EIA Report (PDF)" },
  { key: "empPlan", label: "Environment Management Plan - EMP (PDF)" },
  { key: "complianceReport", label: "Compliance Undertaking (PDF)" },
];

export default function Page() {
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [stateName, setStateName] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("A");
  const [sector, setSector] = useState("");
  const [availableSectors, setAvailableSectors] = useState<SectorParameter[]>([]);
  const [locationHierarchy, setLocationHierarchy] = useState<Record<string, string[]>>({});

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "qr">("upi");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentVerifiedAt, setPaymentVerifiedAt] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const [documents, setDocuments] = useState<Record<RequiredDocKey, File | null>>({
    eiaReport: null,
    empPlan: null,
    complianceReport: null,
  });
  const [existingDocuments, setExistingDocuments] = useState<Record<RequiredDocKey, StoredDocument | null>>({
    eiaReport: null,
    empPlan: null,
    complianceReport: null,
  });

  const [pendingApplications, setPendingApplications] = useState<ExistingApplication[]>([]);
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [editingApplicationStatus, setEditingApplicationStatus] = useState<"draft" | "eds" | null>(null);
  const [edsResponseNotes, setEdsResponseNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);

  const selectedEditingApplication = useMemo(
    () => pendingApplications.find((item) => item.id === editingApplicationId) || null,
    [pendingApplications, editingApplicationId]
  );

  const states = useMemo(() => Object.keys(locationHierarchy).sort(), [locationHierarchy]);
  const districts = useMemo(() => {
    if (!stateName) {
      return [] as string[];
    }

    return locationHierarchy[stateName] || [];
  }, [locationHierarchy, stateName]);

  const resetForm = () => {
    setProjectName("");
    setLocation("");
    setStateName("");
    setDistrictName("");
    setDescription("");
    setCategory("A");
    setSector("");
    setPaymentMethod("upi");
    setPaymentReference("");
    setPaymentVerified(false);
    setPaymentVerifiedAt(null);
    setDocuments({
      eiaReport: null,
      empPlan: null,
      complianceReport: null,
    });
    setExistingDocuments({
      eiaReport: null,
      empPlan: null,
      complianceReport: null,
    });
    setEditingApplicationId(null);
    setEditingApplicationStatus(null);
    setEdsResponseNotes("");
  };

  const loadSectors = async () => {
    try {
      const snapshot = await getDocs(collection(db, "sectorParameters"));
      const rows = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<SectorParameter, "id">),
      }));
      setAvailableSectors(rows);
    } catch (error) {
      console.error("Error loading sector parameters:", error);
    }
  };

  const loadLocationHierarchy = async () => {
    try {
      const snapshot = await getDocs(collection(db, "locationHierarchy"));
      const map: Record<string, string[]> = {};

      snapshot.docs.forEach((item) => {
        const data = item.data() as LocationHierarchy;
        const currentState = (data.stateName || item.id || "").trim();
        if (!currentState) {
          return;
        }

        const currentDistricts = Array.isArray(data.districts)
          ? data.districts
              .map((value) => String(value).trim())
              .filter((value, index, arr) => value && arr.indexOf(value) === index)
              .sort((a, b) => a.localeCompare(b))
          : [];

        map[currentState] = currentDistricts;
      });

      setLocationHierarchy(map);
    } catch (error) {
      console.error("Error loading location hierarchy:", error);
    }
  };

  const loadPendingApplications = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        return;
      }

      const draftsQuery = query(
        collection(db, "applications"),
        where("ownerId", "==", user.uid),
        where("status", "==", "draft")
      );
      const edsQuery = query(
        collection(db, "applications"),
        where("ownerId", "==", user.uid),
        where("status", "==", "eds")
      );

      const [draftsSnapshot, edsSnapshot] = await Promise.all([
        getDocs(draftsQuery),
        getDocs(edsQuery),
      ]);

      const rows: ExistingApplication[] = [...draftsSnapshot.docs, ...edsSnapshot.docs].map((item) => ({
        id: item.id,
        ...(item.data() as Omit<ExistingApplication, "id">),
      }));

      setPendingApplications(rows);
    } catch (error) {
      console.error("Error loading pending applications:", error);
    }
  };

  useEffect(() => {
    loadSectors();
    loadLocationHierarchy();
    loadPendingApplications();
  }, []);

  useEffect(() => {
    if (!stateName) {
      if (districtName) {
        setDistrictName("");
      }
      return;
    }

    if (districtName && !districts.includes(districtName)) {
      setDistrictName("");
    }
  }, [districtName, districts, stateName]);

  const startEditing = (app: ExistingApplication) => {
    setEditingApplicationId(app.id);
    setEditingApplicationStatus(app.status);

    setProjectName(app.projectName || "");
    setLocation(app.location || "");
    setStateName(app.state || "");
    setDistrictName(app.district || "");
    setDescription(app.description || "");
    setCategory(app.category || "A");
    setSector(app.sector || "");

    setPaymentMethod(app.payment?.method || "upi");
    setPaymentReference(app.payment?.reference || "");
    setPaymentVerified(app.payment?.status === "verified");
    setPaymentVerifiedAt(app.payment?.verifiedAt || null);

    const docMap: Record<RequiredDocKey, StoredDocument | null> = {
      eiaReport: null,
      empPlan: null,
      complianceReport: null,
    };

    (app.documents || []).forEach((item) => {
      docMap[item.key] = item;
    });

    setExistingDocuments(docMap);
    setDocuments({
      eiaReport: null,
      empPlan: null,
      complianceReport: null,
    });

    setEdsResponseNotes(app.eds?.responseNotes || "");
  };

  const handleVerifyPayment = async () => {
    if (!paymentReference.trim()) {
      alert("Enter UPI/QR transaction reference first.");
      return;
    }

    setVerifyingPayment(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const verifiedAt = new Date().toISOString();
    setPaymentVerified(true);
    setPaymentVerifiedAt(verifiedAt);
    setVerifyingPayment(false);
    alert("Payment verified successfully.");
  };

  const saveDraft = async () => {
    if (!projectName.trim() || !location.trim() || !stateName.trim() || !districtName.trim()) {
      alert("Project name, state, district, and location are required to save draft.");
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        alert("Authentication required. Please log in again.");
        return;
      }

      const draftData = {
        projectName,
        location,
        state: stateName,
        district: districtName,
        description,
        category,
        sector,
        status: "draft",
        ownerId: user.uid,
        ownerEmail: user.email || "",
        updatedAt: serverTimestamp(),
      };

      if (editingApplicationId && editingApplicationStatus === "draft") {
        await updateDoc(doc(db, "applications", editingApplicationId), draftData);
        alert("Draft updated successfully.");
      } else {
        await addDoc(collection(db, "applications"), {
          ...draftData,
          createdAt: serverTimestamp(),
        });
        alert("Draft saved successfully.");
      }

      await loadPendingApplications();
      resetForm();
    } catch (error) {
      console.error("Error saving draft:", error);
      alert("Failed to save draft.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !projectName.trim() ||
      !location.trim() ||
      !stateName.trim() ||
      !districtName.trim() ||
      !description.trim() ||
      !category.trim() ||
      !sector.trim()
    ) {
      alert("Please fill in all fields before submitting.");
      return;
    }

    if (!paymentVerified || !paymentVerifiedAt) {
      alert("Payment verification is required before submission.");
      return;
    }

    const missingDocs = REQUIRED_DOCUMENTS.filter(
      (item) => !documents[item.key] && !existingDocuments[item.key]
    );

    if (missingDocs.length > 0) {
      alert(`Please upload all mandatory documents: ${missingDocs.map((item) => item.label).join(", ")}`);
      return;
    }

    setLoading(true);
    setUploadingDocuments(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        alert("Authentication required. Please log in again.");
        setUploadingDocuments(false);
        setLoading(false);
        return;
      }

      const uploadedDocuments = [] as StoredDocument[];

      for (const requiredDoc of REQUIRED_DOCUMENTS) {
        const file = documents[requiredDoc.key];

        if (file) {
          if (file.type !== "application/pdf") {
            alert(`${requiredDoc.label} must be a PDF file.`);
            setUploadingDocuments(false);
            setLoading(false);
            return;
          }

          const maxFileSize = 20 * 1024 * 1024;
          if (file.size > maxFileSize) {
            alert(`${requiredDoc.label} exceeds 20MB size limit.`);
            setUploadingDocuments(false);
            setLoading(false);
            return;
          }

          const filePath = `applications/${user.uid}/${Date.now()}_${requiredDoc.key}_${file.name}`;
          const storageRef = ref(storage, filePath);
          await uploadBytes(storageRef, file);
          const fileUrl = await getDownloadURL(storageRef);

          uploadedDocuments.push({
            key: requiredDoc.key,
            name: file.name,
            url: fileUrl,
            contentType: file.type,
          });
        } else {
          const existingDoc = existingDocuments[requiredDoc.key];
          if (existingDoc) {
            uploadedDocuments.push(existingDoc);
          }
        }
      }

      const baseData = {
        projectName,
        location,
        state: stateName,
        district: districtName,
        description,
        category,
        sector,
        payment: {
          method: paymentMethod,
          reference: paymentReference,
          status: "verified",
          verifiedAt: paymentVerifiedAt,
        },
        documents: uploadedDocuments,
        updatedAt: serverTimestamp(),
      };

      if (editingApplicationId && editingApplicationStatus) {
        const updateData: Record<string, unknown> = {
          ...baseData,
          status: editingApplicationStatus === "eds" ? "under_scrutiny" : "submitted",
        };

        if (editingApplicationStatus === "eds") {
          const existingEds = selectedEditingApplication?.eds || {};
          updateData.eds = {
            ...existingEds,
            active: false,
            responseNotes: edsResponseNotes,
            respondedAt: new Date().toISOString(),
            resubmissionCount: (existingEds.resubmissionCount || 0) + 1,
          };
        }

        await updateDoc(doc(db, "applications", editingApplicationId), updateData);
        alert(editingApplicationStatus === "eds" ? "EDS response submitted for scrutiny." : "Draft submitted successfully.");
      } else {
        const docRef = await addDoc(collection(db, "applications"), {
          ...baseData,
          status: "submitted",
          ownerId: user.uid,
          ownerEmail: user.email || "",
          createdAt: serverTimestamp(),
        });

        alert(
          `Application submitted successfully! Your Application ID is: ${docRef.id}. You can track your application at /track`
        );
      }

      await loadPendingApplications();
      resetForm();
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setUploadingDocuments(false);
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRole="proponent">
      <main className="container">
        <header className="header">
          <div>
            <h1 className="title">Apply for PARIVESH</h1>
            <p className="subtitle">
              Save drafts, respond to EDS, and submit your complete application with mandatory documents.
            </p>
          </div>
        </header>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="text-lg font-semibold" style={{ marginTop: 0 }}>My Pending Actions</h2>
          {pendingApplications.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No draft or EDS applications pending.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {pendingApplications.map((item) => (
                <div key={item.id} className="card" style={{ margin: 0 }}>
                  <p style={{ margin: 0 }}><strong>{item.projectName || "Untitled Project"}</strong></p>
                  <p style={{ margin: "6px 0", color: "var(--muted)" }}>
                    Status: {item.status === "eds" ? "EDS Action Required" : "Draft"}
                  </p>
                  {item.status === "eds" && item.eds?.remarks && (
                    <p style={{ margin: "6px 0", color: "#f0b90b" }}>
                      Scrutiny Remarks: {item.eds.remarks}
                    </p>
                  )}
                  <button className="button" type="button" onClick={() => startEditing(item)}>
                    {item.status === "eds" ? "Respond to EDS" : "Continue Draft"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Project Name</label>
            <input
              className="input"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          <div className="field">
            <label>Location / Locality</label>
            <input
              className="input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter village/town/locality"
            />
          </div>

          <div className="field">
            <label>State</label>
            <select
              className="select"
              value={stateName}
              onChange={(e) => {
                const nextState = e.target.value;
                setStateName(nextState);
                setDistrictName("");
              }}
            >
              <option value="">Select state</option>
              {states.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>District</label>
            <select
              className="select"
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              disabled={!stateName}
            >
              <option value="">Select district</option>
              {districts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Description</label>
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project details"
              rows={4}
            />
          </div>

          <div className="field">
            <label>Category</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="A">A</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
            </select>
          </div>

          <div className="field">
            <label>Sector</label>
            {availableSectors.length > 0 ? (
              <select className="select" value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">Select sector</option>
                {availableSectors.map((item) => (
                  <option key={item.id} value={item.sectorName}>{item.sectorName}</option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Enter project sector"
              />
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="text-lg font-semibold" style={{ marginTop: 0 }}>Mandatory Technical Documents</h2>
            <p style={{ marginBottom: 12, color: "var(--muted)" }}>
              Upload all mandatory documents in PDF format (max 20MB each).
            </p>

            {REQUIRED_DOCUMENTS.map((item) => (
              <div className="field" key={item.key}>
                <label>{item.label}</label>
                <input
                  className="input"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setDocuments((prev) => ({ ...prev, [item.key]: file }));
                  }}
                />
                <p style={{ margin: 0, color: documents[item.key] || existingDocuments[item.key] ? "#2ea043" : "#f0b90b" }}>
                  {documents[item.key]
                    ? `Selected: ${documents[item.key]?.name}`
                    : existingDocuments[item.key]
                    ? `Existing: ${existingDocuments[item.key]?.name}`
                    : "Not uploaded"}
                </p>
                {existingDocuments[item.key]?.url && (
                  <a href={existingDocuments[item.key]?.url || "#"} target="_blank" rel="noreferrer">
                    View existing file
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="text-lg font-semibold" style={{ marginTop: 0 }}>Fee Payment (Simulation)</h2>
            <div className="field">
              <label>Payment Method</label>
              <select
                className="select"
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as "upi" | "qr");
                  setPaymentVerified(false);
                  setPaymentVerifiedAt(null);
                }}
              >
                <option value="upi">UPI</option>
                <option value="qr">QR Code</option>
              </select>
            </div>

            <div className="field">
              <label>Transaction Reference</label>
              <input
                className="input"
                type="text"
                value={paymentReference}
                onChange={(e) => {
                  setPaymentReference(e.target.value);
                  setPaymentVerified(false);
                  setPaymentVerifiedAt(null);
                }}
                placeholder={paymentMethod === "upi" ? "Enter UPI transaction ID" : "Enter QR payment ref"}
              />
            </div>

            <button className="button" type="button" onClick={handleVerifyPayment} disabled={verifyingPayment}>
              {verifyingPayment ? "Verifying..." : "Verify Payment"}
            </button>

            <p style={{ marginTop: 10, color: paymentVerified ? "#2ea043" : "#f0b90b" }}>
              Payment Status: {paymentVerified ? "Verified" : "Pending Verification"}
            </p>
          </div>

          {editingApplicationStatus === "eds" && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 className="text-lg font-semibold" style={{ marginTop: 0 }}>EDS Response</h2>
              <div className="field">
                <label>Response Notes for Scrutiny Team</label>
                <textarea
                  className="textarea"
                  rows={4}
                  value={edsResponseNotes}
                  onChange={(e) => setEdsResponseNotes(e.target.value)}
                  placeholder="Describe the corrections made against EDS remarks"
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {editingApplicationStatus !== "eds" && (
              <button className="button button-secondary" type="button" disabled={loading} onClick={saveDraft}>
                {loading ? "Saving..." : "Save Draft"}
              </button>
            )}

            <button className="button" type="submit" disabled={loading}>
              {loading
                ? uploadingDocuments
                  ? "Uploading documents..."
                  : "Submitting..."
                : editingApplicationStatus === "eds"
                ? "Resubmit to Scrutiny"
                : editingApplicationStatus === "draft"
                ? "Submit Draft"
                : "Submit Application"}
            </button>

            {(editingApplicationId || editingApplicationStatus) && (
              <button className="button button-secondary" type="button" onClick={resetForm}>
                Cancel Editing
              </button>
            )}
          </div>
        </form>
      </main>
    </ProtectedRoute>
  );
}
