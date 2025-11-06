import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Eye, EyeOff } from 'lucide-react';

function Login() {
  const { login, config } = useApp();
  const [showEditor, setShowEditor] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleVisitorLogin = () => {
    login('Visitor');
  };

  const handleEditorLogin = (e) => {
    e.preventDefault();
    const adminCode = config?.ADMIN_ACCESS_CODE || '010203';
    const restrictedCode = config?.RESTRICTED_ACCESS_CODE || 'sgtm123';
    
    if (accessCode === adminCode) {
      login('AdminEditor');
    } else if (accessCode === restrictedCode) {
      login('RestrictedEditor');
    } else {
      setError('Incorrect access code');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-900 rounded-full mb-4 shadow-lg p-3">
            <img 
              src="./company-logo.png"
              alt="SGTM Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <Lock className="w-10 h-10 text-white" style={{ display: 'none' }} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">LOTO KMS</h1>
          <p className="text-blue-200">Key Management & Control</p>
          <p className="text-sm text-blue-300 mt-1">SGTM</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {!showEditor ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Select Access Mode</h2>
              
              <button
                onClick={() => setShowEditor(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md"
              >
                <Lock className="w-5 h-5" />
                <span>Admin/Editor Mode</span>
              </button>

              <button
                onClick={handleVisitorLogin}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md"
              >
                <Eye className="w-5 h-5" />
                <span>Visitor Mode (Read-Only)</span>
              </button>

              <p className="text-sm text-gray-500 text-center mt-4">
                Visitor mode allows viewing and exporting data only
              </p>
            </div>
          ) : (
            <form onSubmit={handleEditorLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setShowEditor(false);
                  setAccessCode('');
                  setError('');
                }}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1 mb-4"
              >
                <span>← Back to mode selection</span>
              </button>

              <h2 className="text-2xl font-bold text-gray-800 mb-6">Editor Access Code</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Code
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                    placeholder="Enter access code"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
              >
                Login as Editor
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <a
            href="https://www.linkedin.com/in/hatim-raghib-5b85362a5/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-200 text-sm hover:text-white hover:underline transition-all cursor-pointer inline-flex items-center space-x-1"
          >
            <span>Made by Hatim RG</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;
