import React, { useState, useEffect, useRef } from "react";
import {
  User, Phone, Mail, MapPin, Home, Settings, ShieldCheck, Bell,
  Camera, Save, Loader2, Plus, X, AlertCircle, CheckCircle2, Eye, EyeOff, Lock, LocateFixed
} from "lucide-react";
import { reauthenticateWithCredential, updatePassword, EmailAuthProvider, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useProducts,
  useSales,
  useProfile,
  useUpsertProfile,
  useUploadProfilePicture,
  EnhancedProfileData
} from "@/hooks/useData";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect as useReactEffect } from "react";
import CountUp from "react-countup";
import { Skeleton } from "@/components/ui/skeleton";

// Validation types
interface ValidationErrors {
  owner_name?: string;
  phone?: string;
  email?: string;
  shop_name?: string;
  pincode?: string;
  address?: string;
}

// Custom field type
interface CustomField {
  key: string;
  value: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Indian phone validation (10 digits, starts with 6-9)
const PHONE_REGEX = /^[6-9]\d{9}$/;
// Pincode validation (6 digits)
const PINCODE_REGEX = /^\d{6}$/;

export default function Profile() {
  const { data: products = [] } = useProducts();
  const { data: sales = [] } = useSales();
  const { data: profile, isLoading: loadingProfile, error: profileError } = useProfile();
  const upsert = useUpsertProfile();
  const uploadPicture = useUploadProfilePicture();
  const { signOut, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(""); // Will be populated from user or profile

  // Initialize email from user on mount
  useReactEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user]);
  const [shopName, setShopName] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Additional fields
  const [category, setCategory] = useState("Grocery Store");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newCustomFieldKey, setNewCustomFieldKey] = useState("");
  const [newCustomFieldValue, setNewCustomFieldValue] = useState("");

  // Notification preferences
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [salesNotifications, setSalesNotifications] = useState(false);

  // UI state
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("en");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Password strength checker
  function getPasswordStrength(password: string): { level: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { level: 2, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 3) return { level: 3, label: 'Good', color: 'bg-yellow-500' };
    return { level: 4, label: 'Strong', color: 'bg-green-500' };
  }

  function PasswordStrengthIndicator({ password }: { password: string }) {
    const strength = getPasswordStrength(password);
    const widths = ['w-1/4', 'w-1/2', 'w-3/4', 'w-full'];

    return (
      <div className="mt-2">
        <div className="flex gap-1 mb-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-1 flex-1 rounded-full transition-colors ${level <= strength.level ? strength.color : 'bg-muted'
                }`}
            />
          ))}
        </div>
        <p className={`text-xs ${strength.color.replace('bg-', 'text-')}`}>
          {strength.label}
        </p>
      </div>
    );
  }

  // Handle password change
  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    // Validation
    if (!oldPassword) {
      setPasswordError("Please enter your current password");
      return;
    }
    if (!newPassword) {
      setPasswordError("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (oldPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setIsChangingPassword(true);

    try {
      if (!user || !user.email) {
        throw new Error("You must be logged in to change your password");
      }

      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      // Update the password
      await updatePassword(user, newPassword);

      setPasswordSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully!");
    } catch (error: any) {
      console.error("Password change error:", error);

      let errorMessage = "Failed to change password. Please try again.";

      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage = "Current password is incorrect";
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage = "Please log out and log in again before changing your password";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setPasswordError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Load profile data when available
  useReactEffect(() => {
    if (profile) {
      setName(profile.owner_name ?? "");
      setPhone(profile.phone ?? "");
      setShopName(profile.shop_name ?? "");
      setCity(profile.address ?? "");
      setPincode(profile.pincode ?? "");
      setProfilePictureUrl(profile.profile_picture_url ?? null);
      setDateOfBirth(profile.date_of_birth ?? "");
      setGender(profile.gender ?? "");
      setLatitude(profile.latitude?.toString() ?? "");
      setLongitude(profile.longitude?.toString() ?? "");
      // Set email from profile or from user login
      const profileEmail = (profile as any).email;
      if (profileEmail) {
        setEmail(profileEmail);
      } else if (user?.email) {
        setEmail(user.email);
      }

      // Load custom fields
      if (profile.custom_fields && typeof profile.custom_fields === 'object') {
        const fields = Object.entries(profile.custom_fields).map(([key, value]) => ({
          key,
          value: String(value)
        }));
        setCustomFields(fields);
      }
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [name, phone, email, shopName, pincode, city, address, profilePictureFile, customFields, dateOfBirth, gender]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Name validation (optional - make it less strict)
    if (name.trim() && name.trim().length < 2) {
      errors.owner_name = "Name must be at least 2 characters";
    }

    // Phone validation - now optional, only validate if provided
    if (phone.trim() && phone.trim().length > 0 && !/^\d{5,15}$/.test(phone.replace(/\s/g, ''))) {
      errors.phone = "Please enter a valid phone number";
    }

    // Email validation (optional but must be valid if provided)
    if (email.trim() && !EMAIL_REGEX.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    // Shop name validation (optional)
    if (shopName.trim() && shopName.trim().length < 2) {
      errors.shop_name = "Shop name must be at least 2 characters";
    }

    // Pincode validation (optional but must be 6 digits if provided)
    if (pincode.trim() && !PINCODE_REGEX.test(pincode)) {
      errors.pincode = "Pincode must be 6 digits";
    }

    // Address validation (optional)
    if (address.trim() && address.trim().length < 5) {
      errors.address = "Address is too short";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle profile picture selection
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }
      setProfilePictureFile(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Remove profile picture
  const handleRemovePicture = () => {
    setProfilePictureFile(null);
    setPreviewUrl(null);
    setProfilePictureUrl(null);
  };

  // Add custom field
  const handleAddCustomField = () => {
    if (newCustomFieldKey.trim() && newCustomFieldValue.trim()) {
      setCustomFields([...customFields, { key: newCustomFieldKey.trim(), value: newCustomFieldValue.trim() }]);
      setNewCustomFieldKey("");
      setNewCustomFieldValue("");
    }
  };

  // Remove custom field
  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    try {
      let finalProfilePictureUrl = profilePictureUrl;

      // Upload new profile picture if selected
      if (profilePictureFile) {
        const uploadedUrl = await uploadPicture.mutateAsync(profilePictureFile);
        finalProfilePictureUrl = uploadedUrl;
      }

      // Convert custom fields to object
      const customFieldsObj: Record<string, unknown> = {};
      customFields.forEach(field => {
        customFieldsObj[field.key] = field.value;
      });

      const profileData: EnhancedProfileData = {
        owner_name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || user?.email || null,
        shop_name: shopName.trim(),
        address: city.trim(),
        pincode: pincode.trim() || null,
        profile_picture_url: finalProfilePictureUrl,
        custom_fields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
      };

      if (latitude) profileData.latitude = parseFloat(latitude);
      if (longitude) profileData.longitude = parseFloat(longitude);

      await upsert.mutateAsync(profileData);

      // Clear unsaved changes flag
      setHasUnsavedChanges(false);
      setProfilePictureFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      toast.success("Profile saved successfully!", {
        description: "Your profile details have been updated.",
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

  // Save shop details
  const handleSaveShopDetails = async () => {
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    try {
      let finalProfilePictureUrl = profilePictureUrl;

      if (profilePictureFile) {
        const uploadedUrl = await uploadPicture.mutateAsync(profilePictureFile);
        finalProfilePictureUrl = uploadedUrl;
      }

      const customFieldsObj: Record<string, unknown> = {};
      customFields.forEach(field => {
        customFieldsObj[field.key] = field.value;
      });

      const profileData: EnhancedProfileData = {
        owner_name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || user?.email || null,
        shop_name: shopName.trim(),
        address: city.trim(),
        pincode: pincode.trim() || null,
        profile_picture_url: finalProfilePictureUrl,
        custom_fields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
      };

      if (latitude) profileData.latitude = parseFloat(latitude);
      if (longitude) profileData.longitude = parseFloat(longitude);

      await upsert.mutateAsync(profileData);

      setHasUnsavedChanges(false);
      setProfilePictureFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      toast.success("Shop details saved successfully!", {
        description: "Your shop information has been updated.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save shop details";
      toast.error("Failed to save shop details", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }
  };

  // Get current location using HTML5 Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    toast.info("Retrieving your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        toast.success("Location retrieved successfully!");
      },
      (error) => {
        toast.error(`Failed to get location: ${error.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  // Calculate inventory stats
  const totalProducts = products.length;
  const totalStock = products.reduce((s, p) => s + Number(p.quantity || 0), 0);
  const nearExpiry = products.filter(p => {
    const diff = Math.ceil((new Date(p.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  }).length;
  const outOfStock = products.filter(p => p.quantity === 0).length;

  // Loading state
  if (loadingProfile) {
    return (
      <div>
        <div className="page-header">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
        <p className="text-muted-foreground mb-4">Failed to load your profile data.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage your account, shop details and preferences</p>
        </div>
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span>Unsaved changes</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                {/* Profile Picture */}
                <div className="relative">
                  <Avatar className="h-24 w-24 bg-muted">
                    <AvatarImage src={previewUrl || profilePictureUrl || undefined} />
                    <AvatarFallback className="text-2xl">
                      {name ? name.charAt(0).toUpperCase() : <User className="h-10 w-10" />}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  {profilePictureUrl && !previewUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePicture}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </div>

                {/* Hidden file input for removal */}
                {previewUrl && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRemovePicture}>
                      Cancel
                    </Button>
                  </div>
                )}

                <div className="w-full space-y-3">
                  {/* Name */}
                  <div>
                    <Label htmlFor="sidebar-name" className="text-xs text-muted-foreground">Full Name *</Label>
                    <Input
                      id="sidebar-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className={validationErrors.owner_name ? "border-destructive" : ""}
                    />
                    {validationErrors.owner_name && (
                      <p className="text-xs text-destructive mt-1">{validationErrors.owner_name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="sidebar-phone" className="text-xs text-muted-foreground">Phone *</Label>
                    <Input
                      id="sidebar-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className={validationErrors.phone ? "border-destructive" : ""}
                    />
                    {validationErrors.phone && (
                      <p className="text-xs text-destructive mt-1">{validationErrors.phone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="sidebar-email" className="text-xs text-muted-foreground">Email</Label>
                    <Input
                      id="sidebar-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@store.com"
                      className={validationErrors.email ? "border-destructive" : ""}
                    />
                    {validationErrors.email && (
                      <p className="text-xs text-destructive mt-1">{validationErrors.email}</p>
                    )}
                  </div>

                  {/* Pincode */}
                  <div>
                    <Label htmlFor="sidebar-pincode" className="text-xs text-muted-foreground">Pincode</Label>
                    <Input
                      id="sidebar-pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 110001"
                      maxLength={6}
                      className={validationErrors.pincode ? "border-destructive" : ""}
                    />
                    {validationErrors.pincode && (
                      <p className="text-xs text-destructive mt-1">{validationErrors.pincode}</p>
                    )}
                  </div>

                  {/* Save Button */}
                  <Button
                    className="w-full mt-2"
                    onClick={handleSaveProfile}
                    disabled={upsert.isPending || uploadPicture.isPending}
                  >
                    {upsert.isPending || uploadPicture.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Summary Card */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Inventory Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-muted/50 rounded">
                  <div className="text-sm text-muted-foreground">Products</div>
                  <div className="text-2xl font-bold"><CountUp end={totalProducts} duration={1.5} /></div>
                </div>
                <div className="p-3 bg-muted/50 rounded">
                  <div className="text-sm text-muted-foreground">Total Stock</div>
                  <div className="text-2xl font-bold"><CountUp end={totalStock} duration={1.5} /></div>
                </div>
                <div className="p-3 bg-muted/50 rounded">
                  <div className="text-sm text-muted-foreground">Near Expiry</div>
                  <div className="text-2xl font-bold"><CountUp end={nearExpiry} duration={1.5} /></div>
                </div>
                <div className="p-3 bg-muted/50 rounded">
                  <div className="text-sm text-muted-foreground">Out of Stock</div>
                  <div className="text-2xl font-bold"><CountUp end={outOfStock} duration={1.5} /></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="account" className="space-y-4">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="shop">Shop</TabsTrigger>
              <TabsTrigger value="custom">Custom Fields</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Manage your personal account details</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account-name">Full Name *</Label>
                    <Input
                      id="account-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={validationErrors.owner_name ? "border-destructive" : ""}
                    />
                    {validationErrors.owner_name && (
                      <p className="text-xs text-destructive mt-1">{validationErrors.owner_name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="account-role">Role</Label>
                    <Input id="account-role" value="Shopkeeper" disabled />
                  </div>

                  <div>
                    <Label htmlFor="account-phone">Phone *</Label>
                    <Input
                      id="account-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={validationErrors.phone ? "border-destructive" : ""}
                    />
                    {validationErrors.phone && (
                      <p className="text-xs text-destructive mt-1">{validationErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="account-email">Email</Label>
                    <Input
                      id="account-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={validationErrors.email ? "border-destructive" : ""}
                    />
                    {validationErrors.email && (
                      <p className="text-xs text-destructive mt-1">{validationErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="account-dob">Date of Birth</Label>
                    <Input
                      id="account-dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="account-gender">Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger id="account-gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shop Tab */}
            <TabsContent value="shop">
              <Card>
                <CardHeader>
                  <CardTitle>Shop Information</CardTitle>
                  <CardDescription>Details about your business</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shop-name">Shop Name *</Label>
                    <Input
                      id="shop-name"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className={validationErrors.shop_name ? "border-destructive" : ""}
                    />
                    {validationErrors.shop_name && (
                      <p className="text-xs text-destructive mt-1">{validationErrors.shop_name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="shop-city">City / Location</Label>
                    <Input
                      id="shop-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="shop-category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="shop-category">
                        <SelectValue placeholder={category} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Medical Store">Medical Store</SelectItem>
                        <SelectItem value="Grocery Store">Grocery Store</SelectItem>
                        <SelectItem value="General Store">General Store</SelectItem>
                        <SelectItem value="Department Store">Department Store</SelectItem>
                        <SelectItem value="Convenience Store">Convenience Store</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="shop-pincode">Pincode</Label>
                    <Input
                      id="shop-pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 110001"
                      maxLength={6}
                      className={validationErrors.pincode ? "border-destructive" : ""}
                    />
                    {validationErrors.pincode && (
                      <p className="text-xs text-destructive mt-1">{validationErrors.pincode}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="shop-address">Address</Label>
                    <Textarea
                      id="shop-address"
                      value={address || city}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Complete shop address"
                      rows={3}
                      className={validationErrors.address ? "border-destructive" : ""}
                    />
                    {validationErrors.address && (
                      <p className="text-xs text-destructive mt-1">{validationErrors.address}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Shop Location (for Map)
                      </Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} className="gap-2">
                        <LocateFixed className="h-4 w-4" />
                        Get My Location
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter coordinates to show your shop on the map, or click "Get My Location" to automatically detect your coordinates.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                        <Input
                          id="latitude"
                          value={latitude}
                          onChange={(e) => setLatitude(e.target.value)}
                          placeholder="e.g. 28.6139"
                        />
                      </div>
                      <div>
                        <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                        <Input
                          id="longitude"
                          value={longitude}
                          onChange={(e) => setLongitude(e.target.value)}
                          placeholder="e.g. 77.2090"
                        />
                      </div>
                    </div>
                    {latitude && longitude && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Location set: {latitude}, {longitude}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Button
                      onClick={handleSaveShopDetails}
                      disabled={upsert.isPending || uploadPicture.isPending}
                    >
                      {upsert.isPending || uploadPicture.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Shop Details
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Custom Fields Tab */}
            <TabsContent value="custom">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Fields</CardTitle>
                  <CardDescription>Add additional information fields to your profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing Custom Fields */}
                  {customFields.length > 0 && (
                    <div className="space-y-2">
                      <Label>Your Custom Fields</Label>
                      {customFields.map((field, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{field.key}</div>
                            <div className="text-sm text-muted-foreground">{field.value}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCustomField(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Custom Field */}
                  <div className="space-y-2">
                    <Label>Add New Custom Field</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Field name (e.g., GST Number)"
                        value={newCustomFieldKey}
                        onChange={(e) => setNewCustomFieldKey(e.target.value)}
                      />
                      <Input
                        placeholder="Value"
                        value={newCustomFieldValue}
                        onChange={(e) => setNewCustomFieldValue(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        onClick={handleAddCustomField}
                        disabled={!newCustomFieldKey.trim() || !newCustomFieldValue.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Save Custom Fields */}
                  <Button
                    onClick={handleSaveProfile}
                    disabled={upsert.isPending}
                    className="mt-4"
                  >
                    {upsert.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Custom Fields
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sales Tab */}
            <TabsContent value="sales">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Sales Today</div>
                      <div className="text-xl font-bold">₹<CountUp end={sales.filter(s => new Date(s.sale_date).toDateString() === new Date().toDateString()).reduce((a, b) => a + Number(b.total), 0)} duration={1.5} /></div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Weekly Sales</div>
                      <div className="text-xl font-bold">₹<CountUp end={0} duration={1.5} /></div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Monthly Revenue</div>
                      <div className="text-xl font-bold">₹<CountUp end={sales.reduce((a, b) => a + Number(b.total), 0)} duration={1.5} /></div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Best Selling</div>
                      <div className="text-sm font-medium">{sales.length ? sales[0].product_name : "—"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Expiry Alerts</div>
                      <div className="text-xs text-muted-foreground">Get alerted when products near expiry</div>
                    </div>
                    <Switch checked={expiryAlerts} onCheckedChange={(v) => setExpiryAlerts(Boolean(v))} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Low Stock Alerts</div>
                      <div className="text-xs text-muted-foreground">Notify when stock goes low</div>
                    </div>
                    <Switch checked={lowStockAlerts} onCheckedChange={(v) => setLowStockAlerts(Boolean(v))} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Sales Summary</div>
                      <div className="text-xs text-muted-foreground">Receive periodic sales summaries</div>
                    </div>
                    <Switch checked={salesNotifications} onCheckedChange={(v) => setSalesNotifications(Boolean(v))} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your password and account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Change Password Form */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Change Password</h3>
                    </div>

                    {passwordSuccess && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800">Password changed successfully!</p>
                          <p className="text-sm text-green-600">You can now use your new password to log in.</p>
                        </div>
                      </div>
                    )}

                    {passwordError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">Failed to change password</p>
                          <p className="text-sm text-red-600">{passwordError}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="old-password">Current Password</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="old-password"
                            type={showOldPassword ? "text" : "password"}
                            placeholder="Enter your current password"
                            value={oldPassword}
                            onChange={(e) => {
                              setOldPassword(e.target.value);
                              setPasswordError("");
                              setPasswordSuccess(false);
                            }}
                            disabled={isChangingPassword}
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password (min 6 characters)"
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              setPasswordError("");
                              setPasswordSuccess(false);
                            }}
                            disabled={isChangingPassword}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {newPassword && (
                          <PasswordStrengthIndicator password={newPassword} />
                        )}
                      </div>

                      <div>
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your new password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setPasswordError("");
                              setPasswordSuccess(false);
                            }}
                            disabled={isChangingPassword}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {confirmPassword && newPassword && confirmPassword !== newPassword && (
                          <p className="text-sm text-destructive mt-1">Passwords do not match</p>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handleChangePassword}
                      disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                      className="gap-2"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Changing Password...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Account Actions</h3>
                    </div>
                    <Button variant="destructive" onClick={() => signOut()}>
                      Log out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>App Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Dark Mode</div>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={(v) => setDarkMode(Boolean(v))} />
                  </div>

                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language">
                        <SelectValue placeholder={language === 'en' ? 'English' : 'Hindi'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
