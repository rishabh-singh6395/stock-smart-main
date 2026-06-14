import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/firebase";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { toast } from "sonner";

export default function Admin() {
  const [running, setRunning] = useState(false);

  async function runBackfill() {
    setRunning(true);
    try {
      // Backfill: copy shop_pincode from profiles to products for each user
      const profilesSnap = await getDocs(collection(db, "profiles"));
      let updatedCount = 0;

      for (const profileDoc of profilesSnap.docs) {
        const profile = profileDoc.data();
        if (!profile.pincode) continue;

        const productsQuery = query(
          collection(db, "products"),
          where("user_id", "==", profile.user_id)
        );
        const productsSnap = await getDocs(productsQuery);

        for (const productDoc of productsSnap.docs) {
          const product = productDoc.data();
          if (!product.shop_pincode) {
            await updateDoc(doc(db, "products", productDoc.id), {
              shop_pincode: profile.pincode,
              shop_name: profile.shop_name || null,
              owner_name: profile.owner_name || null,
              shop_address: profile.address || null,
              contact_phone: profile.phone || null,
            });
            updatedCount++;
          }
        }
      }

      toast.success(`Backfill completed. Updated ${updatedCount} products.`);
    } catch (err: any) {
      toast.error(err?.message || "Backfill failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Database maintenance actions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marketplace Backfill</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Populate missing `shop_pincode` values on existing products from seller profiles. Use this after updating many profiles.</p>
          <Button onClick={runBackfill} disabled={running}>{running ? 'Running...' : 'Run Backfill'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
