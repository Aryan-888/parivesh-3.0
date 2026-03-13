import { db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore/lite";

export const testFirestore = async () => {
  console.log("testFirestore function started");

  try {
    const docRef = await addDoc(collection(db, "testCollection"), {
      message: "Hello Firestore",
      time: new Date()
    });

    console.log("Document written with ID:", docRef.id);
  } catch (error) {
    console.error("Error adding document:", error);
  }
};