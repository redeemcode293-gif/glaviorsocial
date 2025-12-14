import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User,
  Lock,
  Shield,
  Bell,
  Eye,
  EyeOff,
  Save,
  Key,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { user, profile } = useAuth();
  const { t } = useLocalization();
  
  // Profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketing, setMarketing] = useState(false);
  
  // Security
  const [twoFactor, setTwoFactor] = useState(false);
  
  const { toast } = useToast();

  // Fetch user data on mount
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
    }
    if (profile) {
      setName(profile.full_name || "");
    }
  }, [user, profile]);

  const getUserInitials = () => {
    if (name) {
      const parts = name.split(' ');
      return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: t("Profile Updated"),
        description: t("Your profile has been saved successfully."),
      });
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("Failed to update profile."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: t("Missing Fields"),
        description: t("Please fill all password fields."),
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t("Passwords Don't Match"),
        description: t("New password and confirmation must match."),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: t("Password Changed"),
        description: t("Your password has been updated successfully."),
      });
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("Failed to update password."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: t("Preferences Saved"),
        description: t("Notification preferences updated."),
      });
    }, 1000);
  };

  return (
    <DashboardLayout title={t("Settings")} subtitle={t("Manage your account settings")}>
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-secondary/30">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("Profile")}</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Lock className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("Password")}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bell className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("Notifications")}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("Security")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">{t("Profile Information")}</CardTitle>
                <CardDescription>{t("Update your account details")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    {getUserInitials()}
                  </div>
                  <div>
                    <Button variant="outline" size="sm" className="border-border/50">
                      {t("Change Avatar")}
                    </Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("Full Name")}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-secondary/30 border-border/30"
                      placeholder={t("Enter your name")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("Email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="pl-10 bg-secondary/30 border-border/30 opacity-70"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-success/5 border border-success/20 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("Email Verified")}</p>
                    <p className="text-xs text-muted-foreground">{t("Your email address has been verified")}</p>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? t("Saving...") : t("Save Changes")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">{t("Change Password")}</CardTitle>
                <CardDescription>{t("Update your password regularly for security")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="current">{t("Current Password")}</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="current"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 pr-10 bg-secondary/30 border-border/30"
                      placeholder={t("Enter current password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new">{t("New Password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10 bg-secondary/30 border-border/30"
                      placeholder={t("Enter new password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">{t("Confirm New Password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border/30"
                      placeholder={t("Confirm new password")}
                    />
                  </div>
                </div>

                <Button onClick={handleChangePassword} disabled={isSaving}>
                  <Lock className="h-4 w-4 mr-2" />
                  {isSaving ? t("Updating...") : t("Update Password")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">{t("Notification Preferences")}</CardTitle>
                <CardDescription>{t("Choose what notifications you receive")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        {t("Email Notifications")}
                      </Label>
                      <p className="text-xs text-muted-foreground">{t("Receive important updates via email")}</p>
                    </div>
                    <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        {t("Order Updates")}
                      </Label>
                      <p className="text-xs text-muted-foreground">{t("Get notified when orders are completed")}</p>
                    </div>
                    <Switch checked={orderUpdates} onCheckedChange={setOrderUpdates} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-primary" />
                        {t("Marketing")}
                      </Label>
                      <p className="text-xs text-muted-foreground">{t("Receive promotions and offers")}</p>
                    </div>
                    <Switch checked={marketing} onCheckedChange={setMarketing} />
                  </div>
                </div>

                <Button onClick={handleSaveNotifications} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? t("Saving...") : t("Save Preferences")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-6 space-y-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">{t("Two-Factor Authentication")}</CardTitle>
                <CardDescription>{t("Add an extra layer of security to your account")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      {t("Enable 2FA")}
                    </Label>
                    <p className="text-xs text-muted-foreground">{t("Secure your account with authenticator app")}</p>
                  </div>
                  <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">{t("Active Sessions")}</CardTitle>
                <CardDescription>{t("Manage your logged-in devices")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("Current Device")}</p>
                        <p className="text-xs text-muted-foreground">Chrome on Windows • {t("Active now")}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-success border-success/30">{t("Active")}</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 border-destructive/30 text-destructive hover:bg-destructive/10">
                  {t("Sign Out All Devices")}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg font-display text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {t("Danger Zone")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("Once you delete your account, there is no going back. Please be certain.")}
                </p>
                <Button variant="destructive">{t("Delete Account")}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;