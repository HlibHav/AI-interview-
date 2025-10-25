"use client";

import { useState } from "react";
import { Camera, Mic, AlertCircle, CheckCircle } from "lucide-react";

interface CameraPermissionPromptProps {
  onPermissionsGranted: () => void;
}

export default function CameraPermissionPrompt({ onPermissionsGranted }: CameraPermissionPromptProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState("");
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
  });

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError("");

    try {
      // Request camera permission
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setPermissions(prev => ({ ...prev, camera: true }));
      cameraStream.getTracks().forEach(track => track.stop());

      // Request microphone permission
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissions(prev => ({ ...prev, microphone: true }));
      micStream.getTracks().forEach(track => track.stop());

      // Check if both permissions are granted
      if (permissions.camera && permissions.microphone) {
        onPermissionsGranted();
      }

    } catch (err) {
      console.error("Permission request failed:", err);
      setError("Failed to access camera and microphone. Please check your browser permissions and try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const permissions = await navigator.permissions.query({ name: "camera" as PermissionName });
      const micPermissions = await navigator.permissions.query({ name: "microphone" as PermissionName });
      
      setPermissions({
        camera: permissions.state === "granted",
        microphone: micPermissions.state === "granted",
      });

      if (permissions.state === "granted" && micPermissions.state === "granted") {
        onPermissionsGranted();
      }
    } catch (err) {
      console.log("Permission API not supported, will request manually");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <Camera className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Camera & Microphone Access</h1>
          <p className="text-gray-600">
            This interview requires access to your camera and microphone to communicate with the AI interviewer.
          </p>
        </div>

        {/* Permission Status */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Camera className="w-5 h-5 text-gray-600 mr-3" />
              <span className="text-sm font-medium text-gray-700">Camera</span>
            </div>
            {permissions.camera ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Mic className="w-5 h-5 text-gray-600 mr-3" />
              <span className="text-sm font-medium text-gray-700">Microphone</span>
            </div>
            {permissions.microphone ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={requestPermissions}
            disabled={isRequesting}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRequesting ? "Requesting Permissions..." : "Allow Camera & Microphone"}
          </button>
          
          <button
            onClick={checkPermissions}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Check Current Permissions
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Browser Instructions:</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Click "Allow" when your browser asks for permission</li>
            <li>• If you accidentally blocked access, click the camera/mic icon in your browser's address bar</li>
            <li>• Make sure no other applications are using your camera or microphone</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
