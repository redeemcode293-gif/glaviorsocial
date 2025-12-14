import { useState } from "react";
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

const Settings = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");
  
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

  const handleSaveProfile = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    }, 1000);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
    }, 1000);
  };

  const handleSaveNotifications = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Preferences Saved",
        description: "Notification preferences updated.",
      });
    }, 1000);
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account settings">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-secondary/30">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Lock className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Password</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bell className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Profile Information</CardTitle>
                <CardDescription>Update your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    JD
                  </div>
                  <div>
                    <Button variant="outline" size="sm" className="border-border/50">
                      Change Avatar
                    </Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-secondary/30 border-border/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-secondary/30 border-border/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-success/5 border border-success/20 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email Verified</p>
                    <p className="text-xs text-muted-foreground">Your email address has been verified</p>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Change Password</CardTitle>
                <CardDescription>Update your password regularly for security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="current">Current Password</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="current"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 pr-10 bg-secondary/30 border-border/30"
                      placeholder="Enter current password"
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
                  <Label htmlFor="new">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10 bg-secondary/30 border-border/30"
                      placeholder="Enter new password"
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
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border/30"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <Button onClick={handleChangePassword} disabled={isSaving}>
                  <Lock className="h-4 w-4 mr-2" />
                  {isSaving ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Email Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">Receive important updates via email</p>
                    </div>
                    <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        Order Updates
                      </Label>
                      <p className="text-xs text-muted-foreground">Get notified when orders are completed</p>
                    </div>
                    <Switch checked={orderUpdates} onCheckedChange={setOrderUpdates} />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-primary" />
                        Marketing
                      </Label>
                      <p className="text-xs text-muted-foreground">Receive promotions and offers</p>
                    </div>
                    <Switch checked={marketing} onCheckedChange={setMarketing} />
                  </div>
                </div>

                <Button onClick={handleSaveNotifications} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Preferences"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-6 space-y-6">
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Enable 2FA
                    </Label>
                    <p className="text-xs text-muted-foreground">Secure your account with authenticator app</p>
                  </div>
                  <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-display">Active Sessions</CardTitle>
                <CardDescription>Manage your logged-in devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Current Device</p>
                        <p className="text-xs text-muted-foreground">Chrome on Windows • Active now</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-success border-success/30">Active</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 border-destructive/30 text-destructive hover:bg-destructive/10">
                  Sign Out All Devices
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg font-display text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="destructive">Delete Account</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;