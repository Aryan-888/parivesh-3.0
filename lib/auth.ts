import { db } from "./firebase";
import { getDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { isPermanentAdminEmail } from "./rbac";

export const ensurePermanentAdminAccount = async (uid: string, email?: string | null) => {
  if (!isPermanentAdminEmail(email)) {
    return;
  }

  const userRef = doc(db, "users", uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDoc(userRef, {
      role: "admin",
      email: email || null,
      createdAt: new Date(),
    });
    return;
  }

  if (userDoc.data().role !== "admin") {
    await updateDoc(userRef, { role: "admin" });
  }
};

export const fetchUserRole = async (uid: string) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();

      if (isPermanentAdminEmail(data.email) && data.role !== "admin") {
        await updateDoc(userRef, { role: "admin" });
        return "admin";
      }

      return userDoc.data().role;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
};