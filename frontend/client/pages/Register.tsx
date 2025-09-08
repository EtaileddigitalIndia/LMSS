import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { URLS } from '@/config/urls';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    isValid: false
  });
  const navigate = useNavigate();

  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
    
    // Clear validation errors when user starts typing
    if (validationErrors[id]) {
      setValidationErrors(prev => ({ ...prev, [id]: '' }));
    }
    if (errorMsg) setErrorMsg("");
    
    // Check password strength in real-time
    if (id === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password: string) => {
    const strength = {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      isValid: false
    };
    
    strength.isValid = strength.hasMinLength && strength.hasUppercase && 
                      strength.hasLowercase && strength.hasNumber;
    
    setPasswordStrength(strength);
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Full name validation
    if (!formData.full_name.trim()) {
      errors.full_name = "Full name is required";
    } else if (formData.full_name.trim().length < 2) {
      errors.full_name = "Full name must be at least 2 characters";
    }
    
    // Email validation
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (!passwordStrength.isValid) {
      errors.password = "Password does not meet strength requirements";
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    const { full_name, email, password, confirmPassword, role } = formData;

    try {
      const res = await fetch(URLS.API.AUTH.REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Registration failed");

      // Validate response data
      if (!data.data?.user || !data.data?.token) {
        throw new Error("Invalid response from server");
      }

      login(data.data.user, data.data.token);

      toast.success("Registration successful!");
      navigate("/");
    } catch (err: any) {
      setErrorMsg(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const PasswordStrengthIndicator = ({ strength }: { strength: typeof passwordStrength }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium">Password Requirements:</p>
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-xs">
          {strength.hasMinLength ? 
            <CheckCircle className="h-3 w-3 text-green-500" /> : 
            <XCircle className="h-3 w-3 text-red-500" />
          }
          <span className={strength.hasMinLength ? "text-green-600" : "text-red-600"}>
            At least 8 characters
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          {strength.hasUppercase ? 
            <CheckCircle className="h-3 w-3 text-green-500" /> : 
            <XCircle className="h-3 w-3 text-red-500" />
          }
          <span className={strength.hasUppercase ? "text-green-600" : "text-red-600"}>
            One uppercase letter
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          {strength.hasLowercase ? 
            <CheckCircle className="h-3 w-3 text-green-500" /> : 
            <XCircle className="h-3 w-3 text-red-500" />
          }
          <span className={strength.hasLowercase ? "text-green-600" : "text-red-600"}>
            One lowercase letter
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          {strength.hasNumber ? 
            <CheckCircle className="h-3 w-3 text-green-500" /> : 
            <XCircle className="h-3 w-3 text-red-500" />
          }
          <span className={strength.hasNumber ? "text-green-600" : "text-red-600"}>
            One number
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">EduFlow</span>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Create an account</CardTitle>
            <p className="text-center text-muted-foreground">Join thousands of learners worldwide</p>
          </CardHeader>
          <CardContent>
            {errorMsg && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input 
                  id="full_name" 
                  value={formData.full_name} 
                  onChange={handleChange} 
                  className={validationErrors.full_name ? "border-destructive" : ""}
                  required 
                />
                {validationErrors.full_name && (
                  <p className="text-sm text-destructive">{validationErrors.full_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  className={validationErrors.email ? "border-destructive" : ""}
                  required 
                />
                {validationErrors.email && (
                  <p className="text-sm text-destructive">{validationErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">I am a</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password} 
                    onChange={handleChange} 
                    className={validationErrors.password ? "border-destructive" : ""}
                    required 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-destructive">{validationErrors.password}</p>
                )}
                {formData.password && (
                  <PasswordStrengthIndicator strength={passwordStrength} />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    className={validationErrors.confirmPassword ? "border-destructive" : ""}
                    required 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{validationErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" required className="rounded border-border" />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !passwordStrength.isValid}
              >
                {loading ? "Creating..." : "Create Account"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
