"use client";

import { useState } from "react";
import { Camera, Mic, AlertCircle, CheckCircle } from "lucide-react";

interface CameraPermissionPromptProps {
  onPermissionsGranted: () => void;
  onPermissionsDenied?: () => void;
}

export default function CameraPermissionPrompt({
  onPermissionsGranted,
  onPermissionsDenied,
}: CameraPermissionPromptProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Permissions granted
      setCameraGranted(true);
      setMicGranted(true);

      // Stop the test stream
      stream.getTracks().forEach((track) => track.stop());

      // Notify parent component
      setTimeout(() => {
        onPermissionsGranted();
      }, 500);
    } catch (err) {
      console.error("Permission error:", err);
      
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Camera and microphone access was denied. Please allow access in your browser settings.");
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found. Please connect a device and try again.");
        } else {
          setError("Failed to access camera and microphone. Please check your device settings.");
        }
      } else {
        setError("An unexpected error occurred while requesting permissions.");
      }

      if (onPermissionsDenied) {
        onPermissionsDenied();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Camera className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Camera & Microphone Access
          </h2>
          <p className="text-gray-600">
            This interview requires access to your camera and microphone to enable video and audio communication.
          </p>
        </div>

        {/* Permission Status */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <Camera className={`h-5 w-5 mr-3 ${cameraGranted ? "text-green-600" : "text-gray-400"}`} />
            <span className="text-sm font-medium text-gray-700">Camera Access</span>
            {cameraGranted && <CheckCircle className="h-5 w-5 ml-auto text-green-600" />}
          </div>

          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <Mic className={`h-5 w-5 mr-3 ${micGranted ? "text-green-600" : "text-gray-400"}`} />
            <span className="text-sm font-medium text-gray-700">Microphone Access</span>
            {micGranted && <CheckCircle className="h-5 w-5 ml-auto text-green-600" />}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={requestPermissions}
          disabled={isRequesting || (cameraGranted && micGranted)}
          className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isRequesting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Requesting Access...
            </>
          ) : cameraGranted && micGranted ? (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Access Granted
            </>
          ) : (
            <>
              <Camera className="h-5 w-5 mr-2" />
              Grant Access
            </>
          )}
        </button>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Privacy & Security</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Your video and audio are only used during the interview session</li>
            <li>• No recordings are stored without your explicit consent</li>
            <li>• You can revoke access at any time from your browser settings</li>
            <li>• All data is transmitted securely and encrypted</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

