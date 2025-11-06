import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle, Bug, Zap, Shield, AlertTriangle, Trash2, FileText } from 'lucide-react';
import packageJson from '../../package.json';

const STORAGE_KEY = 'last_seen_version';

function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [changelogContent, setChangelogContent] = useState('');

  useEffect(() => {
    checkForNewVersion();
  }, []);

  const checkForNewVersion = () => {
    const currentVersion = packageJson.version;
    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);

    console.log('📦 Current version:', currentVersion);
    console.log('👁️ Last seen version:', lastSeenVersion);

    // Show changelog if:
    // 1. First time ever (no last seen version)
    // 2. Version changed since last seen
    if (!lastSeenVersion || lastSeenVersion !== currentVersion) {
      console.log('🆕 New version detected, showing changelog');
      loadChangelog();
      setIsOpen(true);
    } else {
      console.log('✅ Same version, no changelog needed');
    }
  };

  const loadChangelog = async () => {
    try {
      // Try to load CHANGELOG.md
      const response = await fetch('/CHANGELOG.md');
      if (response.ok) {
        const text = await response.text();
        setChangelogContent(text);
      } else {
        // Fallback content if file not found
        setChangelogContent(getDefaultChangelog());
      }
    } catch (error) {
      console.error('Error loading changelog:', error);
      setChangelogContent(getDefaultChangelog());
    }
  };

  const getDefaultChangelog = () => {
    return `# What's New in Version ${packageJson.version}

## 🎉 New Features
- Auto-update system with GitHub integration
- Custom delete confirmation dialogs
- Changelog viewer (you're looking at it!)
- Version auto-sync across the app

## 🐛 Bug Fixes
- Fixed input field selection issues
- Fixed deletion bugs in personnel, plans, and breakers
- Improved async/await flow for deletions

## ⚡ Improvements
- Better update notifications
- Enhanced user experience
- Simplified version management

Thank you for using LOTO Key Management System!`;
  };

  const handleClose = () => {
    // Save current version as seen
    localStorage.setItem(STORAGE_KEY, packageJson.version);
    setIsOpen(false);
  };

  const parseChangelog = (content) => {
    if (!content) return null;

    // Split by version headers
    const sections = content.split(/^## \[/m).filter(Boolean);
    
    // Get the first version (most recent)
    if (sections.length === 0) return renderMarkdown(content);
    
    const latestVersion = sections[0];
    return renderMarkdown('## [' + latestVersion);
  };

  const renderMarkdown = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let inCodeBlock = false;

    const getIcon = (line) => {
      if (line.includes('🎉') || line.includes('Added')) return <Sparkles className="w-4 h-4 text-yellow-500" />;
      if (line.includes('🐛') || line.includes('Fixed')) return <Bug className="w-4 h-4 text-red-500" />;
      if (line.includes('⚡') || line.includes('Improved')) return <Zap className="w-4 h-4 text-blue-500" />;
      if (line.includes('🔒') || line.includes('Security')) return <Shield className="w-4 h-4 text-green-500" />;
      if (line.includes('⚠️') || line.includes('Deprecated')) return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      if (line.includes('❌') || line.includes('Removed')) return <Trash2 className="w-4 h-4 text-red-600" />;
      if (line.includes('📝') || line.includes('Changed')) return <FileText className="w-4 h-4 text-purple-500" />;
      return <CheckCircle className="w-4 h-4 text-gray-500" />;
    };

    lines.forEach((line, index) => {
      // Skip empty lines in lists
      if (!line.trim() && currentList.length > 0) {
        return;
      }

      // Flush current list if we hit non-list content
      if (!line.startsWith('-') && !line.startsWith('  -') && currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="space-y-2 mb-4">
            {currentList}
          </ul>
        );
        currentList = [];
      }

      // Headers
      if (line.startsWith('## ')) {
        const headerText = line.replace('## ', '');
        elements.push(
          <h2 key={index} className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3 flex items-center space-x-2">
            <span>{headerText}</span>
          </h2>
        );
      } else if (line.startsWith('### ')) {
        const headerText = line.replace('### ', '');
        const icon = getIcon(headerText);
        elements.push(
          <h3 key={index} className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2 flex items-center space-x-2">
            {icon}
            <span>{headerText}</span>
          </h3>
        );
      }
      // List items
      else if (line.startsWith('- ') || line.startsWith('  - ')) {
        const indent = line.startsWith('  - ') ? 'ml-4' : '';
        const text = line.replace(/^[\s-]*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        currentList.push(
          <li key={index} className={`flex items-start space-x-2 ${indent}`}>
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span 
              className="text-sm text-gray-700 dark:text-gray-300"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          </li>
        );
      }
      // Regular paragraphs
      else if (line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
        elements.push(
          <p key={index} className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {line}
          </p>
        );
      }
    });

    // Flush any remaining list
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-final`} className="space-y-2 mb-4">
          {currentList}
        </ul>
      );
    }

    return elements;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">What's New</h2>
              <p className="text-blue-100 text-sm">Version {packageJson.version}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {changelogContent ? parseChangelog(changelogContent) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Loading changelog...</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Thank you for keeping LOTO KMS up to date!
            </p>
            <button
              onClick={handleClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChangelogModal;
