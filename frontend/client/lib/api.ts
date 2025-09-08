import {
  API_BASE_URL,
  API_ENDPOINTS,
  API_CONFIG,
  getAuthHeaders,
  ApiResponse,
} from "@/config/api";
import { ENV } from "@/config/environment";
import { toast } from "sonner";

// API Service Class
class ApiService {
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS;
    this.retryDelay = API_CONFIG.RETRY_DELAY;
  }

  // Get authentication token from localStorage
  private getToken(): string | null {
    return localStorage.getItem(ENV.JWT_STORAGE_KEY);
  }

  // Check if token is expired
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  // Handle authentication errors
  private handleAuthError() {
    localStorage.removeItem(ENV.JWT_STORAGE_KEY);
    localStorage.removeItem(ENV.USER_STORAGE_KEY);
    window.dispatchEvent(new Event('storage'));
    toast.error("Session expired. Please log in again.");
    window.location.href = '/login';
  }

  // Create full URL
  private createURL(endpoint: string): string {
    return `${this.baseURL}${endpoint}`;
  }

  // Handle API response
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    // Handle authentication errors
    if (response.status === 401) {
      this.handleAuthError();
      throw new Error('Authentication required');
    }
    
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      
      // Handle API errors
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    }

    const text = await response.text();
    
    if (!response.ok) {
      throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return {
      success: response.ok,
      message: text,
      data: text as T,
    };
  }

  // Retry mechanism
  private async retryRequest<T>(
    requestFn: () => Promise<Response>,
    attempt: number = 1,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await requestFn();
      return await this.handleResponse<T>(response);
    } catch (error) {
      // Don't retry authentication errors
      if (error.message === 'Authentication required') {
        throw error;
      }
      
      if (attempt < this.retryAttempts) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.retryRequest<T>(requestFn, attempt + 1);
      }
      throw error;
    }
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    
    // Check token expiration
    if (token && this.isTokenExpired(token)) {
      this.handleAuthError();
      throw new Error('Token expired');
    }
    
    const headers = getAuthHeaders(token);

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.timeout),
    };

    const url = this.createURL(endpoint);

    return this.retryRequest<T>(() => fetch(url, config));
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // File upload
  async upload<T>(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    
    // Check token expiration
    if (token && this.isTokenExpired(token)) {
      this.handleAuthError();
      throw new Error('Token expired');
    }
    
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = this.createURL(endpoint);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            resolve({
              success: true,
              data: xhr.responseText as T,
            });
          }
        } else if (xhr.status === 401) {
          this.handleAuthError();
          reject(new Error('Authentication required'));
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.open("POST", url);
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      xhr.send(formData);
    });
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export API endpoints for convenience
export { API_ENDPOINTS };

// Export types
export type { ApiResponse };

// Default export
export default apiService;
