import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProfile, useUpsertProfile } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function CustomerProfile() {
  const { data: profile, isLoading, error } = useProfile();
  const upsert = useUpsertProfile();
  const { signOut } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.owner_name || "");
      setPhone(profile.phone || "");
      setPincode(profile.pincode || "");
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ 
        owner_name: name, 
        phone, 
        pincode,
        role: 'customer' // Explicitly set role as customer
      });
      toast.success("Profile saved successfully!", {
        description: "Your profile has been updated.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save profile";
      toast.error("Failed to save profile", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Error Loading Profile</h2>
        <p className="text-muted-foreground">Failed to load your profile data.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customer Profile</h1>
        <p className="page-subtitle">Update your contact and pincode so you see local products.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Pincode</label>
              <Input 
                value={pincode} 
                onChange={e => setPincode(e.target.value)} 
                placeholder="e.g. 110001" 
                maxLength={6}
              />
            </div>
            <div className="md:col-span-2 flex gap-4">
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
              <Button variant="destructive" onClick={() => signOut()}>Log out</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
