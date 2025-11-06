import React, { useState, useEffect } from 'react';
import { User, Linkedin, Mail, FileText, Upload, Save, Edit2, X, Download, Eye, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { APP_CONFIG, FILE_CONFIG } from '../utils/constants';
import packageJson from '../../package.json';
import db from '../utils/database';
import { saveFileDualWrite } from '../utils/fileSync';

const { ipcRenderer } = window;

function AboutMe() {
  const { userMode, isOnline } = useApp();
  const { showToast } = useToast();
  const isAdminEditor = userMode === 'AdminEditor';
  const isRestricted = userMode === 'RestrictedEditor';
  const isEditor = isAdminEditor || isRestricted;
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: APP_CONFIG.author,
    title: 'Full Stack Developer',
    bio: 'Developer of LOTO Key Management System - A comprehensive solution for electrical lockout/tagout procedures and key management.',
    email: APP_CONFIG.email,
    linkedin: APP_CONFIG.linkedIn,
    profilePicture: null,
    cvFiles: [] // Array of {path, displayName}
  });
  const [appSettings, setAppSettings] = useState({
    app_name: APP_CONFIG.name,
    app_version: APP_CONFIG.version,
    company_name: 'Your Company',
    company_logo: null,  // Added missing field
    about_title: 'About LOTO KMS',
    about_text: 'LOTO Key Management System is a comprehensive desktop application designed to manage electrical lockout/tagout procedures, key inventory, personnel tracking, and electrical plans. Built with modern web technologies and Electron, it provides both online and offline functionality with cloud synchronization capabilities.',
    about_image: null,  // Added missing field
    support_email: '',
    support_phone: ''
  });
  const [newCVName, setNewCVName] = useState('');
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [viewingCV, setViewingCV] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    loadProfileData();
    loadAppSettings();
  }, []);

  const loadAppSettings = async () => {
    try {
      if (ipcRenderer) {
        const result = await db.getAppSettings();
        console.log('App settings query result:', result);
        
        if (result && result.data && result.data.length > 0) {
          const settings = result.data[0];
          setAppSettings(settings);
          console.log('✅ App settings loaded from database:', settings);
        } else {
          console.warn('⚠️ No app settings found in database, using defaults');
        }
      }
    } catch (error) {
      console.error('❌ Error loading app settings:', error);
      console.error('Full error:', error);
    }
  };

  const saveAppSettings = async (settings) => {
    try {
      if (ipcRenderer) {
        // Use cloud-first database method
        console.log('💾 Saving app settings to database:', settings);
        const result = await db.updateAppSettings({
          id: 1,  // Single row table
          app_name: settings.app_name,
          app_version: packageJson.version,  // Always use version from package.json
          company_name: settings.company_name,
          company_logo: settings.company_logo || null,  // Include all fields
          about_title: settings.about_title,
          about_text: settings.about_text,
          about_image: settings.about_image || null,  // Include all fields
          support_email: settings.support_email || null,
          support_phone: settings.support_phone || null,
          updated_at: new Date().toISOString()
        });
        console.log('✅ App settings save result:', result);
        await loadAppSettings(); // Reload to confirm
        return result.success !== false;
      }
      return false;
    } catch (error) {
      console.error('❌ Error saving app settings:', error);
      return false;
    }
  };

  const loadProfileData = async () => {
    try {
      if (ipcRenderer) {
        const result = await db.getProfileSettings();
        console.log('Profile query result:', result);
        
        if (result && result.data && result.data.length > 0) {
          const data = result.data[0];
          
          // Parse cvFiles from JSON string
          if (data.cvFiles && typeof data.cvFiles === 'string') {
            try {
              data.cvFiles = JSON.parse(data.cvFiles);
            } catch (e) {
              console.error('Error parsing cvFiles:', e);
              data.cvFiles = [];
            }
          } else if (!data.cvFiles) {
            data.cvFiles = [];
          }
          
          // Load profile picture if it's a file path
          if (data.profilePicture && !data.profilePicture.startsWith('data:')) {
            try {
              const imageResult = await ipcRenderer.invoke('load-image', data.profilePicture);
              if (imageResult.success) {
                data.profilePicture = imageResult.dataURL;
                console.log('✅ Profile picture loaded from disk');
              } else {
                console.error('Failed to load profile picture:', imageResult.error);
              }
            } catch (error) {
              console.error('Error loading profile picture:', error);
            }
          }
          
          console.log('Loaded profile data:', data);
          console.log('Profile picture:', data.profilePicture ? 'Loaded' : 'None');
          console.log('CV files:', data.cvFiles);
          
          setProfileData(data);
        } else {
          console.warn('No profile data found in database');
        }
      } else {
        console.warn('IPC not available - browser mode');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveToDatabase = async (data) => {
    try {
      if (ipcRenderer) {
        // Use cloud-first database method
        console.log('💾 Saving profile settings to database:', data);
        const result = await db.updateProfileSettings({
          id: 1,  // Single row table
          name: data.name,
          title: data.title,
          bio: data.bio,
          email: data.email,
          linkedin: data.linkedin,
          profilePicture: data.profilePicture || null,
          cvFiles: JSON.stringify(data.cvFiles || []),  // Stringify for database
          updated_at: new Date().toISOString()
        });
        console.log('✅ Profile settings save result:', result);
        return result.success !== false;
      }
      return false;
    } catch (error) {
      console.error('❌ Error saving to database:', error);
      return false;
    }
  };

  const handleSave = async () => {
    try {
      const profileSuccess = await saveToDatabase(profileData);
      const appSuccess = await saveAppSettings(appSettings);
      
      if (profileSuccess && appSuccess) {
        showToast('Profile and settings updated successfully', 'success');
        setIsEditing(false);
      } else if (profileSuccess) {
        showToast('Profile updated, but settings failed to save', 'warning');
        setIsEditing(false);
      } else {
        showToast('Failed to save changes', 'error');
      }
    } catch (error) {
      showToast(`Failed to save: ${error.message}`, 'error');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be less than 2MB', 'error');
      return;
    }

    setUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target.result;
        
        // Upload to Supabase Storage ONLY
        console.log('☁️ Uploading profile picture to Supabase Storage...');
        const fileName = `profile_${Date.now()}_${file.name}`;
        const saveResult = await saveFileDualWrite(
          fileName,
          fileData,
          'profile'  // Upload to profile-pictures bucket
        );
        
        if (saveResult.success) {
          console.log('✅ Profile picture uploaded to Supabase:', saveResult.cloudUrl);
          
          // Use cloud URL for display and storage
          setProfileData(prev => ({ ...prev, profilePicture: saveResult.cloudUrl }));
          
          // Auto-save cloud URL to database
          await saveToDatabase({
            ...profileData,
            profilePicture: saveResult.cloudUrl
          });
          
          showToast('Profile picture uploaded to cloud', 'success');
        } else {
          console.error('❌ Failed to upload profile picture:', saveResult.error);
          showToast('Failed to upload profile picture', 'error');
        }
        setUploading(false);
      };
      reader.onerror = () => {
        showToast('Error reading file', 'error');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showToast(`Upload error: ${error.message}`, 'error');
      setUploading(false);
    }
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      showToast('Please select a PDF file', 'error');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > FILE_CONFIG.maxCvSize) {
      showToast('CV must be less than 10MB', 'error');
      return;
    }

    if (!newCVName.trim()) {
      showToast('Please enter a display name for the CV', 'error');
      return;
    }

    setUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target.result;
        
        // Upload to Supabase Storage ONLY
        console.log('☁️ Uploading CV file to Supabase Storage...');
        const fileName = `cv_${Date.now()}_${file.name}`;
        const saveResult = await saveFileDualWrite(
          fileName,
          fileData,
          'cv'  // Upload to cv-files bucket
        );

        if (saveResult.success) {
          console.log('✅ CV file uploaded to Supabase:', saveResult.cloudUrl);
          
          // Store cloud URL only
          const newCVFiles = [...profileData.cvFiles, { 
            path: saveResult.cloudUrl,  // Cloud URL only
            cloudUrl: saveResult.cloudUrl,
            displayName: newCVName.trim(),
            fileName: fileName 
          }];
          
          // Update state
          setProfileData(prev => ({
            ...prev,
            cvFiles: newCVFiles
          }));
          
          // Auto-save to database immediately
          await saveToDatabase({
            ...profileData,
            cvFiles: newCVFiles
          });
          
          setNewCVName('');
          showToast('CV uploaded to cloud successfully', 'success');
        } else {
          console.error('❌ Failed to upload CV:', saveResult.error);
          showToast('Failed to upload CV', 'error');
        }
        setUploading(false);
      };
      reader.onerror = () => {
        showToast('Error reading file', 'error');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showToast(`Upload error: ${error.message}`, 'error');
      setUploading(false);
    }
  };

  const handleRemoveCV = async (index) => {
    const cv = profileData.cvFiles[index];
    
    // Try to delete the physical file if it's a local file
    if (ipcRenderer && cv.fileName && !cv.isDataURL) {
      try {
        await ipcRenderer.invoke('delete-file', {
          fileName: cv.fileName,
          type: 'cv'
        });
      } catch (error) {
        console.warn('Could not delete file:', error);
      }
    }
    
    const newCVFiles = profileData.cvFiles.filter((_, i) => i !== index);
    
    setProfileData(prev => ({
      ...prev,
      cvFiles: newCVFiles
    }));
    
    // Auto-save to database immediately
    await saveToDatabase({
      ...profileData,
      cvFiles: newCVFiles
    });
    
    showToast('CV removed', 'success');
  };

  const handleViewCV = async (cv) => {
    console.log('📄 Attempting to view CV:', cv.displayName);
    
    if (!cv.path) {
      console.error('❌ No CV path provided');
      showToast('No CV available', 'error');
      return;
    }

    try {
      // Check if it's a Supabase cloud URL (https://)
      if (cv.path.startsWith('http://') || cv.path.startsWith('https://')) {
        console.log('☁️ Cloud URL detected - opening directly:', cv.path);
        setViewingCV({ url: cv.path, name: cv.displayName });
        setShowPDFViewer(true);
        return;
      }
      
      // Check if it's a data URL (browser mode)
      if (cv.path.startsWith('data:')) {
        console.log('🌐 Browser mode - using data URL');
        setViewingCV({ url: cv.path, name: cv.displayName });
        setShowPDFViewer(true);
        return;
      }
      
      // Local file path - read via IPC (Electron)
      if (ipcRenderer) {
        console.log('💻 Electron mode - reading file via IPC:', cv.path);
        const result = await ipcRenderer.invoke('read-file', cv.path);
        console.log('📥 IPC result:', result?.success ? 'Success' : 'Failed');
        if (result.success) {
          console.log('✅ File read successfully, size:', result.data?.length || 0);
          // Convert base64 to blob (browser-compatible)
          const binaryString = atob(result.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          console.log('✅ PDF blob created, opening viewer');
          setViewingCV({ url, name: cv.displayName });
          setShowPDFViewer(true);
        } else {
          console.error('❌ Failed to read file:', result.error);
          showToast(`Could not open file: ${result.error || 'File not found'}`, 'error');
        }
      } else {
        console.error('❌ No IPC available and not a cloud/data URL');
        showToast('PDF viewing not available', 'error');
      }
    } catch (error) {
      console.error('❌ Exception viewing CV:', error);
      showToast(`Error loading CV: ${error.message}`, 'error');
    }
  };

  const handleDownloadCV = async (cv) => {
    if (ipcRenderer && cv.path && !cv.isDataURL) {
      // Use Electron's save dialog
      try {
        const result = await ipcRenderer.invoke('save-cv-copy', {
          sourcePath: cv.path,
          displayName: cv.displayName
        });
        if (result.success) {
          showToast('CV downloaded successfully', 'success');
        } else {
          showToast(`Download failed: ${result.error}`, 'error');
        }
      } catch (error) {
        showToast('Error downloading file', 'error');
      }
    } else {
      // Browser mode: Download data URL
      const link = document.createElement('a');
      link.href = cv.path;
      link.download = `${cv.displayName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center space-x-2">
          <User className="w-7 h-7 text-blue-600" />
          <span>About the Developer</span>
        </h1>
        {isAdminEditor && !isRestricted && !isEditing && (
          <button
            onClick={isOnline ? () => setIsEditing(true) : undefined}
            disabled={!isOnline}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              isOnline
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed opacity-50'
            }`}
            title={isOnline ? 'Edit profile information' : '⚠️ App is offline - Connect to internet to edit'}
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Restricted Access Warning */}
      {isRestricted && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <X className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300">Read-Only Access</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">You can view the profile but cannot edit it.</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-8">
          {/* Profile Picture and Basic Info */}
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                {profileData.profilePicture ? (
                  <img
                    src={profileData.profilePicture}
                    alt={profileData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profileData.name.charAt(0)
                )}
              </div>
              {isAdminEditor && !isRestricted && isEditing && (
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* Name and Title */}
            <div className="flex-1 text-center md:text-left">
              {isEditing && isEditor ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    className="text-3xl font-bold bg-transparent border-b-2 border-blue-600 focus:outline-none text-gray-900 dark:text-white w-full"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={profileData.title}
                    onChange={(e) => setProfileData(prev => ({ ...prev, title: e.target.value }))}
                    className="text-xl bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none text-gray-600 dark:text-gray-300 w-full"
                    placeholder="Title"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {profileData.name}
                  </h2>
                  <p className="text-xl text-gray-600 dark:text-gray-300">
                    {profileData.title}
                  </p>
                </>
              )}

              {/* Contact Links */}
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start space-y-2 sm:space-y-0 sm:space-x-4 mt-4">
                <a
                  href={profileData.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                  <span>LinkedIn Profile</span>
                </a>
                {isEditing && isEditor ? (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="px-2 py-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none text-gray-600 dark:text-gray-300"
                      placeholder="Email address"
                    />
                  </div>
                ) : (
                  profileData.email && (
                    <a
                      href={`mailto:${profileData.email}`}
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      <span>{profileData.email}</span>
                    </a>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              About
            </h3>
            {isEditing && isEditor ? (
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                placeholder="Write a bio..."
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {profileData.bio}
              </p>
            )}
          </div>

          {/* CV Files */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              CV
            </h3>
            
            {/* Existing CV Files */}
            {profileData.cvFiles && profileData.cvFiles.length > 0 ? (
              <div className="space-y-3 mb-4">
                {profileData.cvFiles.map((cv, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="w-6 h-6 text-red-600 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{cv.displayName}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">PDF</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewCV(cv)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                        title="View CV"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      <button
                        onClick={() => handleDownloadCV(cv)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                        title="Download CV"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                      {isAdminEditor && !isRestricted && isEditing && (
                        <button
                          onClick={() => handleRemoveCV(index)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          title="Remove CV"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-center mb-4">
                <p className="text-gray-500 dark:text-gray-400">No CV files uploaded yet</p>
              </div>
            )}

            {/* Upload New CV - Editor Only */}
            {isEditor && !isRestricted && isEditing && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Upload New CV</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={newCVName}
                      onChange={(e) => setNewCVName(e.target.value)}
                      placeholder="e.g., Resume 2024, Portfolio, etc."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PDF File
                    </label>
                    <label className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-5 h-5" />
                      <span>{uploading ? 'Uploading...' : 'Select PDF File'}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleCVUpload}
                        className="hidden"
                        disabled={uploading || !newCVName.trim()}
                      />
                    </label>
                    {!newCVName.trim() && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Please enter a display name first</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Edit Actions */}
          {isEditor && !isRestricted && isEditing && (
            <div className="mt-8 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  loadProfileData(); // Reset to saved data
                }}
                className="px-6 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={uploading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{uploading ? 'Uploading...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* System Information */}
      {isEditing && isEditor && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">App Name</label>
              <input
                type="text"
                value={appSettings.app_name}
                onChange={(e) => setAppSettings(prev => ({ ...prev, app_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="App Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">App Version <span className="text-xs text-gray-500">(Auto-synced from package.json)</span></label>
              <input
                type="text"
                value={packageJson.version}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                placeholder="Version"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
              <input
                type="text"
                value={appSettings.company_name}
                onChange={(e) => setAppSettings(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Support Email</label>
              <input
                type="email"
                value={appSettings.support_email || ''}
                onChange={(e) => setAppSettings(prev => ({ ...prev, support_email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="support@example.com"
              />
            </div>
          </div>
        </div>
      )}

      {/* Project Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        {isEditing && isEditor ? (
          <>
            <input
              type="text"
              value={appSettings.about_title}
              onChange={(e) => setAppSettings(prev => ({ ...prev, about_title: e.target.value }))}
              className="text-lg font-semibold bg-transparent border-b-2 border-blue-600 focus:outline-none text-gray-900 dark:text-white mb-4 w-full"
              placeholder="About Title"
            />
            <textarea
              value={appSettings.about_text}
              onChange={(e) => setAppSettings(prev => ({ ...prev, about_text: e.target.value }))}
              className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:outline-none text-gray-600 dark:text-gray-300 leading-relaxed mb-4 min-h-[100px]"
              placeholder="About Text"
            />
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {appSettings.about_title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">
              {appSettings.about_text}
            </p>
          </>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{packageJson.version}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Version (Auto-synced)</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">React</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Framework</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">Electron</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Platform</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">SQLite</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Database</p>
          </div>
        </div>
        
        {/* Manual Update Check Button (for testing) */}
        {ipcRenderer && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <button
              onClick={() => {
                setCheckingUpdate(true);
                console.log('🔍 Manual update check triggered');
                showToast('Checking for updates...', 'info');
                // Clear localStorage snooze if exists
                localStorage.removeItem('update_snooze_until');
                // Force update check via IPC
                ipcRenderer.send('check-for-updates');
                setTimeout(() => setCheckingUpdate(false), 3000);
              }}
              disabled={checkingUpdate}
              className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                checkingUpdate
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>{checkingUpdate ? 'Checking...' : 'Check for Updates'}</span>
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Current version: {packageJson.version} • Open DevTools (F12) to see logs
            </p>
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {showPDFViewer && viewingCV && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>CV: {viewingCV.name}</span>
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const cv = profileData.cvFiles.find(c => c.displayName === viewingCV.name);
                    if (cv) handleDownloadCV(cv);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => {
                    setShowPDFViewer(false);
                    if (viewingCV.url && !viewingCV.url.startsWith('data:') && !viewingCV.url.startsWith('http')) {
                      URL.revokeObjectURL(viewingCV.url);
                    }
                    setViewingCV(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
            
            {/* PDF Content */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={viewingCV.url}
                className="w-full h-full"
                title="CV Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AboutMe;
