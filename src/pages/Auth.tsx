import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"shopkeeper" | "customer">("shopkeeper");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        toast.success("Welcome back!");

        // Check profile for role-based redirect
        try {
          const q = query(collection(db, "profiles"), where("user_id", "==", userId));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const profileData = snapshot.docs[0].data();
            const userRole = profileData?.role;
            // Redirect based on role - customers go to /customer, shopkeepers go to /
            if (userRole === "customer") {
              navigate("/customer", { replace: true });
            } else {
              navigate("/", { replace: true });
            }
          } else {
            // No profile found - default to shopkeeper page
            navigate("/", { replace: true });
          }
        } catch (profileError) {
          console.error("Error fetching profile:", profileError);
          // On error, default to shopkeeper page
          navigate("/", { replace: true });
        }
      } catch (error: any) {
        toast.error(error?.message || "Sign in failed");
      }
    } else {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        // Update the user's display name
        await updateProfile(userCredential.user, { displayName: fullName });

        toast.success("Account created!");

        // Create a profile document in Firestore
        try {
          await setDoc(doc(db, "profiles", userId), {
            user_id: userId,
            role,
            owner_name: fullName,
            shop_name: "",
            phone: null,
            address: null,
            pincode: null,
            profile_picture_url: null,
            custom_fields: null,
            date_of_birth: null,
            gender: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // Navigate based on role after profile is created
          console.log("Signup successful, role:", role);
          if (role === "customer") {
            navigate("/customer", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        } catch (e) {
          console.warn("Failed to create profile after signup", e);
          // Even if profile creation fails, navigate based on role
          console.log("Profile creation warning, role:", role);
          if (role === "customer") {
            navigate("/customer", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        }
      } catch (error: any) {
        console.error("Signup error:", error);
        toast.error(error?.message || "Sign up failed");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">StockSmart</CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to manage your inventory" : "Create your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2">
                <input type="radio" name="role" checked={role === 'shopkeeper'} onChange={() => setRole('shopkeeper')} />
                <span className="text-sm">Shopkeeper</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="role" checked={role === 'customer'} onChange={() => setRole('customer')} />
                <span className="text-sm">Customer</span>
              </label>
            </div>
            {!isLogin && (
              <div>
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" required />
              </div>
            )}
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
